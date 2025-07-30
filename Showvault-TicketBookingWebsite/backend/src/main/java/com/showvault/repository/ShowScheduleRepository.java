package com.showvault.repository;

import com.showvault.model.ShowSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ShowScheduleRepository extends JpaRepository<ShowSchedule, Long> {
    
    List<ShowSchedule> findByShowId(Long showId);
    
    List<ShowSchedule> findByVenueId(Long venueId);
    
    long countByVenueId(Long venueId);
    
    List<ShowSchedule> findByShowDateBetween(LocalDate startDate, LocalDate endDate);
    
    @Query("SELECT ss FROM ShowSchedule ss WHERE ss.show.id = ?1 AND ss.showDate >= ?2")
    List<ShowSchedule> findUpcomingSchedulesByShowId(Long showId, LocalDate currentDate);
    
    @Query("SELECT ss FROM ShowSchedule ss WHERE ss.venue.city = ?1 AND ss.showDate >= ?2")
    List<ShowSchedule> findUpcomingSchedulesByCity(String city, LocalDate currentDate);
    
    @Query("SELECT ss FROM ShowSchedule ss WHERE ss.show.genre = ?1 AND ss.showDate >= ?2")
    List<ShowSchedule> findUpcomingSchedulesByGenre(String genre, LocalDate currentDate);
    
    List<ShowSchedule> findByShowDateGreaterThanEqual(LocalDate date);
    
    List<ShowSchedule> findByStatus(ShowSchedule.ScheduleStatus status);
    
    List<ShowSchedule> findByShowDate(LocalDate date);
    
    @Query("SELECT ss FROM ShowSchedule ss WHERE " +
           "(?1 IS NULL OR ss.show.id = ?1) AND " +
           "(?2 IS NULL OR ss.venue.id = ?2) AND " +
           "(?3 IS NULL OR ss.showDate >= ?3) AND " +
           "(?4 IS NULL OR ss.showDate <= ?4) AND " +
           "(?5 IS NULL OR ss.status = ?5)")
    List<ShowSchedule> findByShowIdAndVenueIdAndShowDateBetweenAndStatus(
        Long showId,
        Long venueId,
        LocalDate fromDate,
        LocalDate toDate,
        ShowSchedule.ScheduleStatus status
    );
    
    /**
     * Find schedules by venue and date for validation purposes
     */
    List<ShowSchedule> findByVenueIdAndShowDate(Long venueId, LocalDate showDate);
}