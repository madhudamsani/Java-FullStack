package com.showvault.controller;

import com.showvault.service.SeatConsistencyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller for managing seat count consistency across the system
 */
@RestController
@RequestMapping("/api/admin/seat-consistency")
@PreAuthorize("hasRole('ADMIN')")
public class SeatConsistencyController {

    @Autowired
    private SeatConsistencyService seatConsistencyService;

    /**
     * Synchronize seat counts for a specific show schedule
     * 
     * @param scheduleId The ID of the show schedule to synchronize
     * @return Response with status message
     */
    @PostMapping("/schedule/{scheduleId}")
    public ResponseEntity<?> synchronizeSchedule(@PathVariable Long scheduleId) {
        try {
            seatConsistencyService.synchronizeSeatsForSchedule(scheduleId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Seat counts synchronized successfully for schedule ID: " + scheduleId);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Error synchronizing seat counts: " + e.getMessage());
            
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * Synchronize seat counts for a specific venue
     * 
     * @param venueId The ID of the venue to synchronize
     * @return Response with status message
     */
    @PostMapping("/venue/{venueId}")
    public ResponseEntity<?> synchronizeVenue(@PathVariable Long venueId) {
        try {
            seatConsistencyService.synchronizeSeatsForVenue(venueId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Seat counts synchronized successfully for all schedules of venue ID: " + venueId);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Error synchronizing seat counts: " + e.getMessage());
            
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    /**
     * Synchronize seat counts for all venues and schedules
     * 
     * @return Response with status message
     */
    @PostMapping("/all")
    public ResponseEntity<?> synchronizeAll() {
        try {
            seatConsistencyService.synchronizeAllSeats();
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Seat counts synchronized successfully for all venues and schedules");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Error synchronizing seat counts: " + e.getMessage());
            
            return ResponseEntity.badRequest().body(response);
        }
    }
}