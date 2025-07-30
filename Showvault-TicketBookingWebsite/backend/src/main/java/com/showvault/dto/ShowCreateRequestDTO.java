package com.showvault.dto;

import com.showvault.model.Show.ShowStatus;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
public class ShowCreateRequestDTO {
    // Show fields
    private String title;
    private String description;
    private String type;
    private Integer duration;
    private String genre;
    private String language;
    private String posterUrl;
    private String trailerUrl;
    private ShowStatus status;
    
    // Schedule fields (for backward compatibility and single schedule creation)
    private String venue;
    private String date;
    private String time;
    private BigDecimal price;
    private Integer totalSeats;
    private Integer availableSeats;
    
    // Schedules array (for multiple schedules)
    private List<ScheduleCreateDTO> schedules;
    
    @Data
    @NoArgsConstructor
    public static class ScheduleCreateDTO {
        private VenueDTO venue;
        private Long venueId; // Add support for venue ID
        private String showDate;
        private String showTime;
        private BigDecimal basePrice;
        private Integer totalSeats;
        private Integer availableSeats;
        private Long showId;
        private String status;
    }
    
    @Data
    @NoArgsConstructor
    public static class VenueDTO {
        private Long id;
        private String name;
        private String address;
        private String city;
        private String state;
        private String country;
        private Integer capacity;
        private String[] amenities = new String[0]; // Default to empty array
        private String imageUrl;
        private String image;
    }
}