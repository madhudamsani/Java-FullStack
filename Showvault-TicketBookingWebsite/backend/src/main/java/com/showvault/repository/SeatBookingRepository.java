package com.showvault.repository;

import com.showvault.model.SeatBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeatBookingRepository extends JpaRepository<SeatBooking, Long> {
    
    List<SeatBooking> findByBookingId(Long bookingId);
    
    List<SeatBooking> findBySeatId(Long seatId);
    
    @Query("SELECT sb FROM SeatBooking sb WHERE sb.booking.showSchedule.id = ?1")
    List<SeatBooking> findByShowScheduleId(Long showScheduleId);
    
    @Query("SELECT sb FROM SeatBooking sb WHERE sb.booking.showSchedule.id = ?1 AND sb.booking.status = 'CONFIRMED'")
    List<SeatBooking> findConfirmedSeatBookingsByShowScheduleId(Long showScheduleId);
    
    @Query("SELECT sb FROM SeatBooking sb WHERE sb.seat.venue.id = ?1 AND sb.booking.showSchedule.id = ?2 AND sb.booking.status = 'CONFIRMED'")
    List<SeatBooking> findBookedSeatsByVenueAndShowSchedule(Long venueId, Long showScheduleId);
    
    boolean existsByBookingIdAndSeatId(Long bookingId, Long seatId);
}