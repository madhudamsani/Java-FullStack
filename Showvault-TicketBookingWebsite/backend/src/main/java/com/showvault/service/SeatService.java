package com.showvault.service;

import com.showvault.model.Seat;
import com.showvault.model.Venue;
import com.showvault.repository.SeatRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class SeatService {

    private final SeatRepository seatRepository;

    @Autowired
    public SeatService(SeatRepository seatRepository) {
        this.seatRepository = seatRepository;
    }

    public List<Seat> getAllSeats() {
        return seatRepository.findAll();
    }

    public Optional<Seat> getSeatById(Long id) {
        return seatRepository.findById(id);
    }

    public List<Seat> getSeatsByVenueId(Long venueId) {
        // Get the total count of seats for this venue
        Long totalSeats = countSeatsByVenueId(venueId);
        System.out.println("Total seats for venue " + venueId + ": " + totalSeats);
        
        // If there are no seats, return an empty list
        if (totalSeats == 0) {
            System.out.println("No seats found for venue " + venueId);
            return new ArrayList<>();
        }
        
        // Always use pagination for consistency, regardless of venue size
        System.out.println("Using pagination to retrieve all seats for venue " + venueId);
        List<Seat> allSeats = new ArrayList<>();
        
        // Use a smaller page size for better memory management
        int pageSize = 500;
        int totalPages = (int) Math.ceil(totalSeats.doubleValue() / pageSize);
        
        for (int page = 0; page < totalPages; page++) {
            org.springframework.data.domain.Pageable pageable = 
                org.springframework.data.domain.PageRequest.of(page, pageSize);
            List<Seat> pageSeats = seatRepository.findAllByVenueIdWithPagination(venueId, pageable);
            allSeats.addAll(pageSeats);
            System.out.println("Retrieved page " + (page + 1) + " of " + totalPages + 
                              " with " + pageSeats.size() + " seats. Total so far: " + allSeats.size());
            
            // Verify we're getting the expected number of seats per page
            if (page < totalPages - 1 && pageSeats.size() < pageSize) {
                System.out.println("WARNING: Retrieved fewer seats than expected on page " + (page + 1) + 
                                  ". Expected " + pageSize + " but got " + pageSeats.size());
            }
        }
        
        // Verify the total count matches what we expected
        if (allSeats.size() != totalSeats) {
            System.out.println("WARNING: Retrieved " + allSeats.size() + " seats, but expected " + 
                              totalSeats + " based on count query. Difference: " + (totalSeats - allSeats.size()));
            
            // If we have a significant discrepancy, try one more time with a direct query
            if (allSeats.size() < totalSeats * 0.9) { // If we have less than 90% of expected seats
                System.out.println("Significant seat count mismatch detected. Trying direct query...");
                List<Seat> directSeats = seatRepository.findByVenueId(venueId);
                
                if (directSeats.size() > allSeats.size()) {
                    System.out.println("Direct query returned more seats (" + directSeats.size() + 
                                      "). Using this result instead.");
                    return directSeats;
                }
            }
        }
        
        System.out.println("Retrieved all " + allSeats.size() + " seats for venue " + venueId + " using pagination");
        return allSeats;
    }

    public List<Seat> getSeatsByVenueIdAndCategory(Long venueId, Seat.SeatCategory category) {
        return seatRepository.findByVenueIdAndCategory(venueId, category);
    }

    public List<Seat> getSeatsByVenueIdAndRowName(Long venueId, String rowName) {
        return seatRepository.findByVenueIdAndRowName(venueId, rowName);
    }

    public List<String> getAllRowsByVenueId(Long venueId) {
        return seatRepository.findAllRowsByVenueId(venueId);
    }

    public List<Seat> getAvailableSeatsByVenueAndShowSchedule(Long venueId, Long showScheduleId) {
        // First, get the total count of seats for this venue
        Long totalSeats = countSeatsByVenueId(venueId);
        System.out.println("Total seats for venue " + venueId + ": " + totalSeats);
        
        // Get the venue capacity for comparison
        Integer venueCapacity = seatRepository.findVenueCapacity(venueId).orElse(0);
        System.out.println("Venue " + venueId + " has a capacity of " + venueCapacity + " seats");
        
        // Check for inconsistency between total seats and venue capacity
        if (totalSeats.intValue() != venueCapacity) {
            System.out.println("WARNING: Inconsistency detected between total seats (" + totalSeats + 
                              ") and venue capacity (" + venueCapacity + ")");
        }
        
        // Get available seats using the repository method
        List<Seat> availableSeats = seatRepository.findAvailableSeatsByVenueAndShowSchedule(venueId, showScheduleId);
        System.out.println("Found " + availableSeats.size() + " available seats out of " + 
                          totalSeats + " total seats for venue " + venueId);
        
        // Count booked seats for this schedule
        int bookedSeats = countBookedSeats(showScheduleId);
        System.out.println("Found " + bookedSeats + " booked seats for schedule " + showScheduleId);
        
        // Count reserved seats for this schedule
        int reservedSeats = countReservedSeats(showScheduleId);
        System.out.println("Found " + reservedSeats + " reserved seats for schedule " + showScheduleId);
        
        // Verify the numbers add up
        int expectedAvailable = totalSeats.intValue() - bookedSeats - reservedSeats;
        if (availableSeats.size() != expectedAvailable) {
            System.out.println("WARNING: Available seats count mismatch. Found " + availableSeats.size() + 
                              " but expected " + expectedAvailable + " (total " + totalSeats + 
                              " - booked " + bookedSeats + " - reserved " + reservedSeats + ")");
        }
        
        return availableSeats;
    }
    
    /**
     * Count the number of booked seats for a schedule
     */
    private int countBookedSeats(Long scheduleId) {
        try {
            return seatRepository.countBookedSeatsByScheduleId(scheduleId);
        } catch (Exception e) {
            System.err.println("Error counting booked seats: " + e.getMessage());
            return 0;
        }
    }
    
    /**
     * Count the number of reserved seats for a schedule
     */
    private int countReservedSeats(Long scheduleId) {
        try {
            return seatRepository.countReservedSeatsByScheduleId(scheduleId);
        } catch (Exception e) {
            System.err.println("Error counting reserved seats: " + e.getMessage());
            return 0;
        }
    }
    
    public Long countSeatsByVenueId(Long venueId) {
        return seatRepository.countSeatsByVenueId(venueId);
    }

    @Transactional
    public Seat createSeat(Seat seat) {
        return seatRepository.save(seat);
    }

    @Transactional
    public List<Seat> createSeatsForVenue(Venue venue, String rowName, int startSeatNumber, int endSeatNumber, 
                                         Seat.SeatCategory category, BigDecimal priceMultiplier) {
        List<Seat> seats = seatRepository.findByVenueIdAndRowName(venue.getId(), rowName);
        
        for (int seatNumber = startSeatNumber; seatNumber <= endSeatNumber; seatNumber++) {
            final int currentSeatNumber = seatNumber;
            boolean seatExists = seats.stream()
                    .anyMatch(s -> s.getSeatNumber() == currentSeatNumber);
            
            if (!seatExists) {
                Seat seat = new Seat();
                seat.setVenue(venue);
                seat.setRowName(rowName);
                seat.setSeatNumber(seatNumber);
                seat.setCategory(category);
                seat.setPriceMultiplier(priceMultiplier);
                seatRepository.save(seat);
                seats.add(seat);
            }
        }
        
        return seats;
    }

    @Transactional
    public Seat updateSeat(Seat seat) {
        return seatRepository.save(seat);
    }

    @Transactional
    public void deleteSeat(Long id) {
        seatRepository.deleteById(id);
    }

    public List<Seat> getSeatsByIds(List<Long> seatIds) {
        return seatRepository.findAllById(seatIds);
    }
}