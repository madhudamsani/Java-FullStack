package com.showvault.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.showvault.dto.SeatMapDTO;
import com.showvault.service.SeatMapService;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/seat-maps")
public class SeatMapController {

    @Autowired
    private SeatMapService seatMapService;
    
    /**
     * Get the seat map for a specific show schedule
     * 
     * @param showId The ID of the show
     * @param scheduleId The ID of the show schedule
     * @return The seat map
     */
    @GetMapping("/shows/{showId}/schedules/{scheduleId}")
    public ResponseEntity<SeatMapDTO> getSeatMap(
            @PathVariable Long showId,
            @PathVariable Long scheduleId) {
        try {
            System.out.println("Generating seat map for show " + showId + ", schedule " + scheduleId);
            SeatMapDTO seatMap = seatMapService.generateSeatMap(showId, scheduleId);
            System.out.println("Successfully generated seat map with " + 
                              (seatMap.getRows() != null ? seatMap.getRows().size() : 0) + " rows");
            
            // Check if this is an error seat map
            if (seatMap.getMetadata() != null && seatMap.getMetadata().containsKey("error")) {
                System.out.println("Returning error seat map: " + seatMap.getMetadata().get("error"));
            }
            
            return new ResponseEntity<>(seatMap, HttpStatus.OK);
        } catch (Exception e) {
            // Log the error
            System.err.println("Error generating seat map for show " + showId + ", schedule " + scheduleId + ": " + e.getMessage());
            e.printStackTrace();
            
            // Create a minimal seat map with error information
            SeatMapDTO errorSeatMap = SeatMapDTO.createErrorSeatMap(
                "Failed to generate seat map: " + e.getMessage(), 
                showId, 
                scheduleId);
            
            // Add timestamp to help with debugging
            errorSeatMap.getMetadata().put("timestamp", System.currentTimeMillis());
            errorSeatMap.getMetadata().put("errorType", e.getClass().getSimpleName());
            
            // Return the error seat map with OK status to avoid frontend errors
            return new ResponseEntity<>(errorSeatMap, HttpStatus.OK);
        }
    }
    
    /**
     * Get a sample seat map for testing
     * 
     * @return A sample seat map
     */
    @GetMapping("/sample")
    public ResponseEntity<SeatMapDTO> getSampleSeatMap() {
        SeatMapDTO seatMap = seatMapService.generateSampleSeatMap();
        return new ResponseEntity<>(seatMap, HttpStatus.OK);
    }
    
    /**
     * Clear the seat map cache for a specific show and schedule
     * This should be called when show capacity or venue configuration changes
     * 
     * @param showId The ID of the show
     * @param scheduleId The ID of the show schedule
     * @return Success message
     */
    @DeleteMapping("/cache/shows/{showId}/schedules/{scheduleId}")
    public ResponseEntity<String> clearSeatMapCache(
            @PathVariable Long showId,
            @PathVariable Long scheduleId) {
        try {
            seatMapService.clearSeatMapCache(showId, scheduleId);
            return new ResponseEntity<>("Seat map cache cleared successfully for show " + showId + 
                                      ", schedule " + scheduleId, HttpStatus.OK);
        } catch (Exception e) {
            System.err.println("Error clearing seat map cache: " + e.getMessage());
            return new ResponseEntity<>("Failed to clear seat map cache: " + e.getMessage(), 
                                      HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Clear all seat map cache entries
     * This can be used for maintenance or when global changes are made
     * 
     * @return Success message
     */
    @DeleteMapping("/cache/all")
    public ResponseEntity<String> clearAllSeatMapCache() {
        try {
            seatMapService.clearAllSeatMapCache();
            return new ResponseEntity<>("All seat map cache entries cleared successfully", HttpStatus.OK);
        } catch (Exception e) {
            System.err.println("Error clearing all seat map cache: " + e.getMessage());
            return new ResponseEntity<>("Failed to clear all seat map cache: " + e.getMessage(), 
                                      HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}