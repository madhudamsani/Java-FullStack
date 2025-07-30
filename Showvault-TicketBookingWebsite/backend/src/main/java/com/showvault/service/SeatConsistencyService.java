package com.showvault.service;

import com.showvault.model.ShowSchedule;
import com.showvault.model.Venue;
import com.showvault.repository.SeatRepository;
import com.showvault.repository.ShowScheduleRepository;
import com.showvault.repository.VenueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service responsible for maintaining consistency between seat counts across the system.
 * Acts as a single source of truth for seat availability calculations.
 */
@Service
public class SeatConsistencyService {
    
    @Autowired
    private SeatRepository seatRepository;
    
    @Autowired
    private ShowScheduleRepository showScheduleRepository;
    
    @Autowired
    private VenueRepository venueRepository;
    
    /**
     * Synchronizes seat-related counts for a specific show schedule.
     * This method ensures that show_schedule.total_seats and seats_available 
     * are consistent with actual seat counts, while preserving venue capacity.
     * 
     * Key principles:
     * - Venue capacity is never changed by schedule operations
     * - Schedule total_seats can be <= venue capacity (for partial venue usage)
     * - Available seats = total_seats - booked_seats - reserved_seats
     *
     * @param scheduleId The ID of the show schedule to synchronize
     * @return The updated ShowSchedule object
     */
    @Transactional
    public ShowSchedule synchronizeSeatsForSchedule(Long scheduleId) {
        // Get the show schedule
        ShowSchedule schedule = showScheduleRepository.findById(scheduleId)
            .orElseThrow(() -> new RuntimeException("Schedule not found with ID: " + scheduleId));
        
        // Get the venue
        Venue venue = schedule.getVenue();
        
        // 1. Get the actual seat count from the seat table (venue's physical capacity)
        Long actualSeatCount = seatRepository.countSeatsByVenueId(venue.getId());
        
        // 2. Get the count of booked seats for this schedule
        int bookedSeats = seatRepository.countBookedSeatsByScheduleId(scheduleId);
        
        // 3. Get the count of temporarily reserved seats
        int reservedSeats = seatRepository.countReservedSeatsByScheduleId(scheduleId);
        
        // Log the current state
        System.out.println("Synchronizing seats for schedule ID: " + scheduleId);
        System.out.println("  - Venue physical capacity: " + actualSeatCount);
        System.out.println("  - Current venue capacity setting: " + venue.getCapacity());
        System.out.println("  - Current schedule total_seats: " + schedule.getTotalSeats());
        System.out.println("  - Booked seats: " + bookedSeats);
        System.out.println("  - Reserved seats: " + reservedSeats);
        
        boolean venueUpdated = false;
        boolean scheduleUpdated = false;
        
        // 4. Update venue capacity ONLY if it doesn't match physical seats AND no schedules exist yet
        // This prevents changing venue capacity when shows are already using it
        long existingScheduleCount = showScheduleRepository.countByVenueId(venue.getId());
        if (venue.getCapacity() != actualSeatCount.intValue() && existingScheduleCount <= 1) {
            System.out.println("  - Updating venue capacity from " + venue.getCapacity() + " to " + actualSeatCount + " (no existing schedules)");
            venue.setCapacity(actualSeatCount.intValue());
            venueRepository.save(venue);
            venueUpdated = true;
        } else if (venue.getCapacity() != actualSeatCount.intValue()) {
            System.out.println("  - WARNING: Venue capacity (" + venue.getCapacity() + ") doesn't match physical seats (" + actualSeatCount + ") but preserving due to existing schedules");
        }
        
        // 5. Validate schedule total_seats doesn't exceed venue's physical capacity
        if (schedule.getTotalSeats() > actualSeatCount.intValue()) {
            System.out.println("  - WARNING: Schedule total_seats (" + schedule.getTotalSeats() + ") exceeds venue physical capacity (" + actualSeatCount + "), adjusting to venue capacity");
            schedule.setTotalSeats(actualSeatCount.intValue());
            scheduleUpdated = true;
        }
        
        // 6. Calculate available seats based on schedule's total seats (not venue capacity)
        int availableSeats = schedule.getTotalSeats() - bookedSeats - reservedSeats;
        
        // 7. Update available seats if needed
        if (schedule.getSeatsAvailable() != availableSeats) {
            System.out.println("  - Updating seats_available from " + schedule.getSeatsAvailable() + " to " + availableSeats);
            schedule.setSeatsAvailable(availableSeats);
            scheduleUpdated = true;
        }
        
        // 8. Save the updated schedule if changes were made
        if (scheduleUpdated) {
            schedule = showScheduleRepository.save(schedule);
            System.out.println("  - Saved updated schedule");
        }
        
        // Log the results
        if (venueUpdated || scheduleUpdated) {
            System.out.println("Seat counts synchronized successfully for schedule ID: " + scheduleId);
        } else {
            System.out.println("Seat counts were already consistent for schedule ID: " + scheduleId);
        }
        
        return schedule;
    }
    
    /**
     * Synchronizes all seat-related counts for all show schedules of a venue.
     * This is useful when venue capacity changes or seats are added/removed.
     *
     * @param venueId The ID of the venue to synchronize
     */
    @Transactional
    public void synchronizeSeatsForVenue(Long venueId) {
        // Get all schedules for this venue
        Iterable<ShowSchedule> schedules = showScheduleRepository.findByVenueId(venueId);
        
        // Synchronize each schedule
        for (ShowSchedule schedule : schedules) {
            synchronizeSeatsForSchedule(schedule.getId());
        }
        
        System.out.println("Completed synchronization for all schedules of venue ID: " + venueId);
    }
    
    /**
     * Synchronizes all seat-related counts for all venues and schedules.
     * This is a system-wide synchronization that ensures complete consistency.
     */
    @Transactional
    public void synchronizeAllSeats() {
        // Get all venues
        Iterable<Venue> venues = venueRepository.findAll();
        
        // Synchronize each venue
        for (Venue venue : venues) {
            synchronizeSeatsForVenue(venue.getId());
        }
        
        System.out.println("Completed system-wide seat count synchronization");
    }
}