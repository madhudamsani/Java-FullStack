package com.showvault.service.impl;

import com.showvault.repository.ReportRepository;
import com.showvault.service.AdminReportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AdminReportServiceImpl implements AdminReportService {
    
    private static final Logger logger = LoggerFactory.getLogger(AdminReportServiceImpl.class);

    @Autowired(required = false)
    private DataSource dataSource;
    
    @Autowired(required = false)
    private ReportRepository reportRepository;

    @Override
    public Map<String, Object> getSalesReport() {
        // Default to last 30 days
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(30);
        return getSalesReport(startDate, endDate);
    }

    @Override
    public Map<String, Object> getSalesReport(LocalDate startDate, LocalDate endDate) {
        Map<String, Object> report = new HashMap<>();
        
        try {
            if (reportRepository != null) {
                // Use real data from database
                logger.info("Fetching sales report data from database for period: {} to {}", startDate, endDate);
                
                Double totalRevenue = reportRepository.getTotalRevenue(startDate, endDate);
                report.put("totalRevenue", totalRevenue != null ? totalRevenue : 0.0);
                
                int ticketsSold = reportRepository.getTicketsSold(startDate, endDate);
                report.put("ticketsSold", ticketsSold);
                
                // Calculate average ticket price
                double averageTicketPrice = ticketsSold > 0 ? (Double) report.get("totalRevenue") / ticketsSold : 0;
                report.put("averageTicketPrice", averageTicketPrice);
                
                // Get revenue by show
                List<Map<String, Object>> revenueByShow = reportRepository.getRevenueByShow(startDate, endDate);
                report.put("revenueByShow", revenueByShow);
                
                // Get revenue by month
                List<Map<String, Object>> revenueByMonthList = reportRepository.getRevenueByMonth(startDate, endDate);
                report.put("revenueByMonth", revenueByMonthList);
                
                // Calculate max monthly revenue
                double maxMonthlyRevenue = 0.0;
                for (Map<String, Object> monthData : revenueByMonthList) {
                    double revenue = ((Number) monthData.get("revenue")).doubleValue();
                    if (revenue > maxMonthlyRevenue) {
                        maxMonthlyRevenue = revenue;
                    }
                }
                report.put("maxMonthlyRevenue", maxMonthlyRevenue);
                
                // Get top selling shows
                List<Map<String, Object>> topSellingShows = reportRepository.getTopSellingShows(startDate, endDate);
                report.put("topSellingShows", topSellingShows);
                
                // Determine revenue trend (simple algorithm)
                if (revenueByMonthList.size() >= 2) {
                    double firstMonth = ((Number) revenueByMonthList.get(0).get("revenue")).doubleValue();
                    double lastMonth = ((Number) revenueByMonthList.get(revenueByMonthList.size() - 1).get("revenue")).doubleValue();
                    if (lastMonth > firstMonth) {
                        report.put("revenueTrend", "increasing");
                    } else if (lastMonth < firstMonth) {
                        report.put("revenueTrend", "decreasing");
                    } else {
                        report.put("revenueTrend", "stable");
                    }
                } else {
                    report.put("revenueTrend", "stable");
                }
                
                // Get revenue by category
                List<Map<String, Object>> revenueByCategory = reportRepository.getRevenueByCategory(startDate, endDate);
                report.put("revenueByCategory", revenueByCategory);
                
                // Get revenue by payment method
                List<Map<String, Object>> revenueByPaymentMethod = reportRepository.getRevenueByPaymentMethod(startDate, endDate);
                report.put("revenueByPaymentMethod", revenueByPaymentMethod);
                
                // For now, use fixed values for these metrics until we implement proper calculations
                report.put("refundRate", 2.5);
                report.put("conversionRate", 65.8);
                
                logger.info("Successfully fetched sales report data from database");
            } else {
                // Fallback to mock data if repository is not available
                logger.warn("ReportRepository not available, using mock data for sales report");
                return getMockSalesReport(startDate, endDate);
            }
        } catch (Exception e) {
            logger.error("Error fetching sales report data from database", e);
            // Fallback to mock data in case of error
            return getMockSalesReport(startDate, endDate);
        }
        
        return report;
    }

    @Override
    public Map<String, Object> getUserReport() {
        // Default to last 30 days
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(30);
        return getUserReport(startDate, endDate);
    }

    @Override
    public Map<String, Object> getUserReport(LocalDate startDate, LocalDate endDate) {
        Map<String, Object> report = new HashMap<>();
        
        try {
            if (reportRepository != null) {
                // Use real data from database
                logger.info("Fetching user report data from database for period: {} to {}", startDate, endDate);
                
                int totalUsers = reportRepository.getTotalUsers();
                report.put("totalUsers", totalUsers);
                
                int activeUsers = reportRepository.getActiveUsers();
                report.put("activeUsers", activeUsers);
                
                int newUsers = reportRepository.getNewUsers(startDate);
                report.put("newUsers", newUsers);
                
                // Calculate retention rate (active users / total users)
                double retentionRate = totalUsers > 0 ? (double) activeUsers / totalUsers * 100 : 0;
                report.put("retentionRate", retentionRate);
                
                // Get users by role
                List<Map<String, Object>> usersByRoleList = reportRepository.getUsersByRole();
                Map<String, Object> userTypes = new HashMap<>();
                for (Map<String, Object> roleData : usersByRoleList) {
                    String role = (String) roleData.get("role");
                    int count = ((Number) roleData.get("count")).intValue();
                    userTypes.put(role.toLowerCase(), count);
                }
                report.put("userTypes", userTypes);
                
                // Get user growth by month
                List<Map<String, Object>> growthByMonth = reportRepository.getUserGrowthByMonth(startDate, endDate);
                report.put("growthByMonth", growthByMonth);
                
                // Calculate max monthly users
                int maxMonthlyUsers = 0;
                for (Map<String, Object> monthData : growthByMonth) {
                    int count = ((Number) monthData.get("count")).intValue();
                    if (count > maxMonthlyUsers) {
                        maxMonthlyUsers = count;
                    }
                }
                report.put("maxMonthlyUsers", maxMonthlyUsers);
                
                // Get most active users
                List<Map<String, Object>> mostActiveUsers = reportRepository.getMostActiveUsers(startDate, endDate);
                report.put("mostActiveUsers", mostActiveUsers);
                
                // For now, use fixed values for registration sources until we implement proper tracking
                Map<String, Object> registrationSources = new HashMap<>();
                registrationSources.put("Direct", 2500);
                registrationSources.put("Google", 1250);
                registrationSources.put("Facebook", 750);
                registrationSources.put("Twitter", 500);
                registrationSources.put("Other", 280);
                report.put("registrationSources", registrationSources);
                
                // Get user activity
                List<Map<String, Object>> userActivity = reportRepository.getUserActivity(startDate, endDate);
                report.put("userActivity", userActivity);
                
                logger.info("Successfully fetched user report data from database");
            } else {
                // Fallback to mock data if repository is not available
                logger.warn("ReportRepository not available, using mock data for user report");
                return getMockUserReport(startDate, endDate);
            }
        } catch (Exception e) {
            logger.error("Error fetching user report data from database", e);
            // Fallback to mock data in case of error
            return getMockUserReport(startDate, endDate);
        }
        
        return report;
    }
    
    // Fallback method to provide mock sales report data
    private Map<String, Object> getMockSalesReport(LocalDate startDate, LocalDate endDate) {
        Map<String, Object> report = new HashMap<>();
        
        report.put("totalRevenue", 125750.50);
        report.put("ticketsSold", 1250);
        report.put("averageTicketPrice", 100.60);
        
        List<Map<String, Object>> revenueByShow = new ArrayList<>();
        revenueByShow.add(createShowRevenue(1, "Hamilton", 45250.00));
        revenueByShow.add(createShowRevenue(2, "The Lion King", 32500.75));
        revenueByShow.add(createShowRevenue(3, "Wicked", 28750.25));
        revenueByShow.add(createShowRevenue(4, "Phantom of the Opera", 19249.50));
        report.put("revenueByShow", revenueByShow);
        
        List<Map<String, Object>> revenueByMonth = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM yyyy");
        LocalDate date = LocalDate.now().minusMonths(5);
        for (int i = 0; i < 6; i++) {
            Map<String, Object> monthData = new HashMap<>();
            monthData.put("month", date.format(formatter));
            monthData.put("revenue", 15000 + Math.random() * 10000);
            revenueByMonth.add(monthData);
            date = date.plusMonths(1);
        }
        report.put("revenueByMonth", revenueByMonth);
        
        report.put("maxMonthlyRevenue", 25000.00);
        
        List<Map<String, Object>> topSellingShows = new ArrayList<>();
        topSellingShows.add(createTopSellingShow(1, "Hamilton", "Broadway Productions", 450, 45250.00, 100.56));
        topSellingShows.add(createTopSellingShow(2, "The Lion King", "Disney Theatrical", 325, 32500.75, 100.00));
        topSellingShows.add(createTopSellingShow(3, "Wicked", "Universal Stage", 287, 28750.25, 100.18));
        topSellingShows.add(createTopSellingShow(4, "Phantom of the Opera", "Really Useful Group", 192, 19249.50, 100.26));
        report.put("topSellingShows", topSellingShows);
        
        report.put("revenueTrend", "increasing");
        
        List<Map<String, Object>> revenueByCategory = new ArrayList<>();
        revenueByCategory.add(createCategoryRevenue("Musical", 75450.25));
        revenueByCategory.add(createCategoryRevenue("Drama", 25300.75));
        revenueByCategory.add(createCategoryRevenue("Comedy", 15000.50));
        revenueByCategory.add(createCategoryRevenue("Concert", 10000.00));
        report.put("revenueByCategory", revenueByCategory);
        
        List<Map<String, Object>> revenueByPaymentMethod = new ArrayList<>();
        revenueByPaymentMethod.add(createPaymentMethodRevenue("Credit Card", 85450.25));
        revenueByPaymentMethod.add(createPaymentMethodRevenue("PayPal", 25300.75));
        revenueByPaymentMethod.add(createPaymentMethodRevenue("Bank Transfer", 15000.50));
        report.put("revenueByPaymentMethod", revenueByPaymentMethod);
        
        report.put("refundRate", 2.5);
        report.put("conversionRate", 65.8);
        
        return report;
    }
    
    // Fallback method to provide mock user report data
    private Map<String, Object> getMockUserReport(LocalDate startDate, LocalDate endDate) {
        Map<String, Object> report = new HashMap<>();
        
        report.put("totalUsers", 5280);
        report.put("activeUsers", 3750);
        report.put("newUsers", 450);
        report.put("retentionRate", 78.5);
        
        Map<String, Object> userTypes = new HashMap<>();
        userTypes.put("regular", 4500);
        userTypes.put("organizer", 750);
        userTypes.put("admin", 30);
        report.put("userTypes", userTypes);
        
        List<Map<String, Object>> growthByMonth = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM yyyy");
        LocalDate date = LocalDate.now().minusMonths(5);
        for (int i = 0; i < 6; i++) {
            Map<String, Object> monthData = new HashMap<>();
            monthData.put("month", date.format(formatter));
            monthData.put("count", 50 + Math.random() * 100);
            growthByMonth.add(monthData);
            date = date.plusMonths(1);
        }
        report.put("growthByMonth", growthByMonth);
        
        report.put("maxMonthlyUsers", 150);
        
        Map<String, Object> registrationSources = new HashMap<>();
        registrationSources.put("Direct", 2500);
        registrationSources.put("Google", 1250);
        registrationSources.put("Facebook", 750);
        registrationSources.put("Twitter", 500);
        registrationSources.put("Other", 280);
        report.put("registrationSources", registrationSources);
        
        List<Map<String, Object>> mostActiveUsers = new ArrayList<>();
        mostActiveUsers.add(createActiveUser(1, "John Doe", "john.doe@example.com", "Regular", 15, LocalDate.now()));
        mostActiveUsers.add(createActiveUser(2, "Jane Smith", "jane.smith@example.com", "Regular", 12, LocalDate.now().minusDays(1)));
        mostActiveUsers.add(createActiveUser(3, "Bob Johnson", "bob.johnson@example.com", "Organizer", 10, LocalDate.now().minusDays(2)));
        mostActiveUsers.add(createActiveUser(4, "Alice Williams", "alice.williams@example.com", "Regular", 8, LocalDate.now().minusDays(1)));
        mostActiveUsers.add(createActiveUser(5, "Charlie Brown", "charlie.brown@example.com", "Organizer", 7, LocalDate.now()));
        report.put("mostActiveUsers", mostActiveUsers);
        
        // Add user activity for the UI
        List<Map<String, Object>> userActivity = new ArrayList<>();
        LocalDate activityDate = LocalDate.now().minusDays(6);
        for (int i = 0; i < 7; i++) {
            Map<String, Object> activity = new HashMap<>();
            activity.put("date", activityDate.format(DateTimeFormatter.ISO_DATE));
            activity.put("logins", 50 + Math.random() * 100);
            userActivity.add(activity);
            activityDate = activityDate.plusDays(1);
        }
        report.put("userActivity", userActivity);
        
        return report;
    }

    @Override
    public Map<String, Object> getBookingReport() {
        // Default to last 30 days
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(30);
        return getBookingReport(startDate, endDate);
    }

    @Override
    public Map<String, Object> getBookingReport(LocalDate startDate, LocalDate endDate) {
        // For now, we'll continue to use mock data for booking reports
        // In a future update, this would be replaced with real database queries
        
        Map<String, Object> report = new HashMap<>();
        
        report.put("totalBookings", 1250);
        report.put("completedBookings", 1150);
        report.put("cancelledBookings", 75);
        report.put("pendingBookings", 25);
        report.put("averageBookingValue", 100.60);
        
        List<Map<String, Object>> bookingsByShow = new ArrayList<>();
        bookingsByShow.add(createShowBookings(1, "Hamilton", 450));
        bookingsByShow.add(createShowBookings(2, "The Lion King", 325));
        bookingsByShow.add(createShowBookings(3, "Wicked", 287));
        bookingsByShow.add(createShowBookings(4, "Phantom of the Opera", 192));
        report.put("bookingsByShow", bookingsByShow);
        
        List<Map<String, Object>> bookingsByDay = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDate date = LocalDate.now().minusDays(6);
        for (int i = 0; i < 7; i++) {
            Map<String, Object> dayData = new HashMap<>();
            dayData.put("date", date.format(formatter));
            dayData.put("count", 30 + Math.random() * 50);
            bookingsByDay.add(dayData);
            date = date.plusDays(1);
        }
        report.put("bookingsByDay", bookingsByDay);
        
        Map<String, Object> bookingsByStatus = new HashMap<>();
        bookingsByStatus.put("CONFIRMED", 1000);
        bookingsByStatus.put("PENDING", 25);
        bookingsByStatus.put("CANCELLED", 75);
        bookingsByStatus.put("COMPLETED", 150);
        report.put("bookingsByStatus", bookingsByStatus);
        
        Map<String, Object> bookingsByPaymentStatus = new HashMap<>();
        bookingsByPaymentStatus.put("PAID", 1150);
        bookingsByPaymentStatus.put("PENDING", 25);
        bookingsByPaymentStatus.put("REFUNDED", 75);
        report.put("bookingsByPaymentStatus", bookingsByPaymentStatus);
        
        return report;
    }

    @Override
    public Map<String, Object> getRevenueReport(String interval) {
        // Default to last 30 days
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(30);
        return getRevenueReport(startDate, endDate, interval);
    }

    @Override
    public Map<String, Object> getRevenueReport(LocalDate startDate, LocalDate endDate, String interval) {
        // For now, we'll continue to use mock data for revenue reports by interval
        // In a future update, this would be replaced with real database queries
        
        Map<String, Object> report = new HashMap<>();
        
        // If we have real data from the sales report, use it
        if (reportRepository != null) {
            try {
                Double totalRevenue = reportRepository.getTotalRevenue(startDate, endDate);
                if (totalRevenue != null) {
                    report.put("totalRevenue", totalRevenue);
                } else {
                    report.put("totalRevenue", 125750.50);
                }
            } catch (Exception e) {
                logger.error("Error fetching total revenue", e);
                report.put("totalRevenue", 125750.50);
            }
        } else {
            report.put("totalRevenue", 125750.50);
        }
        
        // Calculate average daily revenue
        long days = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1;
        double totalRevenue = (Double) report.get("totalRevenue");
        double averageDailyRevenue = days > 0 ? totalRevenue / days : 0;
        report.put("averageDailyRevenue", averageDailyRevenue);
        
        report.put("highestDailyRevenue", 8500.25);
        report.put("lowestDailyRevenue", 1250.75);
        
        List<Map<String, Object>> revenueByPeriod = new ArrayList<>();
        
        if ("daily".equals(interval)) {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            LocalDate date = startDate;
            while (!date.isAfter(endDate)) {
                Map<String, Object> periodData = new HashMap<>();
                periodData.put("period", date.format(formatter));
                periodData.put("revenue", 1000 + Math.random() * 7500);
                revenueByPeriod.add(periodData);
                date = date.plusDays(1);
            }
        } else if ("weekly".equals(interval)) {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("'Week' w, yyyy");
            LocalDate date = startDate;
            while (!date.isAfter(endDate)) {
                Map<String, Object> periodData = new HashMap<>();
                periodData.put("period", date.format(formatter));
                periodData.put("revenue", 7000 + Math.random() * 15000);
                revenueByPeriod.add(periodData);
                date = date.plusWeeks(1);
            }
        } else if ("yearly".equals(interval)) {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy");
            LocalDate date = startDate;
            while (!date.isAfter(endDate)) {
                if (date.getDayOfYear() == 1 || date.equals(startDate)) {
                    Map<String, Object> periodData = new HashMap<>();
                    periodData.put("period", date.format(formatter));
                    periodData.put("revenue", 100000 + Math.random() * 500000);
                    revenueByPeriod.add(periodData);
                }
                date = date.plusYears(1);
            }
        } else {
            // Default to monthly
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM yyyy");
            LocalDate date = startDate.withDayOfMonth(1);
            while (!date.isAfter(endDate)) {
                Map<String, Object> periodData = new HashMap<>();
                periodData.put("period", date.format(formatter));
                periodData.put("revenue", 15000 + Math.random() * 30000);
                revenueByPeriod.add(periodData);
                date = date.plusMonths(1);
            }
        }
        
        report.put("revenueByPeriod", revenueByPeriod);
        
        return report;
    }
    
    // Helper methods to create mock data
    
    private Map<String, Object> createShowRevenue(int showId, String showTitle, double revenue) {
        Map<String, Object> showRevenue = new HashMap<>();
        showRevenue.put("showId", showId);
        showRevenue.put("showTitle", showTitle);
        showRevenue.put("revenue", revenue);
        return showRevenue;
    }
    
    private Map<String, Object> createTopSellingShow(int id, String name, String organizer, int ticketsSold, double revenue, double averagePrice) {
        Map<String, Object> show = new HashMap<>();
        show.put("id", id);
        show.put("name", name);
        show.put("organizer", organizer);
        show.put("ticketsSold", ticketsSold);
        show.put("revenue", revenue);
        show.put("averagePrice", averagePrice);
        return show;
    }
    
    private Map<String, Object> createCategoryRevenue(String category, double revenue) {
        Map<String, Object> categoryRevenue = new HashMap<>();
        categoryRevenue.put("category", category);
        categoryRevenue.put("revenue", revenue);
        return categoryRevenue;
    }
    
    private Map<String, Object> createPaymentMethodRevenue(String method, double revenue) {
        Map<String, Object> paymentMethodRevenue = new HashMap<>();
        paymentMethodRevenue.put("method", method);
        paymentMethodRevenue.put("revenue", revenue);
        return paymentMethodRevenue;
    }
    
    private Map<String, Object> createActiveUser(int id, String name, String email, String role, int bookings, LocalDate lastActive) {
        Map<String, Object> user = new HashMap<>();
        user.put("id", id);
        user.put("name", name);
        user.put("email", email);
        user.put("role", role);
        user.put("bookings", bookings);
        user.put("lastActive", lastActive);
        return user;
    }
    
    private Map<String, Object> createShowBookings(int showId, String showTitle, int bookings) {
        Map<String, Object> showBookings = new HashMap<>();
        showBookings.put("showId", showId);
        showBookings.put("showTitle", showTitle);
        showBookings.put("bookings", bookings);
        return showBookings;
    }
}