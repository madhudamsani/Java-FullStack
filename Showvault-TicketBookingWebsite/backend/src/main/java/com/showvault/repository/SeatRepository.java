package com.showvault.repository;

import com.showvault.model.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {
    
    List<Seat> findByVenueId(Long venueId);
    
    List<Seat> findByVenueIdAndCategory(Long venueId, Seat.SeatCategory category);
    
    long countByVenueIdAndCategory(Long venueId, Seat.SeatCategory category);
    
    @Query("SELECT s FROM Seat s WHERE s.venue.id = ?1 AND s.rowName = ?2")
    List<Seat> findByVenueIdAndRowName(Long venueId, String rowName);
    
    @Query("SELECT DISTINCT s.rowName FROM Seat s WHERE s.venue.id = ?1 ORDER BY s.rowName")
    List<String> findAllRowsByVenueId(Long venueId);
    
    @Query("SELECT s FROM Seat s WHERE s.venue.id = ?1 AND s.id NOT IN "
           + "(SELECT sb.seat.id FROM SeatBooking sb WHERE sb.booking.showSchedule.id = ?2) "
           + "AND s.id NOT IN "
           + "(SELECT sr.seat.id FROM SeatReservation sr WHERE sr.showSchedule.id = ?2 AND sr.expiresAt > CURRENT_TIMESTAMP)")
    List<Seat> findAvailableSeatsByVenueAndShowSchedule(Long venueId, Long showScheduleId);
    
    // Get all seats for a venue with pagination to handle large venues
    @Query("SELECT s FROM Seat s WHERE s.venue.id = ?1")
    List<Seat> findAllByVenueIdWithPagination(Long venueId, org.springframework.data.domain.Pageable pageable);
    
    // Count the total number of seats for a venue
    @Query("SELECT COUNT(s) FROM Seat s WHERE s.venue.id = ?1")
    Long countSeatsByVenueId(Long venueId);
    
    // Get the venue capacity
    @Query("SELECT v.capacity FROM Venue v WHERE v.id = ?1")
    Optional<Integer> findVenueCapacity(Long venueId);
    
    // Count booked seats for a schedule
    @Query("SELECT COUNT(sb) FROM SeatBooking sb " +
           "JOIN sb.booking b " +
           "WHERE b.showSchedule.id = ?1 " +
           "AND b.status NOT IN ('CANCELLED', 'EXPIRED', 'REFUNDED')")
    int countBookedSeatsByScheduleId(Long scheduleId);
    
    // Count reserved seats for a schedule
    @Query("SELECT COUNT(sr) FROM SeatReservation sr " +
           "WHERE sr.showSchedule.id = ?1 " +
           "AND sr.expiresAt > CURRENT_TIMESTAMP")
    int countReservedSeatsByScheduleId(Long scheduleId);
}