package com.showvault.controller;

import com.showvault.model.Seat;
import com.showvault.model.ShowSchedule;
import com.showvault.model.Venue;
import com.showvault.repository.SeatRepository;
import com.showvault.repository.ShowScheduleRepository;
import com.showvault.repository.VenueRepository;
import com.showvault.service.SeatManagementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/seat-management")
public class SeatManagementController {

    @Autowired
    private SeatManagementService seatManagementService;

    @Autowired
    private VenueRepository venueRepository;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private ShowScheduleRepository showScheduleRepository;

    /**
     * Get comprehensive seat information for a venue
     */
    @GetMapping("/venue/{venueId}/info")
    public ResponseEntity<?> getVenueSeatInfo(@PathVariable Long venueId) {
        try {
            return venueRepository.findById(venueId)
                .map(venue -> {
                    Map<String, Object> info = new HashMap<>();
                    
                    // Basic venue info
                    info.put("venueId", venue.getId());
                    info.put("venueName", venue.getName());
                    info.put("configuredCapacity", venue.getCapacity());
                    
                    // Actual seat counts
                    Long actualSeatCount = seatRepository.countSeatsByVenueId(venueId);
                    info.put("actualSeatCount", actualSeatCount);
                    info.put("hasSeats", actualSeatCount > 0);
                    info.put("capacityMatch", venue.getCapacity().equals(actualSeatCount.intValue()));
                    
                    // Seat category breakdown
                    if (actualSeatCount > 0) {
                        Map<String, Long> categoryBreakdown = new HashMap<>();
                        categoryBreakdown.put("VIP", seatRepository.countByVenueIdAndCategory(venueId, Seat.SeatCategory.VIP));
                        categoryBreakdown.put("PREMIUM", seatRepository.countByVenueIdAndCategory(venueId, Seat.SeatCategory.PREMIUM));
                        categoryBreakdown.put("STANDARD", seatRepository.countByVenueIdAndCategory(venueId, Seat.SeatCategory.STANDARD));
                        info.put("seatCategoryBreakdown", categoryBreakdown);
                    }
                    
                    // Show schedules using this venue
                    List<ShowSchedule> schedules = showScheduleRepository.findByVenueId(venueId);
                    info.put("totalSchedules", schedules.size());
                    
                    // Schedule seat usage
                    Map<String, Object> scheduleInfo = new HashMap<>();
                    schedules.forEach(schedule -> {
                        Map<String, Object> scheduleData = new HashMap<>();
                        scheduleData.put("showTitle", schedule.getShow().getTitle());
                        scheduleData.put("showDate", schedule.getShowDate());
                        scheduleData.put("totalSeats", schedule.getTotalSeats());
                        scheduleData.put("availableSeats", schedule.getSeatsAvailable());
                        scheduleData.put("usedSeats", schedule.getTotalSeats() - schedule.getSeatsAvailable());
                        scheduleInfo.put("schedule_" + schedule.getId(), scheduleData);
                    });
                    info.put("scheduleUsage", scheduleInfo);
                    
                    return ResponseEntity.ok(info);
                })
                .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error getting venue seat info: " + e.getMessage());
        }
    }

    /**
     * Generate seats for a venue
     */
    @PostMapping("/venue/{venueId}/generate-seats")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ORGANIZER')")
    public ResponseEntity<?> generateSeatsForVenue(@PathVariable Long venueId) {
        try {
            int seatsGenerated = seatManagementService.generateSeatsForVenue(venueId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("venueId", venueId);
            response.put("seatsGenerated", seatsGenerated);
            response.put("message", "Successfully generated " + seatsGenerated + " seats");
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error generating seats: " + e.getMessage());
        }
    }

    /**
     * Validate seat allocation for a venue
     */
    @PostMapping("/venue/{venueId}/validate-seats")
    public ResponseEntity<?> validateSeatAllocation(
            @PathVariable Long venueId, 
            @RequestParam int requestedSeats) {
        try {
            SeatManagementService.SeatValidationResult result = 
                seatManagementService.validateSeatAllocation(venueId, requestedSeats);
            
            Map<String, Object> response = new HashMap<>();
            response.put("venueId", venueId);
            response.put("requestedSeats", requestedSeats);
            response.put("valid", result.isValid());
            response.put("message", result.getMessage());
            
            if (result.isValid()) {
                response.put("maxSeats", seatManagementService.getMaximumSeatsForVenue(venueId));
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error validating seat allocation: " + e.getMessage());
        }
    }

    /**
     * Get seat layout for a venue
     */
    @GetMapping("/venue/{venueId}/layout")
    public ResponseEntity<?> getVenueSeatLayout(@PathVariable Long venueId) {
        try {
            List<Seat> seats = seatRepository.findByVenueId(venueId);
            
            if (seats.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                    "venueId", venueId,
                    "message", "No seats configured for this venue",
                    "seats", seats
                ));
            }
            
            // Group seats by row
            Map<String, List<Seat>> seatsByRow = new HashMap<>();
            seats.forEach(seat -> {
                seatsByRow.computeIfAbsent(seat.getRowName(), k -> new java.util.ArrayList<>()).add(seat);
            });
            
            // Sort seats within each row
            seatsByRow.values().forEach(rowSeats -> 
                rowSeats.sort((s1, s2) -> Integer.compare(s1.getSeatNumber(), s2.getSeatNumber()))
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("venueId", venueId);
            response.put("totalSeats", seats.size());
            response.put("seatsByRow", seatsByRow);
            response.put("rows", seatsByRow.keySet().stream().sorted().toList());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error getting seat layout: " + e.getMessage());
        }
    }

    /**
     * Get system-wide seat management statistics
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getSeatManagementStatistics() {
        try {
            List<Venue> allVenues = venueRepository.findAll();
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalVenues", allVenues.size());
            
            int venuesWithSeats = 0;
            int venuesWithoutSeats = 0;
            int totalSeats = 0;
            int capacityMismatches = 0;
            
            // Lists to store detailed venue information
            List<Map<String, Object>> venuesWithoutSeatsDetails = new java.util.ArrayList<>();
            List<Map<String, Object>> venuesWithCapacityMismatches = new java.util.ArrayList<>();
            
            for (Venue venue : allVenues) {
                Long seatCount = seatRepository.countSeatsByVenueId(venue.getId());
                if (seatCount > 0) {
                    venuesWithSeats++;
                    totalSeats += seatCount;
                    if (!venue.getCapacity().equals(seatCount.intValue())) {
                        capacityMismatches++;
                        
                        // Add to capacity mismatch details
                        Map<String, Object> mismatchInfo = new HashMap<>();
                        mismatchInfo.put("venueId", venue.getId());
                        mismatchInfo.put("venueName", venue.getName());
                        mismatchInfo.put("city", venue.getCity());
                        mismatchInfo.put("configuredCapacity", venue.getCapacity());
                        mismatchInfo.put("actualSeatCount", seatCount);
                        mismatchInfo.put("difference", venue.getCapacity() - seatCount.intValue());
                        venuesWithCapacityMismatches.add(mismatchInfo);
                    }
                } else {
                    venuesWithoutSeats++;
                    
                    // Add to venues without seats details
                    Map<String, Object> venueInfo = new HashMap<>();
                    venueInfo.put("venueId", venue.getId());
                    venueInfo.put("venueName", venue.getName());
                    venueInfo.put("city", venue.getCity());
                    venueInfo.put("country", venue.getCountry());
                    venueInfo.put("capacity", venue.getCapacity());
                    venueInfo.put("address", venue.getAddress());
                    
                    // Check if venue has any schedules
                    List<ShowSchedule> venueSchedules = showScheduleRepository.findByVenueId(venue.getId());
                    venueInfo.put("hasSchedules", !venueSchedules.isEmpty());
                    venueInfo.put("scheduleCount", venueSchedules.size());
                    
                    venuesWithoutSeatsDetails.add(venueInfo);
                }
            }
            
            stats.put("venuesWithSeats", venuesWithSeats);
            stats.put("venuesWithoutSeats", venuesWithoutSeats);
            stats.put("totalSeats", totalSeats);
            stats.put("capacityMismatches", capacityMismatches);
            
            // Add detailed breakdowns
            stats.put("venuesWithoutSeatsDetails", venuesWithoutSeatsDetails);
            stats.put("venuesWithCapacityMismatchesDetails", venuesWithCapacityMismatches);
            
            // Schedule statistics
            List<ShowSchedule> allSchedules = showScheduleRepository.findAll();
            stats.put("totalSchedules", allSchedules.size());
            
            int schedulesExceedingCapacity = 0;
            List<Map<String, Object>> schedulesExceedingCapacityDetails = new java.util.ArrayList<>();
            
            for (ShowSchedule schedule : allSchedules) {
                Long venueSeatCount = seatRepository.countSeatsByVenueId(schedule.getVenue().getId());
                if (schedule.getTotalSeats() > venueSeatCount) {
                    schedulesExceedingCapacity++;
                    
                    // Add schedule details
                    Map<String, Object> scheduleInfo = new HashMap<>();
                    scheduleInfo.put("scheduleId", schedule.getId());
                    scheduleInfo.put("showTitle", schedule.getShow().getTitle());
                    scheduleInfo.put("venueName", schedule.getVenue().getName());
                    scheduleInfo.put("venueId", schedule.getVenue().getId());
                    scheduleInfo.put("showDate", schedule.getShowDate());
                    scheduleInfo.put("scheduledSeats", schedule.getTotalSeats());
                    scheduleInfo.put("venueSeatCount", venueSeatCount);
                    scheduleInfo.put("excess", schedule.getTotalSeats() - venueSeatCount.intValue());
                    schedulesExceedingCapacityDetails.add(scheduleInfo);
                }
            }
            stats.put("schedulesExceedingCapacity", schedulesExceedingCapacity);
            stats.put("schedulesExceedingCapacityDetails", schedulesExceedingCapacityDetails);
            
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error getting statistics: " + e.getMessage());
        }
    }
}