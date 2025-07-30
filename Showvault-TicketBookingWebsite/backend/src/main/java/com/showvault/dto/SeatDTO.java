package com.showvault.dto;

import com.showvault.model.Seat;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
public class SeatDTO {
    private Long id;
    private Long venueId;
    private String venueName;
    private String rowName;
    private Integer seatNumber;
    private Seat.SeatCategory category;
    private BigDecimal priceMultiplier;
    
    public SeatDTO(Seat seat) {
        this.id = seat.getId();
        this.venueId = seat.getVenue() != null ? seat.getVenue().getId() : null;
        this.venueName = seat.getVenue() != null ? seat.getVenue().getName() : null;
        this.rowName = seat.getRowName();
        this.seatNumber = seat.getSeatNumber();
        this.category = seat.getCategory();
        this.priceMultiplier = seat.getPriceMultiplier();
    }
}