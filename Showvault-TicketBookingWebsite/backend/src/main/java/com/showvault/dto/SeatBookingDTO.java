package com.showvault.dto;

import com.showvault.model.SeatBooking;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
public class SeatBookingDTO {
    private Long id;
    private Long bookingId;
    private SeatDTO seat;
    private BigDecimal price;
    
    public SeatBookingDTO(SeatBooking seatBooking) {
        this.id = seatBooking.getId();
        this.bookingId = seatBooking.getBooking() != null ? seatBooking.getBooking().getId() : null;
        this.seat = seatBooking.getSeat() != null ? new SeatDTO(seatBooking.getSeat()) : null;
        this.price = seatBooking.getPrice();
    }
}