package com.showvault.repository;

import com.showvault.model.Booking;
import com.showvault.model.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    
    @Query("SELECT b FROM Booking b JOIN FETCH b.user u JOIN FETCH b.showSchedule ss JOIN FETCH ss.show s JOIN FETCH ss.venue v WHERE b.id = :id")
    Optional<Booking> findBookingWithDetailsById(@Param("id") Long id);
    
    Optional<Booking> findByBookingNumber(String bookingNumber);
    
    @Query("SELECT b FROM Booking b JOIN FETCH b.user u JOIN FETCH b.showSchedule ss JOIN FETCH ss.show s JOIN FETCH ss.venue v LEFT JOIN FETCH b.seatBookings sb LEFT JOIN FETCH sb.seat seat WHERE b.bookingNumber = :bookingNumber")
    Optional<Booking> findByBookingNumberWithDetails(@Param("bookingNumber") String bookingNumber);
    
    @Query("SELECT b FROM Booking b JOIN FETCH b.user u JOIN FETCH b.showSchedule ss JOIN FETCH ss.show s WHERE u.id = :userId")
    List<Booking> findByUserId(@Param("userId") Long userId);
    
    List<Booking> findByShowScheduleId(Long showScheduleId);
    
    List<Booking> findByShowSchedule(com.showvault.model.ShowSchedule showSchedule);
    
    List<Booking> findByStatus(BookingStatus status);
    
    @Query("SELECT b FROM Booking b WHERE b.user.id = ?1 AND b.bookingDate >= ?2")
    List<Booking> findRecentBookingsByUserId(Long userId, LocalDateTime fromDate);
    
    @Query("SELECT b FROM Booking b WHERE b.showSchedule.show.id = ?1")
    List<Booking> findBookingsByShowId(Long showId);
    
    @Query("SELECT COUNT(b) FROM Booking b WHERE b.showSchedule.id = ?1 AND b.status = 'CONFIRMED'")
    Long countConfirmedBookingsByShowScheduleId(Long showScheduleId);
    
    // Additional methods for reporting
    long countByBookingDateBetween(LocalDateTime startDate, LocalDateTime endDate);
    
    long countByStatusAndBookingDateBetween(BookingStatus status, LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT s.id, s.title, COUNT(b) FROM Booking b JOIN b.showSchedule ss JOIN ss.show s " +
           "WHERE b.bookingDate BETWEEN ?1 AND ?2 GROUP BY s.id, s.title ORDER BY COUNT(b) DESC")
    List<Object[]> findTopShowsByBookingCount(LocalDateTime startDate, LocalDateTime endDate, int limit);
    
    @Query("SELECT COUNT(b) FROM Booking b WHERE b.showSchedule.show.id = ?1")
    long countByShowId(Long showId);
    
    @Query("SELECT COUNT(b) FROM Booking b WHERE b.status = ?1 AND b.showSchedule.show.id = ?2")
    long countByStatusAndShowId(BookingStatus status, Long showId);
    
    @Query("SELECT SUM(b.totalAmount) FROM Booking b WHERE b.showSchedule.show.id = ?1 AND b.status = 'CONFIRMED'")
    Double getTotalRevenueByShowId(Long showId);
    
    @Query("SELECT ss.id, ss.showDate, ss.startTime, COUNT(b) FROM Booking b JOIN b.showSchedule ss " +
           "WHERE ss.show.id = ?1 GROUP BY ss.id, ss.showDate, ss.startTime")
    List<Object[]> findBookingCountBySchedule(Long showId);
    
    List<Booking> findTop10ByOrderByCreatedAtDesc();
    
    long countByStatus(BookingStatus status);
    
    long countByBookingDateAfter(LocalDateTime date);
    
    // Additional methods for admin dashboard
    @Query("SELECT b FROM Booking b WHERE " +
           "(:status IS NULL OR b.status = :status) AND " +
           "(:date IS NULL OR CAST(b.bookingDate AS LocalDate) = :date) " +
           "ORDER BY b.bookingDate DESC")
    List<Booking> findBookingsWithFilters(BookingStatus status, LocalDate date);
    
    @Query("SELECT COUNT(b) FROM Booking b WHERE " +
           "(:status IS NULL OR b.status = :status) AND " +
           "(:date IS NULL OR CAST(b.bookingDate AS LocalDate) = :date)")
    long countBookingsWithFilters(BookingStatus status, LocalDate date);
}