package com.showvault.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SeatMapDTO {
    private List<SeatRowDTO> rows = new ArrayList<>();
    private String screen = "SCREEN";
    private Map<String, String> legend = new HashMap<>();
    private Map<String, Object> metadata = new HashMap<>();
    
    public SeatMapDTO(String screen) {
        this.screen = screen;
        this.legend.put("available", "Available");
        this.legend.put("reserved", "Reserved");
        this.legend.put("sold", "Sold");
        this.legend.put("selected", "Selected");
        this.legend.put("standard", "Standard");
        this.legend.put("premium", "Premium");
        this.legend.put("vip", "VIP");
        
        // Initialize metadata
        this.metadata.put("totalSeats", 0);
        this.metadata.put("totalRows", 0);
        this.metadata.put("maxSeatsPerRow", 0);
        this.metadata.put("rowLengths", new HashMap<String, Integer>());
    }
    
    /**
     * Creates a seat map with error information
     * 
     * @param errorMessage The error message
     * @param showId The show ID
     * @param scheduleId The schedule ID
     * @return A seat map with error information
     */
    public static SeatMapDTO createErrorSeatMap(String errorMessage, Long showId, Long scheduleId) {
        SeatMapDTO errorMap = new SeatMapDTO("SCREEN");
        errorMap.getMetadata().put("error", errorMessage);
        errorMap.getMetadata().put("showId", showId);
        errorMap.getMetadata().put("scheduleId", scheduleId);
        return errorMap;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatRowDTO {
        private String rowLabel;
        private List<SeatDTO> seats = new ArrayList<>();
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatDTO {
        private Long id;
        private Integer seatNumber;
        private String status; // AVAILABLE, RESERVED, SOLD
        private BigDecimal price;
        private String category; // STANDARD, PREMIUM, VIP
    }
}