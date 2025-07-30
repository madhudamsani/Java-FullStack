package com.showvault.service;

import com.showvault.model.Seat;
import com.showvault.model.ShowSchedule;
import com.showvault.model.Venue;
import com.showvault.repository.SeatRepository;
import com.showvault.repository.ShowScheduleRepository;
import com.showvault.repository.VenueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Service for managing seat-related operations across venues and show schedules.
 * This service ensures consistency between venue capacity, actual seats, and show schedules.
 */
@Service
public class SeatManagementService {
    
    @Autowired
    private SeatRepository seatRepository;
    
    @Autowired
    private VenueRepository venueRepository;
    
    @Autowired
    private ShowScheduleRepository showScheduleRepository;
    
    /**
     * Validates if a show schedule can use the specified number of seats for a venue.
     * 
     * @param venueId The venue ID
     * @param requestedSeats The number of seats requested for the show
     * @return ValidationResult containing success status and message
     */
    public SeatValidationResult validateSeatAllocation(Long venueId, int requestedSeats) {
        // Get venue
        Venue venue = venueRepository.findById(venueId)
            .orElseThrow(() -> new RuntimeException("Venue not found with ID: " + venueId));
        
        // Get actual seat count
        Long actualSeatCount = seatRepository.countSeatsByVenueId(venueId);
        
        if (actualSeatCount == 0) {
            return new SeatValidationResult(false, 
                "Venue '" + venue.getName() + "' has no seats configured. Please configure seats first.");
        }
        
        if (requestedSeats > actualSeatCount) {
            return new SeatValidationResult(false, 
                "Requested seats (" + requestedSeats + ") exceed venue capacity (" + actualSeatCount + ")");
        }
        
        return new SeatValidationResult(true, 
            "Seat allocation valid. Venue has " + actualSeatCount + " seats available.");
    }
    
    /**
     * Generates seats for a venue if it doesn't have any.
     * This method creates a standard seating layout.
     * 
     * @param venueId The venue ID
     * @return Number of seats generated
     */
    @Transactional
    public int generateSeatsForVenue(Long venueId) {
        Venue venue = venueRepository.findById(venueId)
            .orElseThrow(() -> new RuntimeException("Venue not found with ID: " + venueId));
        
        // Check if venue already has seats
        Long existingSeatCount = seatRepository.countSeatsByVenueId(venueId);
        if (existingSeatCount > 0) {
            throw new RuntimeException("Venue already has " + existingSeatCount + " seats configured");
        }
        
        int capacity = venue.getCapacity();
        if (capacity <= 0) {
            throw new RuntimeException("Venue capacity must be greater than 0");
        }
        
        // Calculate layout
        int seatsPerRow = Math.min(20, (int) Math.ceil(Math.sqrt(capacity))); // Max 20 seats per row
        int rowsNeeded = (int) Math.ceil((double) capacity / seatsPerRow);
        
        // Ensure we don't exceed 26 rows (A-Z)
        if (rowsNeeded > 26) {
            seatsPerRow = (int) Math.ceil((double) capacity / 26);
            rowsNeeded = 26;
        }
        
        int totalSeatsGenerated = 0;
        
        // Generate seats
        for (int rowIndex = 0; rowIndex < rowsNeeded && totalSeatsGenerated < capacity; rowIndex++) {
            String rowName = String.valueOf((char) ('A' + rowIndex));
            
            for (int seatNumber = 1; seatNumber <= seatsPerRow && totalSeatsGenerated < capacity; seatNumber++) {
                Seat seat = new Seat();
                seat.setVenue(venue);
                seat.setRowName(rowName);
                seat.setSeatNumber(seatNumber);
                
                // Determine seat category based on position
                if (rowIndex < 2) {
                    // First two rows are VIP
                    seat.setCategory(Seat.SeatCategory.VIP);
                    seat.setPriceMultiplier(new BigDecimal("2.00"));
                } else if (rowIndex < 5) {
                    // Next three rows are PREMIUM
                    seat.setCategory(Seat.SeatCategory.PREMIUM);
                    seat.setPriceMultiplier(new BigDecimal("1.50"));
                } else {
                    // Rest are STANDARD
                    seat.setCategory(Seat.SeatCategory.STANDARD);
                    seat.setPriceMultiplier(new BigDecimal("1.00"));
                }
                
                seatRepository.save(seat);
                totalSeatsGenerated++;
            }
        }
        
        System.out.println("Generated " + totalSeatsGenerated + " seats for venue: " + venue.getName());
        return totalSeatsGenerated;
    }
    
    /**
     * Ensures a venue has seats configured. If not, generates them.
     * 
     * @param venueId The venue ID
     * @return Number of seats available (existing or generated)
     */
    @Transactional
    public int ensureVenueHasSeats(Long venueId) {
        Long existingSeatCount = seatRepository.countSeatsByVenueId(venueId);
        
        if (existingSeatCount == 0) {
            return generateSeatsForVenue(venueId);
        }
        
        return existingSeatCount.intValue();
    }
    
    /**
     * Gets the maximum number of seats that can be allocated for a show at a venue.
     * 
     * @param venueId The venue ID
     * @return Maximum seats available
     */
    public int getMaximumSeatsForVenue(Long venueId) {
        Long seatCount = seatRepository.countSeatsByVenueId(venueId);
        return seatCount.intValue();
    }
    
    /**
     * Validates and adjusts a show schedule's seat allocation.
     * 
     * @param schedule The show schedule to validate
     * @return The adjusted schedule
     */
    @Transactional
    public ShowSchedule validateAndAdjustScheduleSeats(ShowSchedule schedule) {
        if (schedule.getVenue() == null) {
            throw new RuntimeException("Show schedule must have a venue");
        }
        
        Long venueId = schedule.getVenue().getId();
        
        // Ensure venue has seats
        int maxSeats = ensureVenueHasSeats(venueId);
        
        // Validate seat allocation
        SeatValidationResult validation = validateSeatAllocation(venueId, schedule.getTotalSeats());
        if (!validation.isValid()) {
            // Adjust to maximum available
            System.out.println("Adjusting schedule seats from " + schedule.getTotalSeats() + " to " + maxSeats);
            schedule.setTotalSeats(maxSeats);
        }
        
        // Ensure available seats is set correctly
        if (schedule.getSeatsAvailable() == null || schedule.getSeatsAvailable() > schedule.getTotalSeats()) {
            schedule.setSeatsAvailable(schedule.getTotalSeats());
        }
        
        return schedule;
    }
    
    /**
     * Result class for seat validation operations
     */
    public static class SeatValidationResult {
        private final boolean valid;
        private final String message;
        
        public SeatValidationResult(boolean valid, String message) {
            this.valid = valid;
            this.message = message;
        }
        
        public boolean isValid() {
            return valid;
        }
        
        public String getMessage() {
            return message;
        }
    }
}