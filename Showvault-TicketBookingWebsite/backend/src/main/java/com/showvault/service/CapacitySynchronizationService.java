package com.showvault.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.showvault.model.ShowSchedule;
import com.showvault.model.Venue;
import com.showvault.repository.VenueRepository;
import com.showvault.service.SeatConsistencyService;

/**
 * Service to periodically synchronize capacity values across the system
 * This ensures that venue.capacity, show_schedule.total_seats, and actual seat counts
 * remain consistent throughout the application
 */
@Service
public class CapacitySynchronizationService {

    @Autowired
    private SeatConsistencyService seatConsistencyService;
    
    /**
     * Run capacity synchronization daily at 3 AM
     * This ensures all capacity values are consistent across the system
     */
    @Scheduled(cron = "0 0 3 * * ?")
    @Transactional
    public void synchronizeAllCapacities() {
        System.out.println("Starting scheduled capacity synchronization...");
        
        // Use the SeatConsistencyService to synchronize all seats
        seatConsistencyService.synchronizeAllSeats();
        
        System.out.println("Capacity synchronization completed successfully");
    }
    
    /**
     * Manual trigger for capacity synchronization
     * Can be called via API for immediate synchronization
     */
    @Transactional
    public String synchronizeCapacitiesManually() {
        synchronizeAllCapacities();
        return "Capacity synchronization completed successfully";
    }
}