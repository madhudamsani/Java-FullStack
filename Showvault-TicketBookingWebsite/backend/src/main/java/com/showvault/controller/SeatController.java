package com.showvault.controller;

import com.showvault.model.Seat;
import com.showvault.model.Venue;
import com.showvault.service.SeatService;
import com.showvault.service.VenueService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/seats")
public class SeatController {

    @Autowired
    private SeatService seatService;

    @Autowired
    private VenueService venueService;

    @GetMapping
    public ResponseEntity<List<Seat>> getAllSeats() {
        List<Seat> seats = seatService.getAllSeats();
        return new ResponseEntity<>(seats, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Seat> getSeatById(@PathVariable Long id) {
        return seatService.getSeatById(id)
                .map(seat -> new ResponseEntity<>(seat, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping("/venue/{venueId}")
    public ResponseEntity<List<Seat>> getSeatsByVenueId(@PathVariable Long venueId) {
        List<Seat> seats = seatService.getSeatsByVenueId(venueId);
        return new ResponseEntity<>(seats, HttpStatus.OK);
    }

    @GetMapping("/venue/{venueId}/category/{category}")
    public ResponseEntity<List<Seat>> getSeatsByVenueIdAndCategory(
            @PathVariable Long venueId,
            @PathVariable Seat.SeatCategory category) {
        List<Seat> seats = seatService.getSeatsByVenueIdAndCategory(venueId, category);
        return new ResponseEntity<>(seats, HttpStatus.OK);
    }

    @GetMapping("/venue/{venueId}/row/{rowName}")
    public ResponseEntity<List<Seat>> getSeatsByVenueIdAndRowName(
            @PathVariable Long venueId,
            @PathVariable String rowName) {
        List<Seat> seats = seatService.getSeatsByVenueIdAndRowName(venueId, rowName);
        return new ResponseEntity<>(seats, HttpStatus.OK);
    }

    @GetMapping("/venue/{venueId}/rows")
    public ResponseEntity<List<String>> getAllRowsByVenueId(@PathVariable Long venueId) {
        List<String> rows = seatService.getAllRowsByVenueId(venueId);
        return new ResponseEntity<>(rows, HttpStatus.OK);
    }

    @GetMapping("/venue/{venueId}/available/{showScheduleId}")
    public ResponseEntity<List<Seat>> getAvailableSeatsByVenueAndShowSchedule(
            @PathVariable Long venueId,
            @PathVariable Long showScheduleId) {
        List<Seat> seats = seatService.getAvailableSeatsByVenueAndShowSchedule(venueId, showScheduleId);
        return new ResponseEntity<>(seats, HttpStatus.OK);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('ORGANIZER')")
    public ResponseEntity<Seat> createSeat(@RequestBody Seat seat) {
        Seat newSeat = seatService.createSeat(seat);
        return new ResponseEntity<>(newSeat, HttpStatus.CREATED);
    }

    @PostMapping("/venue/{venueId}/batch")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ORGANIZER')")
    public ResponseEntity<?> createSeatsForVenue(
            @PathVariable Long venueId,
            @RequestParam String rowName,
            @RequestParam int startSeatNumber,
            @RequestParam int endSeatNumber,
            @RequestParam Seat.SeatCategory category,
            @RequestParam(defaultValue = "1.0") BigDecimal priceMultiplier) {
        
        return venueService.getVenueById(venueId)
                .map(venue -> {
                    List<Seat> seats = seatService.createSeatsForVenue(
                            venue, rowName, startSeatNumber, endSeatNumber, category, priceMultiplier);
                    return new ResponseEntity<>(seats, HttpStatus.CREATED);
                })
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ORGANIZER')")
    public ResponseEntity<Seat> updateSeat(@PathVariable Long id, @RequestBody Seat seat) {
        return seatService.getSeatById(id)
                .map(existingSeat -> {
                    seat.setId(id);
                    Seat updatedSeat = seatService.updateSeat(seat);
                    return new ResponseEntity<>(updatedSeat, HttpStatus.OK);
                })
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<HttpStatus> deleteSeat(@PathVariable Long id) {
        try {
            seatService.deleteSeat(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}