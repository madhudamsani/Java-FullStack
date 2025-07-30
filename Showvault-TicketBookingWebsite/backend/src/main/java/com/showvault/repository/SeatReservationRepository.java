package com.showvault.repository;

import com.showvault.model.SeatReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SeatReservationRepository extends JpaRepository<SeatReservation, Long> {
    
    /**
     * Find all reservations for a specific show schedule
     */
    List<SeatReservation> findByShowScheduleId(Long showScheduleId);
    
    /**
     * Find all reservations for a specific user
     */
    List<SeatReservation> findByUserId(Long userId);
    
    /**
     * Find all reservations for a specific session
     */
    List<SeatReservation> findBySessionId(String sessionId);
    
    /**
     * Find all reservations for a specific seat and show schedule
     */
    List<SeatReservation> findBySeatIdAndShowScheduleId(Long seatId, Long showScheduleId);
    
    /**
     * Find all expired reservations
     */
    List<SeatReservation> findByExpiresAtBefore(LocalDateTime now);
    
    /**
     * Find all reservations that expire before a given time
     */
    List<SeatReservation> findByExpiresAtLessThan(LocalDateTime now);
    
    /**
     * Delete all expired reservations
     * @return The number of deleted reservations
     */
    @Modifying
    @Query("DELETE FROM SeatReservation sr WHERE sr.expiresAt < ?1")
    int deleteExpiredReservations(LocalDateTime now);
    
    /**
     * Delete all reservations for a specific session
     */
    @Modifying
    void deleteBySessionId(String sessionId);
}