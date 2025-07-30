package com.showvault.controller;

import com.showvault.util.DatabaseConsistencyChecker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller for database maintenance operations
 * These endpoints should only be accessible to administrators
 */
@RestController
@RequestMapping("/api/admin/database")
public class DatabaseMaintenanceController {

    @Autowired
    private DatabaseConsistencyChecker databaseConsistencyChecker;
    
    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * Endpoint to check and fix seat count inconsistencies
     * @return A response indicating the result of the operation
     */
    @PostMapping("/fix-seat-counts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> fixSeatCounts() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            databaseConsistencyChecker.run();
            response.put("success", true);
            response.put("message", "Seat count consistency check completed successfully");
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Error during seat count consistency check: " + e.getMessage());
            response.put("error", e.getMessage());
        }
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Endpoint to get database statistics
     * @return Statistics about the database
     */
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getDatabaseStats() {
        Map<String, Object> stats = new HashMap<>();
        
        try {
            // Get venue statistics
            Integer venueCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM venue", Integer.class);
            stats.put("venueCount", venueCount);
            
            // Get seat statistics
            Integer seatCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM seat", Integer.class);
            stats.put("seatCount", seatCount);
            
            // Get show schedule statistics
            Integer scheduleCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM show_schedule", Integer.class);
            stats.put("scheduleCount", scheduleCount);
            
            // Get booking statistics
            Integer bookingCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM booking", Integer.class);
            stats.put("bookingCount", bookingCount);
            
            // Get venues with missing seats
            List<Map<String, Object>> venuesWithoutSeats = jdbcTemplate.queryForList(
                    "SELECT v.id, v.name, v.capacity, COUNT(s.id) as seat_count " +
                    "FROM venue v LEFT JOIN seat s ON v.id = s.venue_id " +
                    "GROUP BY v.id, v.name, v.capacity " +
                    "HAVING v.capacity > 0 AND seat_count = 0");
            stats.put("venuesWithoutSeats", venuesWithoutSeats);
            
            // Get venues with capacity mismatches
            List<Map<String, Object>> venueCapacityMismatches = jdbcTemplate.queryForList(
                    "SELECT v.id, v.name, v.capacity, COUNT(s.id) as seat_count " +
                    "FROM venue v LEFT JOIN seat s ON v.id = s.venue_id " +
                    "GROUP BY v.id, v.name, v.capacity " +
                    "HAVING v.capacity != seat_count AND seat_count > 0");
            stats.put("venueCapacityMismatches", venueCapacityMismatches);
            
            // Get show schedules with total_seats mismatches
            List<Map<String, Object>> scheduleTotalSeatsMismatches = jdbcTemplate.queryForList(
                    "SELECT ss.id, ss.show_id, ss.venue_id, ss.total_seats, v.capacity " +
                    "FROM show_schedule ss JOIN venue v ON ss.venue_id = v.id " +
                    "WHERE ss.total_seats != v.capacity");
            stats.put("scheduleTotalSeatsMismatches", scheduleTotalSeatsMismatches);
            
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Error getting database statistics: " + e.getMessage());
            error.put("error", e.getMessage());
            return ResponseEntity.ok(error);
        }
    }
}