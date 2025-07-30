package com.showvault.service;

import com.showvault.model.Booking;
import com.showvault.model.BookingStatus;
import com.showvault.model.Seat;
import com.showvault.model.ShowSchedule;
import com.showvault.model.User;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BookingService {

    List<Booking> getAllBookings();

    Optional<Booking> getBookingById(Long id);

    Optional<Booking> getBookingByNumber(String bookingNumber);

    List<Booking> getBookingsByUserId(Long userId);

    List<Booking> getBookingsByShowScheduleId(Long showScheduleId);

    List<Booking> getBookingsByStatus(BookingStatus status);

    List<Booking> getRecentBookingsByUserId(Long userId, LocalDateTime fromDate);

    List<Booking> getBookingsByShowId(Long showId);

    Long countConfirmedBookingsByShowScheduleId(Long showScheduleId);

    Booking createBooking(User user, ShowSchedule showSchedule, List<Seat> seats);
    
    Booking createBooking(User user, ShowSchedule showSchedule, List<Seat> seats, java.math.BigDecimal totalAmount);
    
    Booking createBookingWithPromotion(User user, ShowSchedule showSchedule, List<Seat> seats, 
                                     java.math.BigDecimal totalAmount, String promotionCode);

    Optional<Booking> updateBookingStatus(Long bookingId, BookingStatus newStatus);

    void deleteBooking(Long id);
    
    /**
     * Get bookings with pagination and filters for admin dashboard
     * @param offset Pagination offset
     * @param limit Pagination limit
     * @param status Booking status filter
     * @param date Booking date filter
     * @return List of bookings
     */
    List<Booking> getBookingsWithFilters(int offset, int limit, String status, LocalDate date);
    
    /**
     * Count bookings with filters for admin dashboard
     * @param status Booking status filter
     * @param date Booking date filter
     * @return Total count of matching bookings
     */
    long countBookingsWithFilters(String status, LocalDate date);
    
    /**
     * Process refund for a booking
     * @param bookingId Booking ID
     * @return Updated booking if successful, empty optional otherwise
     */
    Optional<Booking> processRefund(Long bookingId);
}