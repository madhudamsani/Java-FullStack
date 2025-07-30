package com.showvault.service;

import com.showvault.model.ShowSchedule;
import com.showvault.model.Venue;
import com.showvault.repository.ShowScheduleRepository;
import com.showvault.repository.SeatRepository;
import com.showvault.repository.VenueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class ShowScheduleService {

    private final ShowScheduleRepository showScheduleRepository;
    
    @Autowired
    private SeatRepository seatRepository;
    
    @Autowired
    private VenueRepository venueRepository;
    
    @Autowired
    private SeatManagementService seatManagementService;
    
    @Autowired
    private SeatConsistencyService seatConsistencyService;

    @Autowired
    public ShowScheduleService(ShowScheduleRepository showScheduleRepository) {
        this.showScheduleRepository = showScheduleRepository;
    }

    public List<ShowSchedule> getAllShowSchedules() {
        return showScheduleRepository.findAll();
    }

    public Optional<ShowSchedule> getShowScheduleById(Long id) {
        return showScheduleRepository.findById(id);
    }

    public List<ShowSchedule> getShowSchedulesByShowId(Long showId) {
        return showScheduleRepository.findByShowId(showId);
    }

    public List<ShowSchedule> getShowSchedulesByVenueId(Long venueId) {
        return showScheduleRepository.findByVenueId(venueId);
    }

    public List<ShowSchedule> getShowSchedulesByDateRange(LocalDate startDate, LocalDate endDate) {
        return showScheduleRepository.findByShowDateBetween(startDate, endDate);
    }

    public List<ShowSchedule> getUpcomingSchedulesByShowId(Long showId, LocalDate currentDate) {
        return showScheduleRepository.findUpcomingSchedulesByShowId(showId, currentDate);
    }

    public List<ShowSchedule> getUpcomingSchedulesByCity(String city, LocalDate currentDate) {
        return showScheduleRepository.findUpcomingSchedulesByCity(city, currentDate);
    }

    public List<ShowSchedule> getUpcomingSchedulesByGenre(String genre, LocalDate currentDate) {
        return showScheduleRepository.findUpcomingSchedulesByGenre(genre, currentDate);
    }

    @Transactional
    public ShowSchedule createShowSchedule(ShowSchedule showSchedule) {
        // Use the seat management service for validation and adjustment
        showSchedule = seatManagementService.validateAndAdjustScheduleSeats(showSchedule);
        ShowSchedule savedSchedule = showScheduleRepository.save(showSchedule);
        
        // Synchronize seat counts to ensure consistency
        seatConsistencyService.synchronizeSeatsForSchedule(savedSchedule.getId());
        
        // Return the updated schedule with synchronized seat counts
        return showScheduleRepository.findById(savedSchedule.getId()).orElse(savedSchedule);
    }

    @Transactional
    public ShowSchedule updateShowSchedule(ShowSchedule showSchedule) {
        // Get the original schedule to compare changes
        ShowSchedule originalSchedule = null;
        if (showSchedule.getId() != null) {
            originalSchedule = showScheduleRepository.findById(showSchedule.getId()).orElse(null);
        }
        
        // Use the seat management service for validation and adjustment
        showSchedule = seatManagementService.validateAndAdjustScheduleSeats(showSchedule);
        
        // Save the schedule first
        ShowSchedule savedSchedule = showScheduleRepository.save(showSchedule);
        
        // Log the seat changes for debugging
        System.out.println("Schedule update - ID: " + savedSchedule.getId());
        if (originalSchedule != null) {
            System.out.println("  Original total seats: " + originalSchedule.getTotalSeats());
            System.out.println("  Original available seats: " + originalSchedule.getSeatsAvailable());
        }
        System.out.println("  New total seats: " + savedSchedule.getTotalSeats());
        System.out.println("  New available seats: " + savedSchedule.getSeatsAvailable());
        
        // Always synchronize seat counts to ensure consistency
        ShowSchedule synchronizedSchedule = seatConsistencyService.synchronizeSeatsForSchedule(savedSchedule.getId());
        
        System.out.println("  After synchronization - total seats: " + synchronizedSchedule.getTotalSeats());
        System.out.println("  After synchronization - available seats: " + synchronizedSchedule.getSeatsAvailable());
        
        // Return the updated schedule with synchronized seat counts
        return synchronizedSchedule;
    }

    @Transactional
    public void deleteShowSchedule(Long id) {
        showScheduleRepository.deleteById(id);
    }

    @Transactional
    public boolean updateShowScheduleStatus(Long scheduleId, ShowSchedule.ScheduleStatus newStatus) {
        Optional<ShowSchedule> scheduleOpt = showScheduleRepository.findById(scheduleId);
        
        if (scheduleOpt.isPresent()) {
            ShowSchedule schedule = scheduleOpt.get();
            schedule.setStatus(newStatus);
            showScheduleRepository.save(schedule);
            return true;
        }
        
        return false;
    }

    public List<ShowSchedule> searchShowSchedules(Long showId, Long venueId, LocalDate fromDate, LocalDate toDate, ShowSchedule.ScheduleStatus status) {
        return showScheduleRepository.findByShowIdAndVenueIdAndShowDateBetweenAndStatus(
            showId,
            venueId,
            fromDate,
            toDate,
            status
        );
    }

    public List<ShowSchedule> getShowSchedulesByStatus(ShowSchedule.ScheduleStatus status) {
        return showScheduleRepository.findByStatus(status);
    }

    public List<ShowSchedule> getShowSchedulesByDate(LocalDate date) {
        return showScheduleRepository.findByShowDate(date);
    }

    public List<ShowSchedule> getUpcomingShowSchedules() {
        LocalDate currentDate = LocalDate.now();
        return showScheduleRepository.findByShowDateGreaterThanEqual(currentDate);
    }

    /**
     * Get schedules by venue and date for validation purposes
     */
    public List<ShowSchedule> getSchedulesByVenueAndDate(Long venueId, LocalDate date) {
        return showScheduleRepository.findByVenueIdAndShowDate(venueId, date);
    }
}