package com.showvault.service.impl;

import com.showvault.model.Seat;
import com.showvault.model.SeatReservation;
import com.showvault.model.ShowSchedule;
import com.showvault.model.User;
import com.showvault.repository.SeatReservationRepository;
import com.showvault.service.SeatConsistencyService;
import com.showvault.service.SeatReservationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SeatReservationServiceImpl implements SeatReservationService {

    private final SeatReservationRepository seatReservationRepository;
    private final SeatConsistencyService seatConsistencyService;

    @Autowired
    public SeatReservationServiceImpl(
            SeatReservationRepository seatReservationRepository,
            SeatConsistencyService seatConsistencyService) {
        this.seatReservationRepository = seatReservationRepository;
        this.seatConsistencyService = seatConsistencyService;
    }

    @Override
    @Transactional
    public List<SeatReservation> reserveSeats(List<Seat> seats, ShowSchedule showSchedule, User user,
                                             String sessionId, int reservationTimeMinutes) {
        System.out.println("Reserving " + seats.size() + " seats for user ID: " + user.getId() + 
                          ", session ID: " + sessionId + ", schedule ID: " + showSchedule.getId());
        
        // Check if any of the seats are already reserved
        List<Long> seatIds = seats.stream().map(Seat::getId).collect(Collectors.toList());
        List<SeatReservation> existingReservations = new ArrayList<>();
        
        for (Long seatId : seatIds) {
            List<SeatReservation> reservations = seatReservationRepository.findBySeatIdAndShowScheduleId(seatId, showSchedule.getId());
            existingReservations.addAll(reservations.stream()
                .filter(r -> !r.isExpired())
                .collect(Collectors.toList()));
        }
        
        if (!existingReservations.isEmpty()) {
            System.out.println("Some seats are already reserved: " + 
                              existingReservations.stream()
                                  .map(r -> r.getSeat().getId().toString())
                                  .collect(Collectors.joining(", ")));
            
            // Filter out already reserved seats
            seats = seats.stream()
                .filter(seat -> existingReservations.stream()
                    .noneMatch(r -> r.getSeat().getId().equals(seat.getId())))
                .collect(Collectors.toList());
            
            System.out.println("Proceeding with reservation of " + seats.size() + " available seats");
        }
        
        // Create reservations for available seats
        List<SeatReservation> reservations = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusMinutes(reservationTimeMinutes);
        
        for (Seat seat : seats) {
            SeatReservation reservation = new SeatReservation();
            reservation.setSeat(seat);
            reservation.setShowSchedule(showSchedule);
            reservation.setUser(user);
            reservation.setSessionId(sessionId);
            reservation.setCreatedAt(now);
            reservation.setExpiresAt(expiresAt);
            
            reservations.add(seatReservationRepository.save(reservation));
            System.out.println("Created reservation for seat ID: " + seat.getId() + 
                              ", expires at: " + expiresAt);
        }
        
        // Synchronize seat counts to ensure consistency
        try {
            System.out.println("Synchronizing seat counts after seat reservation for schedule ID: " + showSchedule.getId());
            seatConsistencyService.synchronizeSeatsForSchedule(showSchedule.getId());
        } catch (Exception e) {
            System.out.println("Error during post-reservation synchronization: " + e.getMessage());
        }
        
        return reservations;
    }

    @Override
    public List<SeatReservation> getActiveReservations(Long showScheduleId) {
        List<SeatReservation> allReservations = seatReservationRepository.findByShowScheduleId(showScheduleId);
        LocalDateTime now = LocalDateTime.now();
        
        // Filter out expired reservations
        return allReservations.stream()
            .filter(r -> r.getExpiresAt().isAfter(now))
            .collect(Collectors.toList());
    }

    @Override
    public boolean isSeatReserved(Long seatId, Long showScheduleId) {
        List<SeatReservation> reservations = seatReservationRepository.findBySeatIdAndShowScheduleId(seatId, showScheduleId);
        LocalDateTime now = LocalDateTime.now();
        
        // Check if there are any active reservations
        return reservations.stream()
            .anyMatch(r -> r.getExpiresAt().isAfter(now));
    }

    @Override
    @Transactional
    public void releaseReservations(String sessionId) {
        System.out.println("Releasing reservations for session ID: " + sessionId);
        
        // Get affected show schedules before deleting reservations
        List<Long> affectedScheduleIds = seatReservationRepository.findBySessionId(sessionId)
            .stream()
            .map(reservation -> reservation.getShowSchedule().getId())
            .distinct()
            .collect(Collectors.toList());
        
        // Delete the reservations
        seatReservationRepository.deleteBySessionId(sessionId);
        
        // Synchronize seat counts for all affected schedules
        for (Long scheduleId : affectedScheduleIds) {
            try {
                System.out.println("Synchronizing seat counts after reservation release for schedule ID: " + scheduleId);
                seatConsistencyService.synchronizeSeatsForSchedule(scheduleId);
            } catch (Exception e) {
                System.out.println("Error during post-release synchronization for schedule ID " + scheduleId + ": " + e.getMessage());
            }
        }
    }

    @Override
    @Transactional
    @Scheduled(fixedRate = 60000) // Run every minute
    public void cleanupExpiredReservations() {
        System.out.println("Cleaning up expired seat reservations");
        LocalDateTime now = LocalDateTime.now();
        
        // Get affected show schedules before deleting reservations
        List<Long> affectedScheduleIds = seatReservationRepository.findByExpiresAtBefore(now)
            .stream()
            .map(reservation -> reservation.getShowSchedule().getId())
            .distinct()
            .collect(Collectors.toList());
        
        // Delete expired reservations
        int deletedCount = seatReservationRepository.deleteExpiredReservations(now);
        System.out.println("Deleted " + deletedCount + " expired reservations");
        
        // Synchronize seat counts for all affected schedules
        for (Long scheduleId : affectedScheduleIds) {
            try {
                System.out.println("Synchronizing seat counts after expired reservation cleanup for schedule ID: " + scheduleId);
                seatConsistencyService.synchronizeSeatsForSchedule(scheduleId);
            } catch (Exception e) {
                System.out.println("Error during post-cleanup synchronization for schedule ID " + scheduleId + ": " + e.getMessage());
            }
        }
    }
}