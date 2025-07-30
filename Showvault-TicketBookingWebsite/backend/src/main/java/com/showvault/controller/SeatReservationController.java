package com.showvault.controller;

import com.showvault.model.Seat;
import com.showvault.model.SeatReservation;
import com.showvault.model.ShowSchedule;
import com.showvault.model.User;
import com.showvault.security.services.UserDetailsImpl;
import com.showvault.service.SeatReservationService;
import com.showvault.service.SeatService;
import com.showvault.service.ShowScheduleService;
import com.showvault.service.UserService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/seat-reservations")
public class SeatReservationController {

    @Autowired
    private SeatReservationService seatReservationService;
    
    @Autowired
    private SeatService seatService;
    
    @Autowired
    private ShowScheduleService showScheduleService;
    
    @Autowired
    private UserService userService;
    
    /**
     * Reserve seats for the current user
     */
    @PostMapping("/schedule/{scheduleId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> reserveSeats(
            @PathVariable Long scheduleId,
            @RequestBody Map<String, List<Long>> requestBody) {
        
        List<Long> seatIds = requestBody.get("seatIds");
        if (seatIds == null || seatIds.isEmpty()) {
            return new ResponseEntity<>("No seats selected", HttpStatus.BAD_REQUEST);
        }
        
        // Get the current user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        if (!userOpt.isPresent()) {
            return new ResponseEntity<>("User not found", HttpStatus.NOT_FOUND);
        }
        
        // Get the show schedule
        Optional<ShowSchedule> scheduleOpt = showScheduleService.getShowScheduleById(scheduleId);
        if (!scheduleOpt.isPresent()) {
            return new ResponseEntity<>("Show schedule not found", HttpStatus.NOT_FOUND);
        }
        
        // Get the seats
        List<Seat> seats = seatService.getSeatsByIds(seatIds);
        if (seats.size() != seatIds.size()) {
            return new ResponseEntity<>("One or more seats not found", HttpStatus.NOT_FOUND);
        }
        
        // Generate a session ID for this reservation
        String sessionId = UUID.randomUUID().toString();
        
        // Reserve the seats for 10 minutes
        List<SeatReservation> reservations = seatReservationService.reserveSeats(
            seats, scheduleOpt.get(), userOpt.get(), sessionId, 10);
        
        return new ResponseEntity<>(Map.of(
            "success", true,
            "message", "Seats reserved successfully",
            "sessionId", sessionId,
            "reservedSeats", reservations.size()
        ), HttpStatus.OK);
    }
    
    /**
     * Release seat reservations for a session
     */
    @DeleteMapping("/session/{sessionId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> releaseReservations(@PathVariable String sessionId) {
        seatReservationService.releaseReservations(sessionId);
        
        return new ResponseEntity<>(Map.of(
            "success", true,
            "message", "Reservations released successfully"
        ), HttpStatus.OK);
    }
}