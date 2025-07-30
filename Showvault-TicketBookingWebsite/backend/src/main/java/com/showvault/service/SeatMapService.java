package com.showvault.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.showvault.dto.SeatMapDTO;
import com.showvault.dto.SeatMapDTO.SeatDTO;
import com.showvault.dto.SeatMapDTO.SeatRowDTO;
import com.showvault.model.Seat;
import com.showvault.model.ShowSchedule;
import com.showvault.service.SeatConsistencyService;
import com.showvault.service.VenueService;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.Date;

@Service
public class SeatMapService {

    @Autowired
    private SeatService seatService;
    
    @Autowired
    private ShowScheduleService showScheduleService;
    
    @Autowired
    private SeatReservationService seatReservationService;
    
    @Autowired
    private VenueService venueService;
    
    @Autowired
    private SeatConsistencyService seatConsistencyService;
    
    // In-memory cache for seat maps with expiration
    private static class CacheEntry {
        final SeatMapDTO seatMap;
        final long expirationTime;
        
        CacheEntry(SeatMapDTO seatMap, long expirationTimeMillis) {
            this.seatMap = seatMap;
            this.expirationTime = System.currentTimeMillis() + expirationTimeMillis;
        }
        
        boolean isExpired() {
            return System.currentTimeMillis() > expirationTime;
        }
    }
    
    // Cache key format: "showId:scheduleId"
    private final ConcurrentHashMap<String, CacheEntry> seatMapCache = new ConcurrentHashMap<>();
    
    // Cache expiration time (5 minutes)
    private static final long CACHE_EXPIRATION_MS = TimeUnit.MINUTES.toMillis(5);
    
    /**
     * Generates a seat map for a specific show schedule
     * Uses caching to improve performance for large venues
     * 
     * @param showId The ID of the show
     * @param scheduleId The ID of the show schedule
     * @return A SeatMapDTO containing the seat map
     */
    public SeatMapDTO generateSeatMap(Long showId, Long scheduleId) {
        // Create cache key
        String cacheKey = showId + ":" + scheduleId;
        
        // Check if we have a valid cached version
        CacheEntry cachedEntry = seatMapCache.get(cacheKey);
        if (cachedEntry != null && !cachedEntry.isExpired()) {
            System.out.println("Using cached seat map for show " + showId + ", schedule " + scheduleId);
            return cachedEntry.seatMap;
        }
        
        System.out.println("Generating new seat map for show " + showId + ", schedule " + scheduleId);
        
        try {
            // Get the show schedule
            ShowSchedule schedule = showScheduleService.getShowScheduleById(scheduleId)
                    .orElseThrow(() -> new RuntimeException("Show schedule not found"));
            
            // Get the venue ID
            Long venueId = schedule.getVenue().getId();
            
            // Get all seats for the venue using pagination if needed
            List<Seat> allSeats = seatService.getSeatsByVenueId(venueId);
            
            // Log the number of seats found for debugging
            System.out.println("Total seats found for venue " + venueId + ": " + allSeats.size());
            
            // Verify that we have the correct number of seats
            Long totalSeatCount = seatService.countSeatsByVenueId(venueId);
            System.out.println("Total seat count from database for venue " + venueId + ": " + totalSeatCount);
            
            // If there are no seats for this venue, return an empty seat map with error information
            if (allSeats.isEmpty() || totalSeatCount == 0) {
                System.out.println("No seats found for venue " + venueId + ". Returning empty seat map with error information.");
                SeatMapDTO errorSeatMap = SeatMapDTO.createErrorSeatMap(
                    "No seats found for venue " + venueId + ". Please configure seats for this venue.", 
                    showId, 
                    scheduleId);
                
                // Add venue information to the error seat map
                errorSeatMap.getMetadata().put("venueId", venueId);
                errorSeatMap.getMetadata().put("venueName", schedule.getVenue().getName());
                errorSeatMap.getMetadata().put("venueCapacity", schedule.getVenue().getCapacity());
                
                return errorSeatMap;
            }
            
            // If there's a discrepancy, log a warning
            if (allSeats.size() != totalSeatCount) {
                System.out.println("WARNING: Discrepancy in seat count. Database reports " + totalSeatCount + 
                                  " seats but only " + allSeats.size() + " were retrieved.");
                
                // Force a refresh of the seat list to ensure we have all seats
                allSeats = seatService.getSeatsByVenueId(venueId);
                System.out.println("After refresh: Total seats found for venue " + venueId + ": " + allSeats.size());
            }
            
            // Get available seats for the show schedule
            List<Seat> availableSeats = seatService.getAvailableSeatsByVenueAndShowSchedule(venueId, scheduleId);
            
            // Log the number of available seats found for debugging
            System.out.println("Available seats found for venue " + venueId + " and schedule " + scheduleId + ": " + availableSeats.size());
            
            // Create a set of available seat IDs for quick lookup
            final List<Long> availableSeatIds = availableSeats.stream()
                    .map(Seat::getId)
                    .collect(Collectors.toList());
            
            // Calculate which seats should be marked as reserved due to capacity limitations
            Set<Long> capacityReservedSeatIds = calculateCapacityReservedSeats(allSeats, schedule.getTotalSeats());
            
            // Group seats by row
            Map<String, List<Seat>> seatsByRow = allSeats.stream()
                    .collect(Collectors.groupingBy(Seat::getRowName));
            
            // Create the seat map
            SeatMapDTO seatMap = new SeatMapDTO("SCREEN");
            
            // Sort rows alphabetically with custom comparator to handle both single letter (A, B, C) 
            // and multi-letter row names (AA, AB, etc.)
            List<String> sortedRows = seatsByRow.keySet().stream()
                    .sorted(Comparator.comparingInt(this::getRowSortValue))
                    .collect(Collectors.toList());
            
            // Track metadata for the seat map
            int totalSeats = 0;
            int maxSeatsPerRow = 0;
            Map<String, Integer> rowLengths = new HashMap<>();
            
            // Create rows
            for (String rowName : sortedRows) {
                SeatRowDTO rowDTO = new SeatRowDTO();
                rowDTO.setRowLabel(rowName);
                
                // Sort seats by seat number
                List<Seat> rowSeats = seatsByRow.get(rowName).stream()
                        .sorted(Comparator.comparing(Seat::getSeatNumber))
                        .collect(Collectors.toList());
                
                // Update metadata
                int rowLength = rowSeats.size();
                totalSeats += rowLength;
                maxSeatsPerRow = Math.max(maxSeatsPerRow, rowLength);
                rowLengths.put(rowName, rowLength);
                
                // Create seats
                for (Seat seat : rowSeats) {
                    SeatDTO seatDTO = new SeatDTO();
                    seatDTO.setId(seat.getId());
                    seatDTO.setSeatNumber(seat.getSeatNumber());
                    
                    // Determine seat status
                    boolean isAvailable = availableSeatIds.contains(seat.getId());
                    boolean isTemporarilyReserved = seatReservationService.isSeatReserved(seat.getId(), scheduleId);
                    boolean isCapacityReserved = capacityReservedSeatIds.contains(seat.getId());
                    
                    if (isCapacityReserved) {
                        // Mark as reserved due to capacity limitation
                        seatDTO.setStatus("RESERVED");
                        // Note: This seat cannot be selected by users due to show capacity limits
                    } else if (isAvailable) {
                        seatDTO.setStatus("AVAILABLE");
                    } else if (isTemporarilyReserved) {
                        // Temporarily reserved by another user
                        seatDTO.setStatus("RESERVED");
                    } else {
                        // If not available and not reserved, it means it's sold/booked
                        seatDTO.setStatus("SOLD");
                    }
                    
                    // Set seat category
                    seatDTO.setCategory(seat.getCategory().name());
                    
                    // Calculate seat price
                    BigDecimal basePrice = schedule.getBasePrice();
                    BigDecimal priceMultiplier = seat.getPriceMultiplier();
                    BigDecimal seatPrice = basePrice.multiply(priceMultiplier);
                    seatDTO.setPrice(seatPrice);
                    
                    rowDTO.getSeats().add(seatDTO);
                }
                
                seatMap.getRows().add(rowDTO);
            }
        
            // Set metadata in the seat map
            seatMap.getMetadata().put("totalSeats", totalSeats);
            seatMap.getMetadata().put("totalRows", sortedRows.size());
            seatMap.getMetadata().put("maxSeatsPerRow", maxSeatsPerRow);
            seatMap.getMetadata().put("rowLengths", rowLengths);
            
            // Add venue and schedule information to metadata
            seatMap.getMetadata().put("venueCapacity", schedule.getVenue().getCapacity());
            seatMap.getMetadata().put("scheduleAvailableSeats", schedule.getSeatsAvailable());
            seatMap.getMetadata().put("scheduleTotalSeats", schedule.getTotalSeats());
            
            // Add capacity reservation information
            seatMap.getMetadata().put("capacityReservedSeats", capacityReservedSeatIds.size());
            seatMap.getMetadata().put("hasCapacityLimitation", !capacityReservedSeatIds.isEmpty());
            if (!capacityReservedSeatIds.isEmpty()) {
                seatMap.getMetadata().put("capacityReservationReason", 
                    "Show capacity (" + schedule.getTotalSeats() + ") is less than venue capacity (" + 
                    schedule.getVenue().getCapacity() + "). " + capacityReservedSeatIds.size() + 
                    " seats reserved using 80% standard, 10% VIP, 10% premium distribution.");
            }
            
            // Add theater layout information to enhance the UI
            seatMap.getMetadata().put("theaterLayout", getTheaterLayoutType(venueId));
            seatMap.getMetadata().put("screenWidth", getScreenWidthPercentage(venueId, maxSeatsPerRow));
            seatMap.getMetadata().put("rowSpacing", getRowSpacing(venueId));
            
            // Add seat category information for better visualization
            Map<String, Object> categoryInfo = new HashMap<>();
            for (Seat.SeatCategory category : Seat.SeatCategory.values()) {
                Map<String, Object> info = new HashMap<>();
                info.put("color", getCategoryColor(category));
                info.put("priceMultiplier", getCategoryPriceMultiplier(category));
                info.put("displayName", getCategoryDisplayName(category));
                categoryInfo.put(category.name(), info);
            }
            seatMap.getMetadata().put("categoryInfo", categoryInfo);
            
            // Synchronize seat counts to ensure consistency
            seatConsistencyService.synchronizeSeatsForSchedule(schedule.getId());
            
            // Log the seat map metadata for debugging
            System.out.println("Generated seat map with " + totalSeats + " total seats across " + 
                               sortedRows.size() + " rows. Max seats per row: " + maxSeatsPerRow);
            System.out.println("Row lengths: " + rowLengths);
            
            // Cache the result for future requests
            seatMapCache.put(cacheKey, new CacheEntry(seatMap, CACHE_EXPIRATION_MS));
            System.out.println("Cached seat map for show " + showId + ", schedule " + scheduleId + 
                              " (expires in " + TimeUnit.MILLISECONDS.toMinutes(CACHE_EXPIRATION_MS) + " minutes)");
            
            return seatMap;
        } finally {
            // Clean up any resources if needed
            // This block is required to complete the try statement
        }
    }
    
    /**
     * Helper method to get a numeric value for sorting row names
     * Handles both single letter (A, B, C) and multi-letter row names (AA, AB, etc.)
     */
    private int getRowSortValue(String rowName) {
        int value = 0;
        for (int i = 0; i < rowName.length(); i++) {
            value = value * 26 + (rowName.charAt(i) - 'A' + 1);
        }
        return value;
    }
    
    /**
     * Calculate which seats should be marked as reserved due to capacity limitations
     * Implements 80% standard, 10% VIP, 10% premium distribution
     */
    private Set<Long> calculateCapacityReservedSeats(List<Seat> allSeats, int scheduleTotalSeats) {
        Set<Long> reservedSeatIds = new HashSet<>();
        
        if (scheduleTotalSeats >= allSeats.size()) {
            return reservedSeatIds; // No seats to reserve if schedule uses full capacity
        }
        
        int seatsToReserve = allSeats.size() - scheduleTotalSeats;
        System.out.println("Need to reserve " + seatsToReserve + " seats out of " + allSeats.size() + 
                          " total seats (schedule allows " + scheduleTotalSeats + " seats)");
        
        // Group seats by category
        Map<Seat.SeatCategory, List<Seat>> seatsByCategory = allSeats.stream()
            .collect(Collectors.groupingBy(Seat::getCategory));
        
        // Calculate how many seats to reserve from each category (80% standard, 10% VIP, 10% premium)
        int standardToReserve = (int) Math.ceil(seatsToReserve * 0.8);
        int vipToReserve = (int) Math.ceil(seatsToReserve * 0.1);
        int premiumToReserve = seatsToReserve - standardToReserve - vipToReserve;
        
        System.out.println("Capacity reservation distribution: " + 
                          standardToReserve + " standard, " + 
                          vipToReserve + " VIP, " + 
                          premiumToReserve + " premium");
        
        // Reserve seats from each category (starting from back rows)
        reserveSeatsFromCategory(seatsByCategory.get(Seat.SeatCategory.STANDARD), 
                               standardToReserve, reservedSeatIds, "STANDARD");
        reserveSeatsFromCategory(seatsByCategory.get(Seat.SeatCategory.VIP), 
                               vipToReserve, reservedSeatIds, "VIP");
        reserveSeatsFromCategory(seatsByCategory.get(Seat.SeatCategory.PREMIUM), 
                               premiumToReserve, reservedSeatIds, "PREMIUM");
        
        System.out.println("Total seats marked as capacity-reserved: " + reservedSeatIds.size());
        return reservedSeatIds;
    }
    
    /**
     * Reserve seats from a specific category, starting from back rows
     */
    private void reserveSeatsFromCategory(List<Seat> categorySeats, int countToReserve, 
                                        Set<Long> reservedSeatIds, String categoryName) {
        if (categorySeats == null || categorySeats.isEmpty()) {
            System.out.println("No " + categoryName + " seats available to reserve");
            return;
        }
        
        if (countToReserve <= 0) {
            System.out.println("No " + categoryName + " seats need to be reserved");
            return;
        }
        
        // Sort seats by row (back to front) and seat number (right to left for better distribution)
        List<Seat> sortedSeats = categorySeats.stream()
            .sorted((a, b) -> {
                // First sort by row name in reverse order (Z to A) to get back rows first
                int rowCompare = b.getRowName().compareTo(a.getRowName());
                if (rowCompare != 0) return rowCompare;
                // Then sort by seat number in reverse order to get right seats first
                return Integer.compare(b.getSeatNumber(), a.getSeatNumber());
            })
            .collect(Collectors.toList());
        
        // Reserve the specified number of seats
        int actualReserved = 0;
        for (int i = 0; i < Math.min(countToReserve, sortedSeats.size()); i++) {
            reservedSeatIds.add(sortedSeats.get(i).getId());
            actualReserved++;
        }
        
        System.out.println("Reserved " + actualReserved + " " + categoryName + " seats out of " + 
                          countToReserve + " requested (" + categorySeats.size() + " available)");
    }
    
    /**
     * Clear the seat map cache for a specific show and schedule
     * This should be called when show capacity or venue configuration changes
     */
    public void clearSeatMapCache(Long showId, Long scheduleId) {
        String cacheKey = showId + ":" + scheduleId;
        seatMapCache.remove(cacheKey);
        System.out.println("Cleared seat map cache for show " + showId + ", schedule " + scheduleId);
    }
    
    /**
     * Clear all seat map cache entries
     * This can be used for maintenance or when global changes are made
     */
    public void clearAllSeatMapCache() {
        int cacheSize = seatMapCache.size();
        seatMapCache.clear();
        System.out.println("Cleared all seat map cache entries (" + cacheSize + " entries removed)");
    }
    
    /**
     * Get the theater layout type based on venue ID
     * This could be enhanced to read from a database configuration
     */
    private String getTheaterLayoutType(Long venueId) {
        // For now, use a simple mapping based on venue ID
        // In a real implementation, this would come from venue configuration
        if (venueId % 3 == 0) {
            return "CURVED"; // Curved theater layout
        } else if (venueId % 3 == 1) {
            return "STRAIGHT"; // Straight theater layout
        } else {
            return "ANGLED"; // Angled theater layout
        }
    }
    
    /**
     * Get the screen width percentage based on venue and max seats per row
     */
    private int getScreenWidthPercentage(Long venueId, int maxSeatsPerRow) {
        // Calculate a reasonable screen width based on the maximum seats per row
        // Ensure it's between 60% and 90%
        int baseWidth = 60;
        int additionalWidth = Math.min(30, maxSeatsPerRow / 2);
        return baseWidth + additionalWidth;
    }
    
    /**
     * Get the row spacing value based on venue
     */
    private int getRowSpacing(Long venueId) {
        // For now, use a simple mapping based on venue ID
        // In a real implementation, this would come from venue configuration
        if (venueId % 3 == 0) {
            return 12; // More spacious
        } else if (venueId % 3 == 1) {
            return 10; // Standard spacing
        } else {
            return 8; // Compact spacing
        }
    }
    
    /**
     * Get the color for a seat category
     */
    private String getCategoryColor(Seat.SeatCategory category) {
        switch (category) {
            case PREMIUM:
                return "#FF5722"; // Orange
            case VIP:
                return "#F44336"; // Red
            case STANDARD:
            default:
                return "#2196F3"; // Blue
        }
    }
    
    /**
     * Get the price multiplier for a seat category
     */
    private BigDecimal getCategoryPriceMultiplier(Seat.SeatCategory category) {
        switch (category) {
            case PREMIUM:
                return new BigDecimal("1.5");
            case VIP:
                return new BigDecimal("2.0");
            case STANDARD:
            default:
                return BigDecimal.ONE;
        }
    }
    
    /**
     * Get the display name for a seat category
     */
    private String getCategoryDisplayName(Seat.SeatCategory category) {
        switch (category) {
            case PREMIUM:
                return "Premium";
            case VIP:
                return "VIP";
            case STANDARD:
            default:
                return "Standard";
        }
    }
    
    /**
     * Invalidates the seat map cache for a specific show schedule
     * Should be called whenever seats are booked, reserved, or released
     * 
     * @param showId The ID of the show
     * @param scheduleId The ID of the show schedule
     */
    public void invalidateSeatMapCache(Long showId, Long scheduleId) {
        String cacheKey = showId + ":" + scheduleId;
        seatMapCache.remove(cacheKey);
        System.out.println("Invalidated seat map cache for show " + showId + ", schedule " + scheduleId);
    }
    
    /**
     * Clears all cached seat maps
     * Useful when making system-wide changes that affect seating
     */
    public void clearAllSeatMapCaches() {
        int cacheSize = seatMapCache.size();
        seatMapCache.clear();
        System.out.println("Cleared all " + cacheSize + " seat map caches");
    }
    
    /**
     * Generates a sample seat map for testing
     * 
     * @return A sample SeatMapDTO
     */
    public SeatMapDTO generateSampleSeatMap() {
        SeatMapDTO seatMap = new SeatMapDTO("SCREEN");
        
        // Create a more realistic theater layout with varying row lengths
        // Front rows (closer to screen) are shorter, back rows are longer
        String[] rowLabels = {"A", "B", "C", "D", "E", "F", "G", "H", "I", "J"};
        long seatId = 1;
        int totalSeats = 0;
        int maxSeatsPerRow = 0;
        Map<String, Integer> rowLengths = new HashMap<>();
        
        for (int rowIndex = 0; rowIndex < rowLabels.length; rowIndex++) {
            String rowLabel = rowLabels[rowIndex];
            SeatRowDTO rowDTO = new SeatRowDTO();
            rowDTO.setRowLabel(rowLabel);
            
            // Calculate seats for this row - create a curved theater layout
            // Front rows have fewer seats, back rows have more
            int seatsInRow;
            
            if (rowIndex < 3) {
                // Front rows (A-C) - fewer seats
                seatsInRow = 10 + rowIndex;
            } else if (rowIndex < 7) {
                // Middle rows (D-G) - medium number of seats
                seatsInRow = 14 + (rowIndex - 3);
            } else {
                // Back rows (H-J) - more seats
                seatsInRow = 18;
            }
            
            // Update metadata
            totalSeats += seatsInRow;
            maxSeatsPerRow = Math.max(maxSeatsPerRow, seatsInRow);
            rowLengths.put(rowLabel, seatsInRow);
            
            // Create seats for this row
            for (int seatNumber = 1; seatNumber <= seatsInRow; seatNumber++) {
                SeatDTO seatDTO = new SeatDTO();
                seatDTO.setId(seatId++);
                seatDTO.setSeatNumber(seatNumber);
                
                // Determine seat status - for sample data, make most seats available
                // with some random ones booked or reserved
                double random = Math.random();
                if (random < 0.8) {
                    seatDTO.setStatus("AVAILABLE");
                } else if (random < 0.9) {
                    seatDTO.setStatus("BOOKED");
                } else {
                    seatDTO.setStatus("RESERVED");
                }
                
                // Set seat category based on row
                String category;
                BigDecimal price;
                
                if (rowIndex < 2) {
                    // Front rows (A-B) - Standard
                    category = "STANDARD";
                    price = new BigDecimal("100.00");
                } else if (rowIndex < 5) {
                    // Middle-front rows (C-E) - Premium
                    category = "PREMIUM";
                    price = new BigDecimal("150.00");
                } else if (rowIndex < 8) {
                    // Middle-back rows (F-H) - Executive
                    category = "EXECUTIVE";
                    price = new BigDecimal("200.00");
                } else {
                    // Back rows (I-J) - VIP
                    category = "VIP";
                    price = new BigDecimal("250.00");
                }
                
                seatDTO.setCategory(category);
                seatDTO.setPrice(price);
                
                rowDTO.getSeats().add(seatDTO);
            }
            
            seatMap.getRows().add(rowDTO);
        }
        
        // Set metadata
        seatMap.getMetadata().put("totalSeats", totalSeats);
        seatMap.getMetadata().put("totalRows", rowLabels.length);
        seatMap.getMetadata().put("maxSeatsPerRow", maxSeatsPerRow);
        seatMap.getMetadata().put("rowLengths", rowLengths);
        seatMap.getMetadata().put("theaterLayout", "CURVED");
        seatMap.getMetadata().put("screenWidth", 80);
        seatMap.getMetadata().put("rowSpacing", 10);
        
        // Add category information
        Map<String, Object> categoryInfo = new HashMap<>();
        
        Map<String, Object> standardInfo = new HashMap<>();
        standardInfo.put("color", "#2196F3");
        standardInfo.put("priceMultiplier", 1.0);
        standardInfo.put("displayName", "Standard");
        categoryInfo.put("STANDARD", standardInfo);
        
        Map<String, Object> premiumInfo = new HashMap<>();
        premiumInfo.put("color", "#FF5722");
        premiumInfo.put("priceMultiplier", 1.5);
        premiumInfo.put("displayName", "Premium");
        categoryInfo.put("PREMIUM", premiumInfo);
        
        Map<String, Object> executiveInfo = new HashMap<>();
        executiveInfo.put("color", "#9C27B0");
        executiveInfo.put("priceMultiplier", 2.0);
        executiveInfo.put("displayName", "Executive");
        categoryInfo.put("EXECUTIVE", executiveInfo);
        
        Map<String, Object> vipInfo = new HashMap<>();
        vipInfo.put("color", "#F44336");
        vipInfo.put("priceMultiplier", 2.0);
        vipInfo.put("displayName", "VIP");
        categoryInfo.put("VIP", vipInfo);
        
        seatMap.getMetadata().put("categoryInfo", categoryInfo);
        
        return seatMap;
    }
}