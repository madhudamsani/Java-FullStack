package com.showvault.service;

import com.showvault.model.Booking;
import com.showvault.model.BookingPayment;
import com.showvault.model.BookingStatus;
import com.showvault.model.Show;
import com.showvault.model.User;
import com.showvault.repository.BookingPaymentRepository;
import com.showvault.repository.BookingRepository;
import com.showvault.repository.ShowRepository;
import com.showvault.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ReportService {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final ShowRepository showRepository;
    private final BookingPaymentRepository paymentRepository;

    @Autowired
    public ReportService(UserRepository userRepository,
                         BookingRepository bookingRepository,
                         ShowRepository showRepository,
                         BookingPaymentRepository paymentRepository) {
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
        this.showRepository = showRepository;
        this.paymentRepository = paymentRepository;
    }

    /**
     * Get dashboard statistics for admin overview
     * @return Map containing various statistics
     */
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        
        // User statistics
        long totalUsers = userRepository.count();
        LocalDateTime monthStart = LocalDateTime.of(LocalDate.now().withDayOfMonth(1), LocalTime.MIN);
        long newUsers = userRepository.countByCreatedAtAfter(monthStart);
        
        // Show statistics
        long totalShows = showRepository.count();
        long activeShows = showRepository.countByStatus(Show.ShowStatus.ONGOING);
        long upcomingShows = showRepository.countByStatus(Show.ShowStatus.UPCOMING);
        
        // Booking statistics
        long totalBookings = bookingRepository.count();
        long confirmedBookings = bookingRepository.countByStatus(BookingStatus.CONFIRMED);
        long bookingsThisMonth = bookingRepository.countByBookingDateAfter(monthStart);
        
        // Revenue statistics
        Double totalRevenue = paymentRepository.getTotalRevenueForPeriod(
                LocalDateTime.of(LocalDate.now().minusYears(100), LocalTime.MIN),
                LocalDateTime.now());
        if (totalRevenue == null) totalRevenue = 0.0;
        
        // Recent activity
        List<Booking> recentBookings = bookingRepository.findTop10ByOrderByCreatedAtDesc();
        
        // Populate the stats map
        stats.put("totalUsers", totalUsers);
        stats.put("newUsers", newUsers);
        stats.put("totalShows", totalShows);
        stats.put("activeShows", activeShows);
        stats.put("upcomingShows", upcomingShows);
        stats.put("totalBookings", totalBookings);
        stats.put("confirmedBookings", confirmedBookings);
        stats.put("bookingsThisMonth", bookingsThisMonth);
        stats.put("totalRevenue", totalRevenue);
        stats.put("recentActivity", recentBookings);
        
        return stats;
    }

    /**
     * Get user statistics report
     * @return Map containing user statistics
     */
    public Map<String, Object> getUserReport() {
        Map<String, Object> report = new HashMap<>();
        
        // Total users
        long totalUsers = userRepository.count();
        
        // Active users
        long activeUsers = userRepository.countByActive(true);
        
        // Users by role
        long adminUsers = userRepository.countUsersByRoleName("ROLE_ADMIN");
        long organizerUsers = userRepository.countUsersByRoleName("ROLE_ORGANIZER");
        long regularUsers = userRepository.countUsersByRoleName("ROLE_USER");
        
        // New users over time
        LocalDateTime lastMonth = LocalDateTime.now().minusMonths(1);
        LocalDateTime lastWeek = LocalDateTime.now().minusWeeks(1);
        long newUsersLastMonth = userRepository.countByCreatedAtAfter(lastMonth);
        long newUsersLastWeek = userRepository.countByCreatedAtAfter(lastWeek);
        
        // Populate the report map
        report.put("totalUsers", totalUsers);
        report.put("activeUsers", activeUsers);
        report.put("inactiveUsers", totalUsers - activeUsers);
        report.put("adminUsers", adminUsers);
        report.put("organizerUsers", organizerUsers);
        report.put("regularUsers", regularUsers);
        report.put("newUsersLastMonth", newUsersLastMonth);
        report.put("newUsersLastWeek", newUsersLastWeek);
        
        return report;
    }

    /**
     * Get sales statistics report
     * @param startDate Start date for the report period
     * @param endDate End date for the report period
     * @return Map containing sales statistics
     */
    public Map<String, Object> getSalesReport(LocalDateTime startDate, LocalDateTime endDate) {
        Map<String, Object> report = new HashMap<>();
        
        // Total bookings in period
        long totalBookings = bookingRepository.countByBookingDateBetween(startDate, endDate);
        
        // Bookings by status
        long confirmedBookings = bookingRepository.countByStatusAndBookingDateBetween(
                BookingStatus.CONFIRMED, startDate, endDate);
        long cancelledBookings = bookingRepository.countByStatusAndBookingDateBetween(
                BookingStatus.CANCELLED, startDate, endDate);
        long pendingBookings = bookingRepository.countByStatusAndBookingDateBetween(
                BookingStatus.PENDING, startDate, endDate);
        
        // Revenue in period
        Double totalRevenue = paymentRepository.getTotalRevenueForPeriod(startDate, endDate);
        if (totalRevenue == null) totalRevenue = 0.0;
        
        // Top shows by bookings
        List<Object[]> topShows = bookingRepository.findTopShowsByBookingCount(startDate, endDate, 5);
        
        // Populate the report map
        report.put("totalBookings", totalBookings);
        report.put("confirmedBookings", confirmedBookings);
        report.put("cancelledBookings", cancelledBookings);
        report.put("pendingBookings", pendingBookings);
        report.put("totalRevenue", totalRevenue);
        report.put("topShows", topShows);
        report.put("startDate", startDate);
        report.put("endDate", endDate);
        
        return report;
    }

    /**
     * Get show performance report for a specific show
     * @param showId ID of the show
     * @return Map containing show performance statistics
     */
    public Map<String, Object> getShowPerformanceReport(Long showId) {
        Map<String, Object> report = new HashMap<>();
        
        // Get the show
        Show show = showRepository.findById(showId).orElse(null);
        if (show == null) {
            return report;
        }
        
        // Total bookings for this show
        long totalBookings = bookingRepository.countByShowId(showId);
        
        // Bookings by status
        long confirmedBookings = bookingRepository.countByStatusAndShowId(
                BookingStatus.CONFIRMED, showId);
        long cancelledBookings = bookingRepository.countByStatusAndShowId(
                BookingStatus.CANCELLED, showId);
        
        // Revenue for this show
        Double totalRevenue = bookingRepository.getTotalRevenueByShowId(showId);
        if (totalRevenue == null) totalRevenue = 0.0;
        
        // Bookings by schedule
        List<Object[]> bookingsBySchedule = bookingRepository.findBookingCountBySchedule(showId);
        
        // Unique viewers count
        Long uniqueViewers = showRepository.countUniqueViewersByShowId(showId);
        if (uniqueViewers == null) uniqueViewers = 0L;
        
        // Populate the report map
        report.put("show", show);
        report.put("totalBookings", totalBookings);
        report.put("confirmedBookings", confirmedBookings);
        report.put("cancelledBookings", cancelledBookings);
        report.put("totalRevenue", totalRevenue);
        report.put("bookingsBySchedule", bookingsBySchedule);
        report.put("uniqueViewers", uniqueViewers);
        
        return report;
    }
    
    /**
     * Get trending shows based on recent bookings
     * @param days Number of days to look back for trending analysis
     * @param limit Maximum number of shows to return
     * @return Map containing trending shows data
     */
    public Map<String, Object> getTrendingShowsReport(int days, int limit) {
        Map<String, Object> report = new HashMap<>();
        
        LocalDateTime endDate = LocalDateTime.now();
        LocalDateTime startDate = endDate.minusDays(days);
        
        // Get trending shows by booking count
        List<Show> trendingShows = showRepository.findTrendingShowsByBookingCount(startDate, endDate, limit);
        
        // Populate the report map
        report.put("trendingShows", trendingShows);
        report.put("periodDays", days);
        report.put("startDate", startDate);
        report.put("endDate", endDate);
        
        return report;
    }
    
    /**
     * Get top revenue-generating shows
     * @param days Number of days to look back for revenue analysis
     * @param limit Maximum number of shows to return
     * @return Map containing top revenue shows data
     */
    public Map<String, Object> getTopRevenueShowsReport(int days, int limit) {
        Map<String, Object> report = new HashMap<>();
        
        LocalDateTime endDate = LocalDateTime.now();
        LocalDateTime startDate = endDate.minusDays(days);
        
        // Get top shows by revenue
        List<Show> topRevenueShows = showRepository.findTopShowsByRevenue(startDate, endDate, limit);
        
        // Populate the report map
        report.put("topRevenueShows", topRevenueShows);
        report.put("periodDays", days);
        report.put("startDate", startDate);
        report.put("endDate", endDate);
        
        return report;
    }
}