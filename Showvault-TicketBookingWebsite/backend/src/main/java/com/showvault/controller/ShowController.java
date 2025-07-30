package com.showvault.controller;

import com.showvault.dto.ShowDTO;
import com.showvault.dto.ShowReviewDTO;
import com.showvault.dto.ShowCreateRequestDTO;
import com.showvault.model.Show;
import com.showvault.model.ShowReview;
import com.showvault.model.ShowSchedule;
import com.showvault.model.User;
import com.showvault.model.Venue;
import com.showvault.security.services.UserDetailsImpl;
import com.showvault.service.DTOConverterService;
import com.showvault.service.ShowService;
import com.showvault.service.ShowScheduleService;
import com.showvault.service.ShowCancellationService;
import com.showvault.service.UserService;
import com.showvault.service.VenueService;
import com.showvault.service.ScheduleValidationService;
import com.showvault.service.ShowTypeService;
import com.showvault.model.Show.ShowStatus;
import com.showvault.payload.response.ApiResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/shows")
public class ShowController {

    @Autowired
    private ShowService showService;

    @Autowired
    private UserService userService;
    
    @Autowired
    private ShowScheduleService showScheduleService;
    
    @Autowired
    private VenueService venueService;
    
    @Autowired
    private DTOConverterService dtoConverterService;
    
    @Autowired
    private ShowCancellationService showCancellationService;
    
    @Autowired
    private ScheduleValidationService scheduleValidationService;
    
    @Autowired
    private ShowTypeService showTypeService;

    @GetMapping
    public ResponseEntity<List<ShowDTO>> getAllShows(
            @RequestParam(required = false) String excludeStatus) {
        try {
            List<Show> shows;
            if (excludeStatus != null && !excludeStatus.isEmpty()) {
                System.out.println("Excluding shows with status: " + excludeStatus);
                try {
                    Show.ShowStatus statusToExclude = Show.ShowStatus.valueOf(excludeStatus.toUpperCase());
                    shows = showService.getAllShowsExcept(statusToExclude);
                } catch (IllegalArgumentException e) {
                    System.out.println("Invalid excludeStatus: " + excludeStatus + ", returning all shows");
                    shows = showService.getAllShows();
                }
            } else {
                shows = showService.getAllShows();
            }
            List<ShowDTO> showDTOs = dtoConverterService.convertShowsToDTO(shows);
            return new ResponseEntity<>(showDTOs, HttpStatus.OK);
        } catch (Exception e) {
            System.err.println("Error fetching all shows: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShowDTO> getShowById(@PathVariable Long id) {
        return showService.getShowById(id)
                .map(show -> new ResponseEntity<>(dtoConverterService.convertToShowDTO(show), HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<ShowDTO>> getShowsByStatus(@PathVariable Show.ShowStatus status) {
        List<Show> shows = showService.getShowsByStatus(status);
        List<ShowDTO> showDTOs = dtoConverterService.convertShowsToDTO(shows);
        return new ResponseEntity<>(showDTOs, HttpStatus.OK);
    }

    @GetMapping("/genre/{genre}")
    public ResponseEntity<List<ShowDTO>> getShowsByGenre(@PathVariable String genre) {
        List<Show> shows = showService.getShowsByGenre(genre);
        List<ShowDTO> showDTOs = dtoConverterService.convertShowsToDTO(shows);
        return new ResponseEntity<>(showDTOs, HttpStatus.OK);
    }

    @GetMapping("/language/{language}")
    public ResponseEntity<List<ShowDTO>> getShowsByLanguage(@PathVariable String language) {
        List<Show> shows = showService.getShowsByLanguage(language);
        List<ShowDTO> showDTOs = dtoConverterService.convertShowsToDTO(shows);
        return new ResponseEntity<>(showDTOs, HttpStatus.OK);
    }

    @GetMapping("/search")
    public ResponseEntity<List<ShowDTO>> searchShowsByTitle(@RequestParam String title) {
        List<Show> shows = showService.searchShowsByTitle(title);
        List<ShowDTO> showDTOs = dtoConverterService.convertShowsToDTO(shows);
        return new ResponseEntity<>(showDTOs, HttpStatus.OK);
    }
    
    @GetMapping("/filter")
    public ResponseEntity<Page<ShowDTO>> filterShows(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) String venue,
            @RequestParam(required = false) Double priceMin,
            @RequestParam(required = false) Double priceMax,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String excludeStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        // Log the filter parameters
        System.out.println("Filter parameters:");
        System.out.println("Type: " + type);
        System.out.println("Genre: " + genre);
        System.out.println("Search: " + search);
        System.out.println("DateFrom: " + dateFrom);
        System.out.println("DateTo: " + dateTo);
        System.out.println("Venue: " + venue);
        System.out.println("PriceMin: " + priceMin);
        System.out.println("PriceMax: " + priceMax);
        System.out.println("Sort: " + sort);
        System.out.println("Status: " + status);
        System.out.println("ExcludeStatus: " + excludeStatus);
        System.out.println("Page: " + page);
        System.out.println("Size: " + size);
        
        try {
            Page<Show> shows = showService.filterShows(
                type, genre, search, dateFrom, dateTo, 
                venue, priceMin, priceMax, sort, status, excludeStatus, page, size
            );
            
            List<ShowDTO> showDTOs = dtoConverterService.convertShowsToDTO(shows.getContent());
            Page<ShowDTO> showDTOPage = new PageImpl<>(
                showDTOs,
                shows.getPageable(),
                shows.getTotalElements()
            );
            
            return new ResponseEntity<>(showDTOPage, HttpStatus.OK);
        } catch (Exception e) {
            System.err.println("Error filtering shows: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(Page.empty(), HttpStatus.OK);
        }
    }

    @GetMapping("/genres")
    public ResponseEntity<List<String>> getAllGenres() {
        List<String> genres = showService.getAllGenres();
        return new ResponseEntity<>(genres, HttpStatus.OK);
    }

    @GetMapping("/languages")
    public ResponseEntity<List<String>> getAllLanguages() {
        List<String> languages = showService.getAllLanguages();
        return new ResponseEntity<>(languages, HttpStatus.OK);
    }
    
    /**
     * Redirect to the analytics endpoint for backward compatibility
     */
    @GetMapping("/{id}/analytics")
    public ResponseEntity<?> getShowAnalytics(@PathVariable Long id) {
        // Redirect to the proper analytics endpoint
        return ResponseEntity
            .status(HttpStatus.TEMPORARY_REDIRECT)
            .header("Location", "/api/analytics/shows/" + id)
            .build();
    }

    @GetMapping("/my-shows")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<List<ShowDTO>> getMyShows() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        if (userOpt.isPresent()) {
            List<Show> shows = showService.getShowsByCreator(userOpt.get());
            List<ShowDTO> showDTOs = dtoConverterService.convertShowsToDTO(shows);
            return new ResponseEntity<>(showDTOs, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/my-shows/search")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<Page<ShowDTO>> searchMyShows(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        if (!userOpt.isPresent()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        
        try {
            Page<Show> shows = showService.filterShowsByCreator(
                userOpt.get(), status, search, dateFrom, dateTo, page, size
            );
            
            List<ShowDTO> showDTOs = dtoConverterService.convertShowsToDTO(shows.getContent());
            Page<ShowDTO> showDTOPage = new PageImpl<>(
                showDTOs,
                shows.getPageable(),
                shows.getTotalElements()
            );
            
            return new ResponseEntity<>(showDTOPage, HttpStatus.OK);
        } catch (Exception e) {
            System.err.println("Error searching my shows: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(Page.empty(), HttpStatus.OK);
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<?> createShow(@RequestBody Object requestBody) {
        try {
            System.out.println("=== CREATE SHOW REQUEST ===");
            System.out.println("Request body type: " + requestBody.getClass().getSimpleName());
            System.out.println("Request body: " + requestBody);
            
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            Optional<User> userOpt = userService.getUserById(userDetails.getId());
            if (!userOpt.isPresent()) {
                System.err.println("User not found with ID: " + userDetails.getId());
                return new ResponseEntity<>("User not found", HttpStatus.BAD_REQUEST);
            }
            
            User user = userOpt.get();
            System.out.println("Creating show for user: " + user.getUsername());
            
            // Handle both Show object and ShowCreateRequestDTO
            Show show;
            List<ShowCreateRequestDTO.ScheduleCreateDTO> schedulesToCreate = new ArrayList<>();
            
            if (requestBody instanceof Show) {
                show = (Show) requestBody;
            } else {
                // Parse as JSON to handle dynamic request body
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
                
                String jsonString = mapper.writeValueAsString(requestBody);
                com.fasterxml.jackson.databind.JsonNode jsonNode = mapper.readTree(jsonString);
                
                // Create Show object from JSON
                show = new Show();
                show.setTitle(jsonNode.get("title").asText());
                show.setDescription(jsonNode.has("description") ? jsonNode.get("description").asText() : null);
                show.setType(jsonNode.get("type").asText());
                show.setDuration(jsonNode.get("duration").asInt());
                show.setGenre(jsonNode.has("genre") ? jsonNode.get("genre").asText() : null);
                show.setLanguage(jsonNode.has("language") ? jsonNode.get("language").asText() : null);
                show.setPosterUrl(jsonNode.has("posterUrl") ? jsonNode.get("posterUrl").asText() : null);
                show.setTrailerUrl(jsonNode.has("trailerUrl") ? jsonNode.get("trailerUrl").asText() : null);
                
                // Handle status
                if (jsonNode.has("status")) {
                    show.setStatus(Show.ShowStatus.valueOf(jsonNode.get("status").asText()));
                } else {
                    show.setStatus(Show.ShowStatus.UPCOMING);
                }
                
                // Extract schedule information
                if (jsonNode.has("schedules") && jsonNode.get("schedules").isArray()) {
                    for (com.fasterxml.jackson.databind.JsonNode scheduleNode : jsonNode.get("schedules")) {
                        ShowCreateRequestDTO.ScheduleCreateDTO scheduleDTO = new ShowCreateRequestDTO.ScheduleCreateDTO();
                        
                        // Extract venue information
                        if (scheduleNode.has("venue")) {
                            com.fasterxml.jackson.databind.JsonNode venueNode = scheduleNode.get("venue");
                            ShowCreateRequestDTO.VenueDTO venueDTO = new ShowCreateRequestDTO.VenueDTO();
                            Long venueId = venueNode.get("id").asLong();
                            venueDTO.setId(venueId);
                            venueDTO.setName(venueNode.has("name") ? venueNode.get("name").asText() : "");
                            scheduleDTO.setVenue(venueDTO);
                            scheduleDTO.setVenueId(venueId); // Also set venueId field
                        }
                        
                        // Handle venueId field directly if present
                        if (scheduleNode.has("venueId")) {
                            scheduleDTO.setVenueId(scheduleNode.get("venueId").asLong());
                        }
                        
                        scheduleDTO.setShowDate(scheduleNode.get("showDate").asText());
                        scheduleDTO.setShowTime(scheduleNode.get("showTime").asText());
                        scheduleDTO.setBasePrice(new BigDecimal(scheduleNode.get("basePrice").asText()));
                        scheduleDTO.setTotalSeats(scheduleNode.get("totalSeats").asInt());
                        scheduleDTO.setAvailableSeats(scheduleNode.has("availableSeats") ? 
                            scheduleNode.get("availableSeats").asInt() : scheduleNode.get("totalSeats").asInt());
                        
                        schedulesToCreate.add(scheduleDTO);
                    }
                }
                
                // Handle backward compatibility - single schedule from direct fields
                if (schedulesToCreate.isEmpty() && jsonNode.has("venue") && jsonNode.has("date") && jsonNode.has("time")) {
                    ShowCreateRequestDTO.ScheduleCreateDTO scheduleDTO = new ShowCreateRequestDTO.ScheduleCreateDTO();
                    
                    try {
                        ShowCreateRequestDTO.VenueDTO venueDTO = new ShowCreateRequestDTO.VenueDTO();
                        Long venueId;
                        
                        // Handle venue ID parsing - could be string or number
                        if (jsonNode.get("venue").isTextual()) {
                            venueId = Long.parseLong(jsonNode.get("venue").asText());
                        } else {
                            venueId = jsonNode.get("venue").asLong();
                        }
                        
                        venueDTO.setId(venueId);
                        scheduleDTO.setVenue(venueDTO);
                        scheduleDTO.setVenueId(venueId); // Also set venueId field
                        
                        scheduleDTO.setShowDate(jsonNode.get("date").asText());
                        scheduleDTO.setShowTime(jsonNode.get("time").asText());
                        scheduleDTO.setBasePrice(new BigDecimal(jsonNode.get("price").asText()));
                        scheduleDTO.setTotalSeats(jsonNode.get("totalSeats").asInt());
                        scheduleDTO.setAvailableSeats(jsonNode.has("availableSeats") ? 
                            jsonNode.get("availableSeats").asInt() : jsonNode.get("totalSeats").asInt());
                        
                        schedulesToCreate.add(scheduleDTO);
                    } catch (NumberFormatException e) {
                        System.err.println("Error parsing venue ID: " + jsonNode.get("venue").asText());
                        return new ResponseEntity<>("Invalid venue ID format", HttpStatus.BAD_REQUEST);
                    }
                }
            }
            
            // Set user as creator
            show.setCreatedBy(user);
            if (show.getStatus() == null) {
                show.setStatus(Show.ShowStatus.UPCOMING);
            }
            
            System.out.println("Creating show with title: " + show.getTitle());
            System.out.println("Show creator: " + show.getCreatedBy().getUsername());
            System.out.println("Schedules to create: " + schedulesToCreate.size());
            
            // Create the show first
            Show newShow = showService.createShow(show);
            System.out.println("Show created successfully with ID: " + newShow.getId());
            
            // Create schedules if any
            System.out.println("Processing " + schedulesToCreate.size() + " schedules");
            for (ShowCreateRequestDTO.ScheduleCreateDTO scheduleDTO : schedulesToCreate) {
                try {
                    System.out.println("Processing schedule: " + scheduleDTO);
                    
                    // Get venue - handle both venue object and venue ID
                    Long venueId = null;
                    if (scheduleDTO.getVenue() != null && scheduleDTO.getVenue().getId() != null) {
                        venueId = scheduleDTO.getVenue().getId();
                        System.out.println("Got venue ID from venue object: " + venueId);
                    } else if (scheduleDTO.getVenueId() != null) {
                        venueId = scheduleDTO.getVenueId();
                        System.out.println("Got venue ID from venueId field: " + venueId);
                    }
                    
                    if (venueId == null) {
                        System.err.println("No venue ID provided in schedule: " + scheduleDTO);
                        continue;
                    }
                    
                    Optional<Venue> venueOpt = venueService.getVenueById(venueId);
                    if (!venueOpt.isPresent()) {
                        System.err.println("Venue not found with ID: " + venueId);
                        continue;
                    }
                    
                    Venue venue = venueOpt.get();
                    System.out.println("Found venue: " + venue.getName());
                    
                    // Create schedule
                    ShowSchedule schedule = new ShowSchedule();
                    schedule.setShow(newShow);
                    schedule.setVenue(venue);
                    schedule.setShowDate(LocalDate.parse(scheduleDTO.getShowDate()));
                    
                    // Parse time - handle both HH:mm and HH:mm:ss formats
                    LocalTime startTime;
                    try {
                        if (scheduleDTO.getShowTime().length() <= 5) {
                            startTime = LocalTime.parse(scheduleDTO.getShowTime(), DateTimeFormatter.ofPattern("HH:mm"));
                        } else {
                            startTime = LocalTime.parse(scheduleDTO.getShowTime());
                        }
                    } catch (Exception e) {
                        System.err.println("Error parsing time: " + scheduleDTO.getShowTime() + ", using default");
                        startTime = LocalTime.of(19, 0); // Default to 7 PM
                    }
                    
                    schedule.setStartTime(startTime);
                    
                    // Calculate end time based on show duration
                    if (newShow.getDuration() != null) {
                        schedule.setEndTime(startTime.plusMinutes(newShow.getDuration()));
                    } else {
                        schedule.setEndTime(startTime.plusHours(2)); // Default 2 hours
                    }
                    
                    schedule.setBasePrice(scheduleDTO.getBasePrice());
                    schedule.setStatus(ShowSchedule.ScheduleStatus.SCHEDULED);
                    schedule.setTotalSeats(scheduleDTO.getTotalSeats());
                    schedule.setSeatsAvailable(scheduleDTO.getAvailableSeats());
                    
                    System.out.println("Creating schedule with details:");
                    System.out.println("  Date: " + schedule.getShowDate());
                    System.out.println("  Time: " + schedule.getStartTime() + " - " + schedule.getEndTime());
                    System.out.println("  Venue: " + venue.getName());
                    System.out.println("  Price: " + schedule.getBasePrice());
                    System.out.println("  Seats: " + schedule.getTotalSeats());
                    
                    ShowSchedule createdSchedule = showScheduleService.createShowSchedule(schedule);
                    System.out.println("Schedule created successfully with ID: " + createdSchedule.getId());
                    
                } catch (Exception e) {
                    System.err.println("Error creating schedule: " + e.getMessage());
                    e.printStackTrace();
                }
            }
            
            // Return the created show with schedules
            Optional<Show> showWithSchedules = showService.getShowById(newShow.getId());
            if (showWithSchedules.isPresent()) {
                return new ResponseEntity<>(showWithSchedules.get(), HttpStatus.CREATED);
            } else {
                return new ResponseEntity<>(newShow, HttpStatus.CREATED);
            }
            
        } catch (Exception e) {
            System.err.println("Error creating show: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("Failed to create show: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Update only the show details (title, description, etc.) without affecting schedules
     */
    @PutMapping("/{id}/details")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> updateShowDetailsOnly(@PathVariable Long id, @RequestBody Object requestBody) {
        return showService.getShowById(id)
                .map(existingShow -> {
                    // Check if the user is the creator or an admin
                    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
                    UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
                    
                    if (existingShow.getCreatedBy().getId().equals(userDetails.getId()) || 
                            authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                        
                        try {
                            ObjectMapper mapper = new ObjectMapper();
                            JsonNode jsonNode = mapper.readTree(mapper.writeValueAsString(requestBody));
                            
                            // Update only show details, not schedules
                            if (jsonNode.has("title")) {
                                existingShow.setTitle(jsonNode.get("title").asText());
                            }
                            if (jsonNode.has("type")) {
                                existingShow.setType(jsonNode.get("type").asText());
                            }
                            if (jsonNode.has("posterUrl")) {
                                existingShow.setPosterUrl(jsonNode.get("posterUrl").asText());
                            }
                            if (jsonNode.has("trailerUrl")) {
                                existingShow.setTrailerUrl(jsonNode.get("trailerUrl").asText());
                            }
                            if (jsonNode.has("description")) {
                                existingShow.setDescription(jsonNode.get("description").asText());
                            }
                            if (jsonNode.has("duration")) {
                                existingShow.setDuration(jsonNode.get("duration").asInt());
                            }
                            if (jsonNode.has("genre")) {
                                existingShow.setGenre(jsonNode.get("genre").asText());
                            }
                            if (jsonNode.has("language")) {
                                existingShow.setLanguage(jsonNode.get("language").asText());
                            }
                            if (jsonNode.has("status")) {
                                existingShow.setStatus(ShowStatus.valueOf(jsonNode.get("status").asText()));
                            }
                            
                            // Save only the updated show details
                            Show updatedShow = showService.updateShowDetailsOnly(existingShow);
                            return ResponseEntity.ok(updatedShow);
                            
                        } catch (Exception e) {
                            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                    .body(new ApiResponse(false, "Failed to update show details: " + e.getMessage()));
                        }
                    } else {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(new ApiResponse(false, "You are not authorized to update this show"));
                    }
                })
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ApiResponse(false, "Show not found with id: " + id)));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> updateShow(@PathVariable Long id, @RequestBody Object requestBody) {
        return showService.getShowById(id)
                .map(existingShow -> {
                    // Check if the user is the creator or an admin
                    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
                    UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
                    
                    if (existingShow.getCreatedBy().getId().equals(userDetails.getId()) || 
                            authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                        
                        try {
                            // Parse the request body to handle schedule time mapping
                            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                            mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
                            
                            String jsonString = mapper.writeValueAsString(requestBody);
                            com.fasterxml.jackson.databind.JsonNode jsonNode = mapper.readTree(jsonString);
                            
                            // Create Show object from JSON
                            Show show = new Show();
                            show.setId(id);
                            show.setTitle(jsonNode.get("title").asText());
                            show.setDescription(jsonNode.has("description") ? jsonNode.get("description").asText() : null);
                            show.setType(jsonNode.get("type").asText());
                            show.setDuration(jsonNode.get("duration").asInt());
                            show.setGenre(jsonNode.has("genre") ? jsonNode.get("genre").asText() : null);
                            show.setLanguage(jsonNode.has("language") ? jsonNode.get("language").asText() : null);
                            show.setPosterUrl(jsonNode.has("posterUrl") ? jsonNode.get("posterUrl").asText() : null);
                            show.setTrailerUrl(jsonNode.has("trailerUrl") ? jsonNode.get("trailerUrl").asText() : null);
                            
                            // Handle status
                            if (jsonNode.has("status")) {
                                show.setStatus(Show.ShowStatus.valueOf(jsonNode.get("status").asText()));
                            }
                            
                            // Set creator
                            show.setCreatedBy(existingShow.getCreatedBy());
                            
                            // Process schedules if present
                            if (jsonNode.has("schedules") && jsonNode.get("schedules").isArray()) {
                                List<ShowSchedule> schedules = new ArrayList<>();
                                
                                for (com.fasterxml.jackson.databind.JsonNode scheduleNode : jsonNode.get("schedules")) {
                                    ShowSchedule schedule = new ShowSchedule();
                                    schedule.setShow(show);
                                    
                                    // Get venue
                                    if (scheduleNode.has("venue")) {
                                        com.fasterxml.jackson.databind.JsonNode venueNode = scheduleNode.get("venue");
                                        Long venueId = venueNode.get("id").asLong();
                                        Optional<Venue> venueOpt = venueService.getVenueById(venueId);
                                        if (venueOpt.isPresent()) {
                                            schedule.setVenue(venueOpt.get());
                                        }
                                    } else if (scheduleNode.has("venueId")) {
                                        Long venueId = scheduleNode.get("venueId").asLong();
                                        Optional<Venue> venueOpt = venueService.getVenueById(venueId);
                                        if (venueOpt.isPresent()) {
                                            schedule.setVenue(venueOpt.get());
                                        }
                                    }
                                    
                                    // Set date
                                    schedule.setShowDate(LocalDate.parse(scheduleNode.get("showDate").asText()));
                                    
                                    // Handle time - map showTime to startTime
                                    LocalTime startTime;
                                    if (scheduleNode.has("showTime")) {
                                        String timeStr = scheduleNode.get("showTime").asText();
                                        try {
                                            if (timeStr.length() <= 5) {
                                                startTime = LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm"));
                                            } else {
                                                startTime = LocalTime.parse(timeStr);
                                            }
                                        } catch (Exception e) {
                                            System.err.println("Error parsing time: " + timeStr + ", using default");
                                            startTime = LocalTime.of(19, 0); // Default to 7 PM
                                        }
                                    } else {
                                        startTime = LocalTime.of(19, 0); // Default time
                                    }
                                    
                                    schedule.setStartTime(startTime);
                                    
                                    // Calculate end time based on show duration
                                    if (show.getDuration() != null) {
                                        schedule.setEndTime(startTime.plusMinutes(show.getDuration()));
                                    } else {
                                        schedule.setEndTime(startTime.plusHours(2)); // Default 2 hours
                                    }
                                    
                                    // Set other fields
                                    schedule.setBasePrice(new BigDecimal(scheduleNode.get("basePrice").asText()));
                                    schedule.setTotalSeats(scheduleNode.get("totalSeats").asInt());
                                    schedule.setSeatsAvailable(scheduleNode.has("availableSeats") ? 
                                        scheduleNode.get("availableSeats").asInt() : scheduleNode.get("totalSeats").asInt());
                                    
                                    if (scheduleNode.has("status")) {
                                        String statusStr = scheduleNode.get("status").asText();
                                        // Map show status to schedule status
                                        ShowSchedule.ScheduleStatus scheduleStatus;
                                        switch (statusStr.toUpperCase()) {
                                            case "ONGOING":
                                            case "UPCOMING":
                                            case "SCHEDULED":
                                                scheduleStatus = ShowSchedule.ScheduleStatus.SCHEDULED;
                                                break;
                                            case "CANCELLED":
                                                scheduleStatus = ShowSchedule.ScheduleStatus.CANCELLED;
                                                break;
                                            case "COMPLETED":
                                                scheduleStatus = ShowSchedule.ScheduleStatus.COMPLETED;
                                                break;
                                            default:
                                                scheduleStatus = ShowSchedule.ScheduleStatus.SCHEDULED;
                                                break;
                                        }
                                        schedule.setStatus(scheduleStatus);
                                    } else {
                                        schedule.setStatus(ShowSchedule.ScheduleStatus.SCHEDULED);
                                    }
                                    
                                    schedules.add(schedule);
                                }
                                
                                show.setSchedules(schedules);
                            }
                            
                            Show updatedShow = showService.updateShow(show);
                            ShowDTO showDTO = dtoConverterService.convertToShowDTO(updatedShow);
                            return ResponseEntity.ok(showDTO);
                            
                        } catch (Exception e) {
                            System.err.println("Error updating show: " + e.getMessage());
                            e.printStackTrace();
                            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body("Error updating show: " + e.getMessage());
                        }
                    } else {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("You do not have permission to update this show.");
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> updateShowStatus(
            @PathVariable Long id, 
            @RequestParam Show.ShowStatus status) {
        
        return showService.getShowById(id)
                .map(existingShow -> {
                    // Check if the user is the creator or an admin
                    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
                    UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
                    
                    if (existingShow.getCreatedBy().getId().equals(userDetails.getId()) || 
                            authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                        
                        boolean updated = showService.updateShowStatus(id, status);
                        return updated ? 
                                ResponseEntity.ok().build() : 
                                ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
                    } else {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }


    
    /**
     * Process show cancellation - handle notifications and refunds
     * @param show The cancelled show
     * @param reason The reason for cancellation
     * @param userId The ID of the user who cancelled the show
     */
    private void processShowCancellation(Show show, String reason, Long userId) {
        try {
            int processedBookings = showCancellationService.processShowCancellation(show, reason, userId);
            System.out.println("Processed " + processedBookings + " bookings for cancelled show: " + show.getTitle());
        } catch (Exception e) {
            System.err.println("Error processing show cancellation: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @GetMapping("/{id}/reviews")
    public ResponseEntity<List<ShowReviewDTO>> getShowReviews(@PathVariable Long id) {
        List<ShowReview> reviews = showService.getShowReviews(id);
        List<ShowReviewDTO> reviewDTOs = dtoConverterService.convertToShowReviewDTOs(reviews);
        return new ResponseEntity<>(reviewDTOs, HttpStatus.OK);
    }

    @PostMapping("/{id}/reviews")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ShowReviewDTO> addReview(
            @PathVariable Long id,
            @Valid @RequestBody ShowReviewDTO reviewDTO) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        ShowReview review = dtoConverterService.convertToShowReview(reviewDTO);
        review.setShowId(id);
        review.setUserId(userDetails.getId());
        review.setUserName(userDetails.getUsername());
        
        // Ensure createdAt is set for new reviews
        if (review.getCreatedAt() == null) {
            review.setCreatedAt(LocalDateTime.now());
        }
        
        ShowReview newReview = showService.addReview(review);
        ShowReviewDTO newReviewDTO = dtoConverterService.convertToShowReviewDTO(newReview);
        return new ResponseEntity<>(newReviewDTO, HttpStatus.CREATED);
    }

    @GetMapping("/recommended")
    public ResponseEntity<List<ShowDTO>> getRecommendedShows() {
        List<Show> shows = showService.getRecommendedShows();
        List<ShowDTO> showDTOs = dtoConverterService.convertShowsToDTO(shows);
        return new ResponseEntity<>(showDTOs, HttpStatus.OK);
    }

    @GetMapping("/recommended/{id}")
    public ResponseEntity<List<ShowDTO>> getSimilarShows(@PathVariable Long id) {
        List<Show> shows = showService.getSimilarShows(id);
        List<ShowDTO> showDTOs = dtoConverterService.convertShowsToDTO(shows);
        return new ResponseEntity<>(showDTOs, HttpStatus.OK);
    }

    // Schedule management endpoints for shows
    @GetMapping("/{id}/schedules")
    public ResponseEntity<List<ShowSchedule>> getShowSchedules(@PathVariable Long id) {
        try {
            // Verify show exists
            Optional<Show> showOpt = showService.getShowById(id);
            if (!showOpt.isPresent()) {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }

            // Get schedules for this show
            List<ShowSchedule> schedules = showScheduleService.getShowSchedulesByShowId(id);
            return new ResponseEntity<>(schedules, HttpStatus.OK);
        } catch (Exception e) {
            System.err.println("Error fetching schedules for show " + id + ": " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/{id}/schedules")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<?> createShowSchedule(@PathVariable Long id, @RequestBody Object requestBody) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            // Verify show exists and belongs to organizer
            Optional<Show> showOpt = showService.getShowById(id);
            if (!showOpt.isPresent()) {
                return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
            }
            
            Show show = showOpt.get();
            
            // Check if user owns this show
            if (!show.getCreatedBy().getId().equals(userDetails.getId())) {
                return new ResponseEntity<>("You can only add schedules to your own shows", HttpStatus.FORBIDDEN);
            }

            // Parse request body
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
            
            String jsonString = mapper.writeValueAsString(requestBody);
            com.fasterxml.jackson.databind.JsonNode jsonNode = mapper.readTree(jsonString);
            
            // Get venue
            Long venueId = jsonNode.get("venueId").asLong();
            Optional<Venue> venueOpt = venueService.getVenueById(venueId);
            if (!venueOpt.isPresent()) {
                return new ResponseEntity<>("Venue not found", HttpStatus.BAD_REQUEST);
            }
            
            Venue venue = venueOpt.get();
            
            // Create schedule
            ShowSchedule schedule = new ShowSchedule();
            schedule.setShow(show);
            schedule.setVenue(venue);
            schedule.setShowDate(LocalDate.parse(jsonNode.get("showDate").asText()));
            
            // Parse time
            String timeStr = jsonNode.get("showTime").asText();
            LocalTime startTime;
            try {
                if (timeStr.length() <= 5) {
                    startTime = LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm"));
                } else {
                    startTime = LocalTime.parse(timeStr);
                }
            } catch (Exception e) {
                startTime = LocalTime.of(19, 0); // Default to 7 PM
            }
            
            schedule.setStartTime(startTime);
            
            // Validate schedule before creation
            ScheduleValidationService.ValidationResult validation = 
                scheduleValidationService.validateNewSchedule(show, venue, schedule.getShowDate(), startTime, null);
            
            if (!validation.isValid()) {
                // Return detailed error with suggestions
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", validation.getErrorMessage());
                
                // Add suggested alternative times
                List<LocalTime> suggestions = scheduleValidationService.suggestAlternativeTimeSlots(
                    show, venue, schedule.getShowDate(), startTime, 3);
                if (!suggestions.isEmpty()) {
                    List<String> suggestionStrings = suggestions.stream()
                        .map(time -> time.format(DateTimeFormatter.ofPattern("h:mm a")))
                        .collect(java.util.stream.Collectors.toList());
                    errorResponse.put("suggestedTimes", suggestionStrings);
                    errorResponse.put("message", "Try these alternative times: " + String.join(", ", suggestionStrings));
                }
                
                return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
            }
            
            // Calculate end time using validation service
            ScheduleValidationService.ScheduleTimeInfo timeInfo = 
                scheduleValidationService.calculateScheduleTimes(show, startTime);
            schedule.setEndTime(timeInfo.getEndTime());
            
            schedule.setBasePrice(new BigDecimal(jsonNode.get("basePrice").asText()));
            schedule.setStatus(ShowSchedule.ScheduleStatus.SCHEDULED);
            schedule.setTotalSeats(jsonNode.get("totalSeats").asInt());
            schedule.setSeatsAvailable(jsonNode.get("totalSeats").asInt());
            
            // Save schedule
            ShowSchedule newSchedule = showScheduleService.createShowSchedule(schedule);
            
            // Add warnings to response if any
            if (!validation.getWarnings().isEmpty()) {
                System.out.println("Schedule created with warnings: " + validation.getWarnings());
            }
            
            // Create a response object that includes showTime for frontend compatibility
            com.fasterxml.jackson.databind.ObjectMapper responseMapper = new com.fasterxml.jackson.databind.ObjectMapper();
            responseMapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
            com.fasterxml.jackson.databind.node.ObjectNode responseNode = responseMapper.createObjectNode();
            
            // Copy all properties from the new schedule
            responseNode.put("id", newSchedule.getId());
            responseNode.put("showId", newSchedule.getShow().getId());
            responseNode.put("showDate", newSchedule.getShowDate().toString());
            
            // Include both startTime (for backend) and showTime (for frontend)
            responseNode.put("startTime", newSchedule.getStartTime().toString());
            responseNode.put("showTime", newSchedule.getStartTime().toString());
            
            responseNode.put("basePrice", newSchedule.getBasePrice().toString());
            responseNode.put("totalSeats", newSchedule.getTotalSeats());
            responseNode.put("seatsAvailable", newSchedule.getSeatsAvailable());
            responseNode.put("availableSeats", newSchedule.getSeatsAvailable()); // For backward compatibility
            responseNode.put("status", newSchedule.getStatus().toString());
            
            // Add venue information
            com.fasterxml.jackson.databind.node.ObjectNode venueNode = responseNode.putObject("venue");
            venueNode.put("id", newSchedule.getVenue().getId());
            venueNode.put("name", newSchedule.getVenue().getName());
            venueNode.put("address", newSchedule.getVenue().getAddress() != null ? newSchedule.getVenue().getAddress() : "");
            venueNode.put("city", newSchedule.getVenue().getCity() != null ? newSchedule.getVenue().getCity() : "");
            venueNode.put("state", newSchedule.getVenue().getState() != null ? newSchedule.getVenue().getState() : "");
            venueNode.put("country", newSchedule.getVenue().getCountry() != null ? newSchedule.getVenue().getCountry() : "");
            venueNode.put("capacity", newSchedule.getVenue().getCapacity());
            
            return new ResponseEntity<>(responseNode, HttpStatus.CREATED);
            
        } catch (Exception e) {
            System.err.println("Error creating schedule: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("Failed to create schedule: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/{id}/schedules/bulk-timeslots")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<?> createBulkTimeSlots(@PathVariable Long id, @RequestBody Object requestBody) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            // Verify show exists and belongs to organizer
            Optional<Show> showOpt = showService.getShowById(id);
            if (!showOpt.isPresent()) {
                return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
            }
            
            Show show = showOpt.get();
            
            // Check if user owns this show
            if (!show.getCreatedBy().getId().equals(userDetails.getId())) {
                return new ResponseEntity<>("You can only add schedules to your own shows", HttpStatus.FORBIDDEN);
            }

            // Parse request body
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
            
            String jsonString = mapper.writeValueAsString(requestBody);
            com.fasterxml.jackson.databind.JsonNode jsonNode = mapper.readTree(jsonString);
            
            // Get common fields
            Long venueId = jsonNode.get("venueId").asLong();
            Optional<Venue> venueOpt = venueService.getVenueById(venueId);
            if (!venueOpt.isPresent()) {
                return new ResponseEntity<>("Venue not found", HttpStatus.BAD_REQUEST);
            }
            
            Venue venue = venueOpt.get();
            LocalDate showDate = LocalDate.parse(jsonNode.get("showDate").asText());
            BigDecimal basePrice = new BigDecimal(jsonNode.get("basePrice").asText());
            int totalSeats = jsonNode.get("totalSeats").asInt();
            
            // Get time slots array
            if (!jsonNode.has("timeSlots") || !jsonNode.get("timeSlots").isArray()) {
                return new ResponseEntity<>("Time slots array is required", HttpStatus.BAD_REQUEST);
            }
            
            // Parse time slots
            List<LocalTime> timeSlots = new ArrayList<>();
            for (com.fasterxml.jackson.databind.JsonNode timeSlotNode : jsonNode.get("timeSlots")) {
                String timeStr = timeSlotNode.get("showTime").asText();
                try {
                    LocalTime time;
                    if (timeStr.length() <= 5) {
                        time = LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm"));
                    } else {
                        time = LocalTime.parse(timeStr);
                    }
                    timeSlots.add(time);
                } catch (Exception e) {
                    return new ResponseEntity<>("Invalid time format: " + timeStr, HttpStatus.BAD_REQUEST);
                }
            }
            
            // Validate all time slots together
            ScheduleValidationService.ValidationResult bulkValidation = 
                scheduleValidationService.validateBulkTimeSlots(show, venue, showDate, timeSlots);
            
            if (!bulkValidation.isValid()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", bulkValidation.getErrorMessage());
                errorResponse.put("type", "BULK_VALIDATION_ERROR");
                return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
            }
            
            List<ShowSchedule> createdSchedules = new ArrayList<>();
            
            // Create schedule for each validated time slot
            for (LocalTime timeSlot : timeSlots) {
                // Create schedule
                ShowSchedule schedule = new ShowSchedule();
                schedule.setShow(show);
                schedule.setVenue(venue);
                schedule.setShowDate(showDate);
                schedule.setStartTime(timeSlot);
                
                // Calculate end time using validation service
                ScheduleValidationService.ScheduleTimeInfo timeInfo = 
                    scheduleValidationService.calculateScheduleTimes(show, timeSlot);
                schedule.setEndTime(timeInfo.getEndTime());
                
                schedule.setBasePrice(basePrice);
                schedule.setStatus(ShowSchedule.ScheduleStatus.SCHEDULED);
                schedule.setTotalSeats(totalSeats);
                schedule.setSeatsAvailable(totalSeats);
                
                // Save schedule
                ShowSchedule newSchedule = showScheduleService.createShowSchedule(schedule);
                createdSchedules.add(newSchedule);
            }
            
            // Log warnings if any
            if (!bulkValidation.getWarnings().isEmpty()) {
                System.out.println("Bulk schedules created with warnings: " + bulkValidation.getWarnings());
            }
            
            // Create response with all created schedules
            List<Map<String, Object>> responseList = new ArrayList<>();
            
            for (ShowSchedule schedule : createdSchedules) {
                Map<String, Object> scheduleMap = new HashMap<>();
                scheduleMap.put("id", schedule.getId());
                scheduleMap.put("showId", schedule.getShow().getId());
                scheduleMap.put("showDate", schedule.getShowDate().toString());
                scheduleMap.put("startTime", schedule.getStartTime().toString());
                scheduleMap.put("showTime", schedule.getStartTime().toString());
                scheduleMap.put("basePrice", schedule.getBasePrice().toString());
                scheduleMap.put("totalSeats", schedule.getTotalSeats());
                scheduleMap.put("seatsAvailable", schedule.getSeatsAvailable());
                scheduleMap.put("availableSeats", schedule.getSeatsAvailable());
                scheduleMap.put("status", schedule.getStatus().toString());
                
                // Add venue information
                Map<String, Object> venueMap = new HashMap<>();
                venueMap.put("id", schedule.getVenue().getId());
                venueMap.put("name", schedule.getVenue().getName());
                venueMap.put("address", schedule.getVenue().getAddress() != null ? schedule.getVenue().getAddress() : "");
                venueMap.put("city", schedule.getVenue().getCity() != null ? schedule.getVenue().getCity() : "");
                venueMap.put("state", schedule.getVenue().getState() != null ? schedule.getVenue().getState() : "");
                venueMap.put("country", schedule.getVenue().getCountry() != null ? schedule.getVenue().getCountry() : "");
                venueMap.put("capacity", schedule.getVenue().getCapacity());
                scheduleMap.put("venue", venueMap);
                
                responseList.add(scheduleMap);
            }
            
            return new ResponseEntity<>(responseList, HttpStatus.CREATED);
            
        } catch (Exception e) {
            System.err.println("Error creating bulk time slots: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("Failed to create time slots: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PutMapping("/{id}/schedules/{scheduleId}")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<?> updateShowSchedule(
            @PathVariable Long id, 
            @PathVariable Long scheduleId, 
            @RequestBody Object requestBody) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            // Verify show exists and belongs to organizer
            Optional<Show> showOpt = showService.getShowById(id);
            if (!showOpt.isPresent()) {
                return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
            }
            
            Show show = showOpt.get();
            if (!show.getCreatedBy().getId().equals(userDetails.getId())) {
                return new ResponseEntity<>("You can only update schedules for your own shows", HttpStatus.FORBIDDEN);
            }

            // Verify schedule exists and belongs to this show
            Optional<ShowSchedule> scheduleOpt = showScheduleService.getShowScheduleById(scheduleId);
            if (!scheduleOpt.isPresent()) {
                return new ResponseEntity<>("Schedule not found", HttpStatus.NOT_FOUND);
            }
            
            ShowSchedule schedule = scheduleOpt.get();
            if (!schedule.getShow().getId().equals(id)) {
                return new ResponseEntity<>("Schedule does not belong to this show", HttpStatus.BAD_REQUEST);
            }

            // Parse request body and update schedule
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
            
            String jsonString = mapper.writeValueAsString(requestBody);
            com.fasterxml.jackson.databind.JsonNode jsonNode = mapper.readTree(jsonString);
            
            // Update venue if provided
            if (jsonNode.has("venueId")) {
                Long venueId = jsonNode.get("venueId").asLong();
                Optional<Venue> venueOpt = venueService.getVenueById(venueId);
                if (venueOpt.isPresent()) {
                    schedule.setVenue(venueOpt.get());
                }
            }
            
            // Update other fields
            if (jsonNode.has("showDate")) {
                schedule.setShowDate(LocalDate.parse(jsonNode.get("showDate").asText()));
            }
            
            if (jsonNode.has("showTime")) {
                String timeStr = jsonNode.get("showTime").asText();
                LocalTime startTime;
                try {
                    if (timeStr.length() <= 5) {
                        startTime = LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm"));
                    } else {
                        startTime = LocalTime.parse(timeStr);
                    }
                    
                    // Validate the new time slot (excluding current schedule from conflict check)
                    ScheduleValidationService.ValidationResult validation = 
                        scheduleValidationService.validateNewSchedule(show, schedule.getVenue(), 
                                                                    schedule.getShowDate(), startTime, scheduleId);
                    
                    if (!validation.isValid()) {
                        Map<String, Object> errorResponse = new HashMap<>();
                        errorResponse.put("error", validation.getErrorMessage());
                        
                        // Add suggested alternative times
                        List<LocalTime> suggestions = scheduleValidationService.suggestAlternativeTimeSlots(
                            show, schedule.getVenue(), schedule.getShowDate(), startTime, 3);
                        if (!suggestions.isEmpty()) {
                            List<String> suggestionStrings = suggestions.stream()
                                .map(time -> time.format(DateTimeFormatter.ofPattern("h:mm a")))
                                .collect(java.util.stream.Collectors.toList());
                            errorResponse.put("suggestedTimes", suggestionStrings);
                        }
                        
                        return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
                    }
                    
                    schedule.setStartTime(startTime);
                    
                    // Recalculate end time using validation service
                    ScheduleValidationService.ScheduleTimeInfo timeInfo = 
                        scheduleValidationService.calculateScheduleTimes(show, startTime);
                    schedule.setEndTime(timeInfo.getEndTime());
                    
                    // Log warnings if any
                    if (!validation.getWarnings().isEmpty()) {
                        System.out.println("Schedule updated with warnings: " + validation.getWarnings());
                    }
                    
                } catch (Exception e) {
                    return new ResponseEntity<>("Invalid time format: " + timeStr, HttpStatus.BAD_REQUEST);
                }
            }
            
            if (jsonNode.has("basePrice")) {
                schedule.setBasePrice(new BigDecimal(jsonNode.get("basePrice").asText()));
            }
            
            if (jsonNode.has("totalSeats")) {
                int newTotalSeats = jsonNode.get("totalSeats").asInt();
                
                // Just set the total seats and let SeatConsistencyService handle the available seats calculation
                // This ensures proper synchronization with actual booked seats in the database
                System.out.println("Updating total seats from " + schedule.getTotalSeats() + " to " + newTotalSeats);
                schedule.setTotalSeats(newTotalSeats);
                
                // Don't manually adjust seatsAvailable here - it will be properly calculated by the service
            }
            
            // Save updated schedule
            ShowSchedule updatedSchedule = showScheduleService.updateShowSchedule(schedule);
            
            // Create a response object that includes showTime for frontend compatibility
            com.fasterxml.jackson.databind.ObjectMapper responseMapper = new com.fasterxml.jackson.databind.ObjectMapper();
           responseMapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
           com.fasterxml.jackson.databind.node.ObjectNode responseNode = responseMapper.createObjectNode();
            
            // Copy all properties from the updated schedule
            responseNode.put("id", updatedSchedule.getId());
            responseNode.put("showId", updatedSchedule.getShow().getId());
            responseNode.put("showDate", updatedSchedule.getShowDate().toString());
            
            // Include both startTime (for backend) and showTime (for frontend)
            responseNode.put("startTime", updatedSchedule.getStartTime().toString());
            responseNode.put("showTime", updatedSchedule.getStartTime().toString());
            
            responseNode.put("basePrice", updatedSchedule.getBasePrice().toString());
            responseNode.put("totalSeats", updatedSchedule.getTotalSeats());
            responseNode.put("seatsAvailable", updatedSchedule.getSeatsAvailable());
            responseNode.put("availableSeats", updatedSchedule.getSeatsAvailable()); // For backward compatibility
            responseNode.put("status", updatedSchedule.getStatus().toString());
            
            // Add venue information
            com.fasterxml.jackson.databind.node.ObjectNode venueNode = responseNode.putObject("venue");
            venueNode.put("id", updatedSchedule.getVenue().getId());
            venueNode.put("name", updatedSchedule.getVenue().getName());
            venueNode.put("address", updatedSchedule.getVenue().getAddress() != null ? updatedSchedule.getVenue().getAddress() : "");
            venueNode.put("city", updatedSchedule.getVenue().getCity() != null ? updatedSchedule.getVenue().getCity() : "");
            venueNode.put("state", updatedSchedule.getVenue().getState() != null ? updatedSchedule.getVenue().getState() : "");
            venueNode.put("country", updatedSchedule.getVenue().getCountry() != null ? updatedSchedule.getVenue().getCountry() : "");
            venueNode.put("capacity", updatedSchedule.getVenue().getCapacity());
            
            return new ResponseEntity<>(responseNode, HttpStatus.OK);
            
        } catch (Exception e) {
            System.err.println("Error updating schedule: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("Failed to update schedule: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> deleteShow(@PathVariable Long id, 
                                       @RequestParam(required = false, defaultValue = "false") boolean force,
                                       @RequestParam(required = false, defaultValue = "Show deleted by organizer") String reason) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            // Verify show exists and belongs to organizer or user is admin
            Optional<Show> showOpt = showService.getShowById(id);
            if (!showOpt.isPresent()) {
                return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
            }
            
            Show show = showOpt.get();
            boolean isAdmin = authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (!show.getCreatedBy().getId().equals(userDetails.getId()) && !isAdmin) {
                return new ResponseEntity<>("You can only delete your own shows", HttpStatus.FORBIDDEN);
            }

            // Check if show has active bookings
            boolean hasActiveBookings = showService.hasActiveBookings(id);
            int activeBookingsCount = showService.countActiveBookings(id);
            
            if (hasActiveBookings && !force) {
                // Return conflict response with booking information
                Map<String, Object> response = new HashMap<>();
                response.put("requiresConfirmation", true);
                response.put("activeBookingsCount", activeBookingsCount);
                response.put("message", "This show has " + activeBookingsCount + " active booking(s). " +
                           "Deleting it will cancel all bookings and process refunds. " +
                           "Are you sure you want to continue?");
                
                return new ResponseEntity<>(response, HttpStatus.CONFLICT);
            }

            // Process show cancellation (notifications and refunds) before deletion
            if (hasActiveBookings) {
                System.out.println("Processing cancellation for show with active bookings: " + show.getTitle());
                processShowCancellation(show, reason, userDetails.getId());
            }

            // Soft delete the show (marks as deleted but keeps in database)
            Show deletedShow = showService.softDeleteShow(id, reason);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Show '" + deletedShow.getTitle() + "' has been deleted successfully");
            response.put("processedBookings", activeBookingsCount);
            response.put("showId", id);
            response.put("deletedAt", LocalDateTime.now());
            
            return new ResponseEntity<>(response, HttpStatus.OK);
            
        } catch (Exception e) {
            System.err.println("Error deleting show: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("Failed to delete show: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @DeleteMapping("/{id}/schedules/{scheduleId}")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<?> deleteShowSchedule(@PathVariable Long id, @PathVariable Long scheduleId) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            // Verify show exists and belongs to organizer
            Optional<Show> showOpt = showService.getShowById(id);
            if (!showOpt.isPresent()) {
                return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
            }
            
            Show show = showOpt.get();
            if (!show.getCreatedBy().getId().equals(userDetails.getId())) {
                return new ResponseEntity<>("You can only delete schedules from your own shows", HttpStatus.FORBIDDEN);
            }

            // Verify schedule exists and belongs to this show
            Optional<ShowSchedule> scheduleOpt = showScheduleService.getShowScheduleById(scheduleId);
            if (!scheduleOpt.isPresent()) {
                return new ResponseEntity<>("Schedule not found", HttpStatus.NOT_FOUND);
            }
            
            ShowSchedule schedule = scheduleOpt.get();
            if (!schedule.getShow().getId().equals(id)) {
                return new ResponseEntity<>("Schedule does not belong to this show", HttpStatus.BAD_REQUEST);
            }

            // Delete the schedule
            showScheduleService.deleteShowSchedule(scheduleId);
            
            return new ResponseEntity<>("Schedule deleted successfully", HttpStatus.OK);
            
        } catch (Exception e) {
            System.err.println("Error deleting schedule: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("Failed to delete schedule: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Get all available show types with backward compatibility
     * @return List of show types
     */
    @GetMapping("/types")
    public ResponseEntity<List<String>> getShowTypes() {
        try {
            List<String> showTypes = showTypeService.getAllShowTypes();
            return new ResponseEntity<>(showTypes, HttpStatus.OK);
        } catch (Exception e) {
            System.err.println("Error fetching show types: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}