package com.showvault.service;

import com.showvault.model.Seat;
import com.showvault.model.SeatReservation;
import com.showvault.model.ShowSchedule;
import com.showvault.model.User;

import java.util.List;

/**
 * Service for managing temporary seat reservations during the booking process
 */
public interface SeatReservationService {
    
    /**
     * Reserve seats for a user during the booking process
     * 
     * @param seats The seats to reserve
     * @param showSchedule The show schedule
     * @param user The user making the reservation
     * @param sessionId The session ID for tracking the reservation
     * @param reservationTimeMinutes How long the reservation should last in minutes
     * @return The created seat reservations
     */
    List<SeatReservation> reserveSeats(List<Seat> seats, ShowSchedule showSchedule, User user, 
                                      String sessionId, int reservationTimeMinutes);
    
    /**
     * Get all active reservations for a show schedule
     * 
     * @param showScheduleId The show schedule ID
     * @return List of active reservations
     */
    List<SeatReservation> getActiveReservations(Long showScheduleId);
    
    /**
     * Check if a seat is currently reserved
     * 
     * @param seatId The seat ID
     * @param showScheduleId The show schedule ID
     * @return true if the seat is reserved
     */
    boolean isSeatReserved(Long seatId, Long showScheduleId);
    
    /**
     * Release all reservations for a session
     * 
     * @param sessionId The session ID
     */
    void releaseReservations(String sessionId);
    
    /**
     * Clean up expired reservations
     */
    void cleanupExpiredReservations();
}