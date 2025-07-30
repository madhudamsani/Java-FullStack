package com.showvault.controller;

import com.showvault.model.Venue;
import com.showvault.repository.VenueRepository;
import com.showvault.repository.SeatRepository;
import com.showvault.service.VenueService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/venues")
public class VenueController {

    private final VenueRepository venueRepository;
    private final SeatRepository seatRepository;
    private final VenueService venueService;

    public VenueController(VenueRepository venueRepository, SeatRepository seatRepository, VenueService venueService) {
        this.venueRepository = venueRepository;
        this.seatRepository = seatRepository;
        this.venueService = venueService;
    }

    @GetMapping
    public ResponseEntity<List<Venue>> getAllVenues() {
        List<Venue> venues = venueRepository.findAll();
        return new ResponseEntity<>(venues, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Venue> getVenueById(@PathVariable Long id) {
        return venueRepository.findById(id)
                .map(venue -> new ResponseEntity<>(venue, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping("/city/{city}")
    public ResponseEntity<List<Venue>> getVenuesByCity(@PathVariable String city) {
        List<Venue> venues = venueService.getVenuesByCity(city);
        return new ResponseEntity<>(venues, HttpStatus.OK);
    }

    @GetMapping("/country/{country}")
    public ResponseEntity<List<Venue>> getVenuesByCountry(@PathVariable String country) {
        List<Venue> venues = venueService.getVenuesByCountry(country);
        return new ResponseEntity<>(venues, HttpStatus.OK);
    }

    @GetMapping("/capacity/{capacity}")
    public ResponseEntity<List<Venue>> getVenuesByMinimumCapacity(@PathVariable Integer capacity) {
        List<Venue> venues = venueService.getVenuesByMinimumCapacity(capacity);
        return new ResponseEntity<>(venues, HttpStatus.OK);
    }

    @GetMapping("/cities")
    public ResponseEntity<List<String>> getAllCities() {
        List<String> cities = venueService.getAllCities();
        return new ResponseEntity<>(cities, HttpStatus.OK);
    }

    @GetMapping("/countries")
    public ResponseEntity<List<String>> getAllCountries() {
        List<String> countries = venueService.getAllCountries();
        return new ResponseEntity<>(countries, HttpStatus.OK);
    }
    
    @GetMapping("/search")
    public ResponseEntity<List<Venue>> searchVenues(@RequestParam(name = "query") String query) {
        List<Venue> venues = venueService.searchVenues(query);
        return new ResponseEntity<>(venues, HttpStatus.OK);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('ORGANIZER')")
    public ResponseEntity<?> createVenue(@RequestBody Venue venue) {
        if (venue.getName() == null || venue.getName().isEmpty()) {
            return new ResponseEntity<>("Venue name is required", HttpStatus.BAD_REQUEST);
        }
        if (venue.getCity() == null || venue.getCity().isEmpty()) {
            return new ResponseEntity<>("City is required", HttpStatus.BAD_REQUEST);
        }
        if (venue.getCountry() == null || venue.getCountry().isEmpty()) {
            return new ResponseEntity<>("Country is required", HttpStatus.BAD_REQUEST);
        }
        if (venue.getCapacity() == null || venue.getCapacity() <= 0) {
            return new ResponseEntity<>("Capacity must be positive", HttpStatus.BAD_REQUEST);
        }
        
        Venue newVenue = venueService.createVenue(venue);
        return new ResponseEntity<>(newVenue, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ORGANIZER')")
    public ResponseEntity<?> updateVenue(@PathVariable Long id, @RequestBody Venue venue) {
        if (venue.getName() == null || venue.getName().isEmpty()) {
            return ResponseEntity.badRequest().body("Venue name is required");
        }
        if (venue.getCity() == null || venue.getCity().isEmpty()) {
            return ResponseEntity.badRequest().body("City is required");
        }
        if (venue.getCountry() == null || venue.getCountry().isEmpty()) {
            return ResponseEntity.badRequest().body("Country is required");
        }
        if (venue.getCapacity() == null || venue.getCapacity() <= 0) {
            return ResponseEntity.badRequest().body("Capacity must be positive");
        }
        
        return venueRepository.findById(id)
                .map(existingVenue -> {
                    venue.setId(id);
                    Venue updatedVenue = venueService.updateVenue(venue);
                    return ResponseEntity.ok(updatedVenue);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteVenue(@PathVariable Long id) {
        try {
            if (!venueRepository.existsById(id)) {
                return new ResponseEntity<>("Venue not found", HttpStatus.NOT_FOUND);
            }
            venueService.deleteVenue(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (Exception e) {
            return new ResponseEntity<>("Error deleting venue: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/{id}/capacity")
    public ResponseEntity<?> getVenueCapacityInfo(@PathVariable Long id) {
        try {
            return venueRepository.findById(id)
                .map(venue -> {
                    Long actualSeatCount = seatRepository.countSeatsByVenueId(id);
                    
                    VenueCapacityInfo capacityInfo = new VenueCapacityInfo();
                    capacityInfo.setVenueId(id);
                    capacityInfo.setVenueName(venue.getName());
                    capacityInfo.setConfiguredCapacity(venue.getCapacity());
                    capacityInfo.setActualSeatCount(actualSeatCount.intValue());
                    capacityInfo.setHasSeats(actualSeatCount > 0);
                    capacityInfo.setCapacityMatch(venue.getCapacity().equals(actualSeatCount.intValue()));
                    
                    return ResponseEntity.ok(capacityInfo);
                })
                .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error getting venue capacity info: " + e.getMessage());
        }
    }

    /**
     * DTO for venue capacity information
     */
    public static class VenueCapacityInfo {
        private Long venueId;
        private String venueName;
        private Integer configuredCapacity;
        private Integer actualSeatCount;
        private Boolean hasSeats;
        private Boolean capacityMatch;

        // Getters and setters
        public Long getVenueId() { return venueId; }
        public void setVenueId(Long venueId) { this.venueId = venueId; }

        public String getVenueName() { return venueName; }
        public void setVenueName(String venueName) { this.venueName = venueName; }

        public Integer getConfiguredCapacity() { return configuredCapacity; }
        public void setConfiguredCapacity(Integer configuredCapacity) { this.configuredCapacity = configuredCapacity; }

        public Integer getActualSeatCount() { return actualSeatCount; }
        public void setActualSeatCount(Integer actualSeatCount) { this.actualSeatCount = actualSeatCount; }

        public Boolean getHasSeats() { return hasSeats; }
        public void setHasSeats(Boolean hasSeats) { this.hasSeats = hasSeats; }

        public Boolean getCapacityMatch() { return capacityMatch; }
        public void setCapacityMatch(Boolean capacityMatch) { this.capacityMatch = capacityMatch; }
    }
}