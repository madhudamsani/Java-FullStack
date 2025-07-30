package com.showvault.service.impl;

import com.showvault.model.*;
import com.showvault.model.User;

import com.showvault.repository.BookingRepository;
import com.showvault.repository.PromotionRepository;
import com.showvault.repository.ShowRepository;
import com.showvault.repository.UserRepository;
import com.showvault.service.AdminDashboardService;
import com.showvault.service.SystemHealthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminDashboardServiceImpl implements AdminDashboardService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ShowRepository showRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private SystemHealthService systemHealthService;
    

    
    @Autowired
    private PromotionRepository promotionRepository;

    @Override
    public DashboardStats getDashboardStats() {
        return getDashboardStats(LocalDate.now().minusMonths(1), LocalDate.now());
    }

    @Override
    public DashboardStats getDashboardStats(LocalDate startDate, LocalDate endDate) {
        DashboardStats stats = new DashboardStats();
        
        // Count users
        List<User> users = userRepository.findAll();
        stats.setTotalUsers(users.size());
        
        // Count shows
        List<Show> shows = showRepository.findAll();
        stats.setTotalShows(shows.size());
        
        // Count active and upcoming shows
        stats.setActiveShows((int) shows.stream()
                .filter(show -> Show.ShowStatus.ONGOING.equals(show.getStatus()))
                .count());
        
        stats.setUpcomingShows((int) shows.stream()
                .filter(show -> Show.ShowStatus.UPCOMING.equals(show.getStatus()))
                .count());
        
        // Count bookings
        List<Booking> bookings = bookingRepository.findAll();
        stats.setTotalBookings(bookings.size());
        
        // Count bookings this month
        LocalDate firstDayOfMonth = LocalDate.now().withDayOfMonth(1);
        stats.setBookingsThisMonth((int) bookings.stream()
                .filter(booking -> booking.getBookingDate() != null && 
                        booking.getBookingDate().toLocalDate().isAfter(firstDayOfMonth.minusDays(1)))
                .count());
        
        // Calculate total revenue
        double totalRevenue = bookings.stream()
                .map(booking -> booking.getTotalAmount())
                .filter(Objects::nonNull)
                .map(BigDecimal::doubleValue)
                .mapToDouble(Double::doubleValue)
                .sum();
        stats.setTotalRevenue(totalRevenue);
        
        // Get recent bookings
        List<Map<String, Object>> recentBookings = bookings.stream()
                .sorted(Comparator.comparing(Booking::getBookingDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(5)
                .map(booking -> {
                    Map<String, Object> bookingMap = new HashMap<>();
                    bookingMap.put("id", booking.getId());
                    bookingMap.put("user", booking.getUser().getFirstName() + " " + booking.getUser().getLastName());
                    bookingMap.put("show", booking.getShowSchedule().getShow().getTitle());
                    bookingMap.put("amount", booking.getTotalAmount().doubleValue());
                    bookingMap.put("date", booking.getBookingDate() != null ? booking.getBookingDate().toString() : "");
                    bookingMap.put("status", booking.getStatus().toString());
                    return bookingMap;
                })
                .collect(Collectors.toList());
        stats.setRecentBookings(recentBookings);
        
        // Get popular shows
        List<Map<String, Object>> popularShows = shows.stream()
                .sorted((a, b) -> {
                    long aCount = bookings.stream()
                            .filter(booking -> booking.getShowSchedule() != null && 
                                    booking.getShowSchedule().getShow() != null && 
                                    booking.getShowSchedule().getShow().getId().equals(a.getId()))
                            .count();
                    long bCount = bookings.stream()
                            .filter(booking -> booking.getShowSchedule() != null && 
                                    booking.getShowSchedule().getShow() != null && 
                                    booking.getShowSchedule().getShow().getId().equals(b.getId()))
                            .count();
                    return Long.compare(bCount, aCount);
                })
                .limit(5)
                .map(show -> {
                    Map<String, Object> showMap = new HashMap<>();
                    showMap.put("id", show.getId());
                    showMap.put("title", show.getTitle());
                    
                    // Calculate tickets sold
                    int ticketsSold = bookings.stream()
                            .filter(booking -> booking.getShowSchedule() != null && 
                                    booking.getShowSchedule().getShow() != null && 
                                    booking.getShowSchedule().getShow().getId().equals(show.getId()))
                            .mapToInt(booking -> booking.getSeatBookings().size())
                            .sum();
                    showMap.put("ticketsSold", ticketsSold);
                    
                    // Calculate revenue
                    double revenue = bookings.stream()
                            .filter(booking -> booking.getShowSchedule() != null && 
                                    booking.getShowSchedule().getShow() != null && 
                                    booking.getShowSchedule().getShow().getId().equals(show.getId()))
                            .map(booking -> booking.getTotalAmount())
                            .filter(Objects::nonNull)
                            .map(BigDecimal::doubleValue)
                            .mapToDouble(Double::doubleValue)
                            .sum();
                    showMap.put("revenue", revenue);
                    
                    return showMap;
                })
                .collect(Collectors.toList());
        stats.setPopularShows(popularShows);
        
        // Generate user growth data based on user creation dates
        List<Map<String, Object>> userGrowth = new ArrayList<>();
        LocalDate date = startDate;
        
        // Get all users with creation dates
        List<User> usersWithDates = users.stream()
                .filter(user -> user.getCreatedAt() != null)
                .collect(Collectors.toList());
        
        while (!date.isAfter(endDate)) {
            final LocalDate currentDate = date;
            final LocalDate nextDate = date.plusDays(7);
            
            // Count users created up to this date
            long userCount = usersWithDates.stream()
                    .filter(user -> !user.getCreatedAt().toLocalDate().isAfter(currentDate))
                    .count();
            
            Map<String, Object> growth = new HashMap<>();
            growth.put("date", date.toString());
            growth.put("count", userCount);
            userGrowth.add(growth);
            
            date = nextDate; // Weekly data points
        }
        stats.setUserGrowth(userGrowth);
        
        // Generate recent activity data from bookings instead of audit logs
        List<Map<String, Object>> recentActivity = new ArrayList<>();
        
        // Get recent bookings as activity
        List<Booking> activityBookings = bookingRepository.findAll(
                PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "bookingDate"))
        ).getContent();
        
        for (Booking booking : activityBookings) {
            Map<String, Object> activity = new HashMap<>();
            activity.put("timestamp", booking.getBookingDate() != null ? booking.getBookingDate().toString() : LocalDateTime.now().toString());
            activity.put("user", booking.getUser() != null ? 
                    booking.getUser().getFirstName() + " " + booking.getUser().getLastName() : "Unknown User");
            activity.put("action", "Booking Created");
            activity.put("details", "Booked " + (booking.getShowSchedule() != null && booking.getShowSchedule().getShow() != null ? 
                    booking.getShowSchedule().getShow().getTitle() : "Unknown Show"));
            recentActivity.add(activity);
        }
        
        // If no bookings found, create a default activity
        if (recentActivity.isEmpty()) {
            Map<String, Object> activity = new HashMap<>();
            activity.put("timestamp", LocalDateTime.now().toString());
            activity.put("user", "System");
            activity.put("action", "Dashboard Accessed");
            activity.put("details", "No recent activity found");
            recentActivity.add(activity);
        }
        
        stats.setRecentActivity(recentActivity);
        
        // Get system health
        com.showvault.model.SystemHealth health = systemHealthService.getSystemHealth();
        DashboardStats.SystemHealth dashboardHealth = new DashboardStats.SystemHealth();
        dashboardHealth.setStatus(health.getStatus());
        dashboardHealth.setUptime(health.getUptime());
        dashboardHealth.setServerLoad(health.getCpuUsage());
        dashboardHealth.setMemoryUsage(health.getMemoryUsage());
        dashboardHealth.setDiskUsage(health.getDiskUsage());
        dashboardHealth.setActiveConnections(health.getActiveConnections());
        dashboardHealth.setResponseTime(health.getAverageResponseTime());
        stats.setSystemHealth(dashboardHealth);
        
        return stats;
    }

    @Override
    public UserReport getUserReport() {
        return getUserReport(LocalDate.now().minusMonths(6), LocalDate.now());
    }

    @Override
    public UserReport getUserReport(LocalDate startDate, LocalDate endDate) {
        UserReport report = new UserReport();
        
        // Get all users
        List<User> users = userRepository.findAll();
        report.setTotalUsers(users.size());
        
        // Count active users based on recent activity (updatedAt within last 30 days)
        int activeUsers = (int) users.stream()
                .filter(user -> user.getUpdatedAt() != null && 
                        user.getUpdatedAt().toLocalDate().isAfter(LocalDate.now().minusMonths(1)))
                .count();
        report.setActiveUsers(activeUsers);
        
        // Count new users based on registration date (createdAt)
        int newUsers = (int) users.stream()
                .filter(user -> user.getCreatedAt() != null && 
                        user.getCreatedAt().toLocalDate().isAfter(LocalDate.now().minusMonths(1)))
                .count();
        report.setNewUsers(newUsers);
        
        // Count users by role
        Map<String, Integer> usersByRole = new HashMap<>();
        for (User user : users) {
            user.getRoles().forEach(role -> {
                String roleName = role.getName().name(); // Convert ERole to String
                usersByRole.put(roleName, usersByRole.getOrDefault(roleName, 0) + 1);
            });
        }
        report.setUsersByRole(usersByRole);
        
        // Generate user activity data based on booking dates
        List<Map<String, Object>> userActivity = new ArrayList<>();
        LocalDate date = startDate;
        
        // Get all bookings with dates
        List<Booking> bookingsWithDates = bookingRepository.findAll().stream()
                .filter(booking -> booking.getBookingDate() != null)
                .collect(Collectors.toList());
        
        while (!date.isAfter(endDate)) {
            final LocalDate currentDate = date;
            final LocalDate nextDate = date.plusDays(7);
            
            // Count bookings made in this week as a proxy for user activity
            long activityCount = bookingsWithDates.stream()
                    .filter(booking -> {
                        LocalDate bookingDate = booking.getBookingDate().toLocalDate();
                        return !bookingDate.isBefore(currentDate) && bookingDate.isBefore(nextDate);
                    })
                    .count();
            
            // Add some baseline activity (assuming not all activity results in bookings)
            long loginEstimate = activityCount * 5 + (users.size() / 10);
            
            Map<String, Object> activity = new HashMap<>();
            activity.put("date", date.toString());
            activity.put("logins", loginEstimate);
            userActivity.add(activity);
            
            date = nextDate; // Weekly data points
        }
        report.setUserActivity(userActivity);
        
        // Set user types
        Map<String, Integer> userTypes = new HashMap<>();
        userTypes.put("regular", usersByRole.getOrDefault("ROLE_USER", 0));
        userTypes.put("organizer", usersByRole.getOrDefault("ROLE_ORGANIZER", 0));
        userTypes.put("admin", usersByRole.getOrDefault("ROLE_ADMIN", 0));
        report.setUserTypes(userTypes);
        
        // Calculate growth by month data from user registration dates
        List<Map<String, Object>> growthByMonth = new ArrayList<>();
        YearMonth month = YearMonth.from(startDate);
        YearMonth endMonth = YearMonth.from(endDate);
        int maxMonthlyUsers = 0;
        
        // Get all users with creation dates
        List<User> usersWithDates = users.stream()
                .filter(user -> user.getCreatedAt() != null)
                .collect(Collectors.toList());
        
        while (!month.isAfter(endMonth)) {
            final YearMonth currentMonth = month;
            
            // Count users created up to this month
            long userCount = usersWithDates.stream()
                    .filter(user -> {
                        YearMonth userCreationMonth = YearMonth.from(user.getCreatedAt().toLocalDate());
                        return !userCreationMonth.isAfter(currentMonth);
                    })
                    .count();
            
            maxMonthlyUsers = Math.max(maxMonthlyUsers, (int)userCount);
            
            Map<String, Object> growth = new HashMap<>();
            growth.put("month", month.format(DateTimeFormatter.ofPattern("yyyy-MM")));
            growth.put("count", userCount);
            growthByMonth.add(growth);
            
            month = month.plusMonths(1);
        }
        report.setGrowthByMonth(growthByMonth);
        report.setMaxMonthlyUsers(maxMonthlyUsers);
        
        // Generate most active users data based on booking counts
        List<Map<String, Object>> mostActiveUsers = new ArrayList<>();
        
        // Get all bookings
        List<Booking> allBookings = bookingRepository.findAll();
        
        if (!users.isEmpty() && !allBookings.isEmpty()) {
            // Count bookings per user
            Map<Long, Integer> bookingsPerUser = new HashMap<>();
            Map<Long, LocalDateTime> lastActivityPerUser = new HashMap<>();
            
            for (Booking booking : allBookings) {
                if (booking.getUser() != null) {
                    Long userId = booking.getUser().getId();
                    // Count bookings
                    bookingsPerUser.put(userId, bookingsPerUser.getOrDefault(userId, 0) + 1);
                    
                    // Track last activity
                    if (booking.getBookingDate() != null) {
                        LocalDateTime currentLastActivity = lastActivityPerUser.getOrDefault(userId, LocalDateTime.MIN);
                        if (booking.getBookingDate().isAfter(currentLastActivity)) {
                            lastActivityPerUser.put(userId, booking.getBookingDate());
                        }
                    }
                }
            }
            
            // Sort users by booking count
            List<User> mostActiveUsersList = users.stream()
                    .filter(user -> bookingsPerUser.containsKey(user.getId()))
                    .sorted((u1, u2) -> {
                        return bookingsPerUser.getOrDefault(u2.getId(), 0)
                                .compareTo(bookingsPerUser.getOrDefault(u1.getId(), 0));
                    })
                    .limit(5)
                    .collect(Collectors.toList());
            
            // Create the most active users list
            for (User user : mostActiveUsersList) {
                Map<String, Object> activeUser = new HashMap<>();
                activeUser.put("id", user.getId());
                activeUser.put("name", user.getFirstName() + " " + user.getLastName());
                activeUser.put("email", user.getEmail());
                activeUser.put("role", user.getRoles().isEmpty() ? "ROLE_USER" : 
                        user.getRoles().iterator().next().getName().name());
                activeUser.put("bookings", bookingsPerUser.getOrDefault(user.getId(), 0));
                
                LocalDateTime lastActive = lastActivityPerUser.getOrDefault(user.getId(), 
                        user.getUpdatedAt() != null ? user.getUpdatedAt() : LocalDateTime.now());
                activeUser.put("lastActive", lastActive.toString());
                
                mostActiveUsers.add(activeUser);
            }
        }
        
        // If we couldn't get real users, create an empty list
        if (mostActiveUsers.isEmpty()) {
            // Log this situation for monitoring
            System.out.println("Warning: No active users found in the system.");
        }
        
        report.setMostActiveUsers(mostActiveUsers);
        
        // Get registration sources from user data
        Map<String, Integer> registrationSources = new HashMap<>();
        
        // Count users by registration source
        for (User user : users) {
            String source = user.getRegistrationSource();
            if (source == null || source.isEmpty()) {
                source = "Direct"; // Default source if not specified
            }
            registrationSources.put(source, registrationSources.getOrDefault(source, 0) + 1);
        }
        
        // Ensure we have at least one source
        if (registrationSources.isEmpty()) {
            registrationSources.put("Direct", 0);
        }
        
        report.setRegistrationSources(registrationSources);
        
        // Calculate retention rate based on user activity
        // Users who have been active in the last month compared to total users
        double retentionRate = users.isEmpty() ? 0 : (activeUsers * 100.0 / users.size());
        report.setRetentionRate(retentionRate);
        
        return report;
    }

    @Override
    public SalesReport getSalesReport() {
        return getSalesReport(LocalDate.now().minusMonths(6), LocalDate.now());
    }

    @Override
    public SalesReport getSalesReport(LocalDate startDate, LocalDate endDate) {
        System.out.println("Generating sales report from " + startDate + " to " + endDate);
        SalesReport report = new SalesReport();
        
        // Get all bookings
        List<Booking> bookings = bookingRepository.findAll();
        System.out.println("Found " + bookings.size() + " bookings");
        
        // Calculate total revenue and tickets sold
        double totalRevenue = bookings.stream()
                .map(booking -> booking.getTotalAmount())
                .filter(Objects::nonNull)
                .map(BigDecimal::doubleValue)
                .mapToDouble(Double::doubleValue)
                .sum();
        
        int ticketsSold = bookings.stream()
                .mapToInt(booking -> booking.getSeatBookings().size())
                .sum();
        
        report.setTotalRevenue(totalRevenue);
        report.setTicketsSold(ticketsSold);
        
        if (ticketsSold > 0) {
            report.setAverageTicketPrice(totalRevenue / ticketsSold);
        }
        
        // Group bookings by month
        Map<String, Double> revenueByMonth = new HashMap<>();
        Map<String, Integer> ticketsByMonth = new HashMap<>();
        
        YearMonth month = YearMonth.from(startDate);
        YearMonth endMonth = YearMonth.from(endDate);
        
        while (!month.isAfter(endMonth)) {
            String monthStr = month.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            LocalDate firstDay = month.atDay(1);
            LocalDate lastDay = month.atEndOfMonth();
            
            final LocalDate fFirstDay = firstDay;
            final LocalDate fLastDay = lastDay;
            
            double monthlyRevenue = bookings.stream()
                    .filter(booking -> booking.getBookingDate() != null)
                    .filter(booking -> {
                        LocalDate bookingDate = booking.getBookingDate().toLocalDate();
                        return !bookingDate.isBefore(fFirstDay) && !bookingDate.isAfter(fLastDay);
                    })
                    .map(booking -> booking.getTotalAmount())
                    .filter(Objects::nonNull)
                    .map(BigDecimal::doubleValue)
                    .mapToDouble(Double::doubleValue)
                    .sum();
            
            int monthlyTickets = bookings.stream()
                    .filter(booking -> booking.getBookingDate() != null)
                    .filter(booking -> {
                        LocalDate bookingDate = booking.getBookingDate().toLocalDate();
                        return !bookingDate.isBefore(fFirstDay) && !bookingDate.isAfter(fLastDay);
                    })
                    .mapToInt(booking -> booking.getSeatBookings().size())
                    .sum();
            
            revenueByMonth.put(monthStr, monthlyRevenue);
            ticketsByMonth.put(monthStr, monthlyTickets);
            
            month = month.plusMonths(1);
        }
        
        report.setRevenueByMonth(revenueByMonth);
        report.setTicketsByMonth(ticketsByMonth);
        
        // Calculate maxMonthlyRevenue
        double maxMonthlyRevenue = revenueByMonth.values().stream()
                .mapToDouble(Double::doubleValue)
                .max()
                .orElse(0.0);
        report.setMaxMonthlyRevenue(maxMonthlyRevenue);
        
        // Get top selling shows
        List<Show> shows = showRepository.findAll();
        System.out.println("Found " + shows.size() + " shows");
        List<Map<String, Object>> topSellingShows = shows.stream()
                .sorted((a, b) -> {
                    int aTickets = bookings.stream()
                            .filter(booking -> booking.getShowSchedule() != null && 
                                    booking.getShowSchedule().getShow() != null && 
                                    booking.getShowSchedule().getShow().getId().equals(a.getId()))
                            .mapToInt(booking -> booking.getSeatBookings().size())
                            .sum();
                    int bTickets = bookings.stream()
                            .filter(booking -> booking.getShowSchedule() != null && 
                                    booking.getShowSchedule().getShow() != null && 
                                    booking.getShowSchedule().getShow().getId().equals(b.getId()))
                            .mapToInt(booking -> booking.getSeatBookings().size())
                            .sum();
                    return Integer.compare(bTickets, aTickets);
                })
                .limit(5)
                .map(show -> {
                    int showTickets = bookings.stream()
                            .filter(booking -> booking.getShowSchedule() != null && 
                                    booking.getShowSchedule().getShow() != null && 
                                    booking.getShowSchedule().getShow().getId().equals(show.getId()))
                            .mapToInt(booking -> booking.getSeatBookings().size())
                            .sum();
                    
                    double showRevenue = bookings.stream()
                            .filter(booking -> booking.getShowSchedule() != null && 
                                    booking.getShowSchedule().getShow() != null && 
                                    booking.getShowSchedule().getShow().getId().equals(show.getId()))
                            .map(booking -> booking.getTotalAmount())
                            .filter(Objects::nonNull)
                            .map(BigDecimal::doubleValue)
                            .mapToDouble(Double::doubleValue)
                            .sum();
                    
                    Map<String, Object> showMap = new HashMap<>();
                    showMap.put("id", show.getId());
                    showMap.put("title", show.getTitle());
                    showMap.put("name", show.getTitle()); // Add name for frontend compatibility
                    showMap.put("ticketsSold", showTickets);
                    showMap.put("revenue", showRevenue);
                    showMap.put("category", show.getGenre()); // Use genre instead of category
                    
                    // Calculate average price
                    double averagePrice = showTickets > 0 ? showRevenue / showTickets : 0.0;
                    showMap.put("averagePrice", averagePrice);
                    
                    // Add organizer information if available
                    if (show.getCreatedBy() != null) {
                        String organizerName = show.getCreatedBy().getFirstName() + " " + show.getCreatedBy().getLastName();
                        showMap.put("organizer", organizerName);
                    } else {
                        showMap.put("organizer", "N/A");
                    }
                    
                    return showMap;
                })
                .collect(Collectors.toList());
        report.setTopSellingShows(topSellingShows);
        
        // Try to calculate revenue by category from actual data
        Map<String, Double> revenueByCategory = new HashMap<>();
        
        // Group shows by genre
        Map<String, List<Show>> showsByGenre = shows.stream()
                .filter(show -> show.getGenre() != null && !show.getGenre().isEmpty())
                .collect(Collectors.groupingBy(Show::getGenre));
        
        // Calculate revenue for each genre
        showsByGenre.forEach((genre, genreShows) -> {
            double genreRevenue = 0.0;
            
            for (Show show : genreShows) {
                genreRevenue += bookings.stream()
                        .filter(booking -> booking.getShowSchedule() != null && 
                                booking.getShowSchedule().getShow() != null && 
                                booking.getShowSchedule().getShow().getId().equals(show.getId()))
                        .map(booking -> booking.getTotalAmount())
                        .filter(Objects::nonNull)
                        .map(BigDecimal::doubleValue)
                        .mapToDouble(Double::doubleValue)
                        .sum();
            }
            
            revenueByCategory.put(genre.toLowerCase(), genreRevenue);
        });
        
        // If no categories found, log a warning
        if (revenueByCategory.isEmpty()) {
            System.out.println("Warning: No show categories (genres) found in the system.");
            revenueByCategory.put("uncategorized", 0.0);
        }
        
        report.setRevenueByCategory(revenueByCategory);
        
        // Calculate revenue by platform from booking data
        Map<String, Double> revenueByPlatform = new HashMap<>();
        
        // Initialize with zero values
        revenueByPlatform.put("web", 0.0);
        revenueByPlatform.put("mobile", 0.0);
        revenueByPlatform.put("box_office", 0.0);
        
        // Analyze bookings to determine platform
        for (Booking booking : bookings) {
            String platform = "web"; // Default platform
            
            // Try to determine platform from user agent or booking source if available
            if (booking.getBookingSource() != null) {
                String source = booking.getBookingSource().toLowerCase();
                if (source.contains("mobile") || source.contains("android") || source.contains("ios")) {
                    platform = "mobile";
                } else if (source.contains("box") || source.contains("office") || source.contains("in_person")) {
                    platform = "box_office";
                }
            }
            
            // Add booking amount to the appropriate platform
            if (booking.getTotalAmount() != null) {
                double amount = booking.getTotalAmount().doubleValue();
                revenueByPlatform.put(platform, revenueByPlatform.get(platform) + amount);
            }
        }
        
        report.setRevenueByPlatform(revenueByPlatform);
        
        // Calculate sales by price category from actual data
        List<Map<String, Object>> salesByPriceCategory = new ArrayList<>();
        Map<String, Integer> ticketsByCategory = new HashMap<>();
        Map<String, Double> revenueBySeatCategory = new HashMap<>();
        
        // Collect data from all seat bookings
        for (Booking booking : bookings) {
            for (SeatBooking seatBooking : booking.getSeatBookings()) {
                if (seatBooking.getSeat() != null) {
                    String category = seatBooking.getSeat().getCategory().toString();
                    
                    // Count tickets
                    ticketsByCategory.put(category, 
                            ticketsByCategory.getOrDefault(category, 0) + 1);
                    
                    // Sum revenue
                    double price = seatBooking.getPrice() != null ? 
                            seatBooking.getPrice().doubleValue() : 0.0;
                    revenueBySeatCategory.put(category, 
                            revenueBySeatCategory.getOrDefault(category, 0.0) + price);
                }
            }
        }
        
        // Create category reports
        for (String category : ticketsByCategory.keySet()) {
            Map<String, Object> categoryData = new HashMap<>();
            int tickets = ticketsByCategory.get(category);
            double revenue = revenueBySeatCategory.getOrDefault(category, 0.0);
            double averagePrice = tickets > 0 ? revenue / tickets : 0.0;
            
            categoryData.put("category", category);
            categoryData.put("ticketsSold", tickets);
            categoryData.put("revenue", revenue);
            categoryData.put("averagePrice", averagePrice);
            salesByPriceCategory.add(categoryData);
        }
        
        // If no data was found, add default categories
        if (salesByPriceCategory.isEmpty()) {
            Map<String, Object> vipCategory = new HashMap<>();
            vipCategory.put("category", "VIP");
            vipCategory.put("ticketsSold", 0);
            vipCategory.put("revenue", 0.0);
            vipCategory.put("averagePrice", 0.0);
            salesByPriceCategory.add(vipCategory);
            
            Map<String, Object> standardCategory = new HashMap<>();
            standardCategory.put("category", "STANDARD");
            standardCategory.put("ticketsSold", 0);
            standardCategory.put("revenue", 0.0);
            standardCategory.put("averagePrice", 0.0);
            salesByPriceCategory.add(standardCategory);
            
            Map<String, Object> premiumCategory = new HashMap<>();
            premiumCategory.put("category", "PREMIUM");
            premiumCategory.put("ticketsSold", 0);
            premiumCategory.put("revenue", 0.0);
            premiumCategory.put("averagePrice", 0.0);
            salesByPriceCategory.add(premiumCategory);
        }
        
        report.setSalesByPriceCategory(salesByPriceCategory);
        
        // Create revenueByShow data
        List<Map<String, Object>> revenueByShow = new ArrayList<>();
        
        // Get all shows
        List<Show> allShows = showRepository.findAll();
        
        // Calculate revenue for each show
        for (Show show : allShows) {
            double showRevenue = bookings.stream()
                    .filter(booking -> booking.getShowSchedule() != null && 
                            booking.getShowSchedule().getShow() != null && 
                            booking.getShowSchedule().getShow().getId().equals(show.getId()))
                    .map(booking -> booking.getTotalAmount())
                    .filter(Objects::nonNull)
                    .map(BigDecimal::doubleValue)
                    .mapToDouble(Double::doubleValue)
                    .sum();
            
            if (showRevenue > 0) {
                Map<String, Object> showData = new HashMap<>();
                showData.put("showId", show.getId());
                showData.put("showTitle", show.getTitle());
                showData.put("revenue", showRevenue);
                revenueByShow.add(showData);
            }
        }
        
        // Sort by revenue (highest first)
        revenueByShow.sort((a, b) -> {
            double revenueA = (double) a.get("revenue");
            double revenueB = (double) b.get("revenue");
            return Double.compare(revenueB, revenueA);
        });
        
        report.setRevenueByShow(revenueByShow);
        
        // Create revenueByPaymentMethod data
        List<Map<String, Object>> revenueByPaymentMethod = new ArrayList<>();
        
        // Convert revenueByPlatform to revenueByPaymentMethod format
        for (Map.Entry<String, Double> entry : revenueByPlatform.entrySet()) {
            Map<String, Object> methodData = new HashMap<>();
            methodData.put("method", entry.getKey());
            methodData.put("revenue", entry.getValue());
            revenueByPaymentMethod.add(methodData);
        }
        
        report.setRevenueByPaymentMethod(revenueByPaymentMethod);
        
        // Calculate refund rate from actual data
        Map<String, Double> refundRate = new HashMap<>();
        
        // Count total bookings and refunded bookings
        int totalBookings = bookings.size();
        long refundedBookings = bookings.stream()
                .filter(booking -> booking.getStatus() == BookingStatus.REFUNDED)
                .count();
        
        // Calculate overall refund rate
        double overallRate = totalBookings > 0 ? (refundedBookings * 100.0 / totalBookings) : 0.0;
        refundRate.put("overall", overallRate);
        
        // Group shows by genre for refund rate calculation
        Map<String, List<Show>> showsByGenreForRefund = shows.stream()
                .filter(show -> show.getGenre() != null && !show.getGenre().isEmpty())
                .collect(Collectors.groupingBy(Show::getGenre));
        
        // Calculate refund rate for each genre
        showsByGenreForRefund.forEach((genre, genreShows) -> {
            // Get all bookings for shows in this genre
            List<Booking> genreBookings = new ArrayList<>();
            for (Show show : genreShows) {
                genreBookings.addAll(bookings.stream()
                        .filter(booking -> booking.getShowSchedule() != null && 
                                booking.getShowSchedule().getShow() != null && 
                                booking.getShowSchedule().getShow().getId().equals(show.getId()))
                        .collect(Collectors.toList()));
            }
            
            // Calculate refund rate for this genre
            int genreTotal = genreBookings.size();
            long genreRefunded = genreBookings.stream()
                    .filter(booking -> booking.getStatus() == BookingStatus.REFUNDED)
                    .count();
            
            double genreRate = genreTotal > 0 ? (genreRefunded * 100.0 / genreTotal) : 0.0;
            refundRate.put(genre.toLowerCase(), genreRate);
        });
        
        // Ensure we have at least some categories
        if (refundRate.size() <= 1) {
            // Add default categories with zero values if no real data exists
            refundRate.put("theater", 0.0);
            refundRate.put("concert", 0.0);
            refundRate.put("movie", 0.0);
            refundRate.put("sports", 0.0);
        }
        
        report.setRefundRate(refundRate);
        
        // Calculate conversion rate from actual data
        // Conversion rate is typically (completed bookings / total visits or sessions)
        // Since we don't have visit data, we'll estimate based on completed vs abandoned bookings
        
        // Get all bookings (including abandoned ones if available)
        List<Booking> allBookingAttempts = new ArrayList<>(bookings);
        
        // Count completed bookings (those with CONFIRMED or COMPLETED status)
        long completedBookings = bookings.stream()
                .filter(booking -> booking.getStatus() == BookingStatus.CONFIRMED || 
                                  booking.getStatus() == BookingStatus.COMPLETED)
                .count();
        
        // Calculate conversion rate (completed / total * 100)
        double conversionRate = allBookingAttempts.size() > 0 ? 
                (completedBookings * 100.0 / allBookingAttempts.size()) : 0.0;
        
        report.setConversionRate(conversionRate);
        
        // Get promotion effectiveness data
        List<Map<String, Object>> promotionEffectiveness = new ArrayList<>();
        
        // Get all promotions from the repository
        List<Promotion> promotions = promotionRepository.findAll();
        
        if (!promotions.isEmpty()) {
            // For each promotion, create an entry with available data
            for (Promotion promotion : promotions) {
                Map<String, Object> promoData = new HashMap<>();
                promoData.put("code", promotion.getCode());
                promoData.put("usageCount", promotion.getCurrentUses());
                
                // Estimate revenue based on usage count and discount value
                // This is an approximation since we don't have direct booking-promotion relationship
                double avgBookingValue = totalRevenue / Math.max(1, bookings.size());
                double estimatedRevenue = avgBookingValue * promotion.getCurrentUses();
                promoData.put("revenue", estimatedRevenue);
                
                // Estimate discount amount based on promotion type and value
                double discountAmount = 0.0;
                if (promotion.getDiscountType() == Promotion.DiscountType.PERCENTAGE) {
                    discountAmount = estimatedRevenue * (promotion.getDiscountValue() / 100.0);
                } else if (promotion.getDiscountType() == Promotion.DiscountType.FIXED) {
                    discountAmount = promotion.getDiscountValue() * promotion.getCurrentUses();
                }
                promoData.put("discountAmount", discountAmount);
                
                // Calculate estimated conversion rate for this promotion
                double promoConversionRate = promotion.getCurrentUses() > 0 ? 
                        (estimatedRevenue / (estimatedRevenue + discountAmount)) * 100 : 0.0;
                promoData.put("conversionRate", promoConversionRate);
                
                promotionEffectiveness.add(promoData);
            }
        }
        
        // If no promotions were found or processed, add default empty promotions
        if (promotionEffectiveness.isEmpty()) {
            // Create empty promotion data with zero values
            Map<String, Object> defaultPromo = new HashMap<>();
            defaultPromo.put("code", "NONE");
            defaultPromo.put("usageCount", 0);
            defaultPromo.put("revenue", 0.0);
            defaultPromo.put("discountAmount", 0.0);
            defaultPromo.put("conversionRate", 0.0);
            defaultPromo.put("note", "No active promotions found");
            promotionEffectiveness.add(defaultPromo);
            
            // Log this situation for monitoring
            System.out.println("Warning: No promotion data found in the system.");
        }
        
        report.setPromotionEffectiveness(promotionEffectiveness);
        
        // Calculate revenue trend based on actual data
        String revenueTrend = calculateRevenueTrend(revenueByMonth);
        report.setRevenueTrend(revenueTrend);
        
        return report;
    }
    
    /**
     * Calculate the revenue trend based on monthly revenue data
     * 
     * @param revenueByMonth Map containing monthly revenue data
     * @return String representing the trend: "increasing", "decreasing", or "stable"
     */
    private String calculateRevenueTrend(Map<String, Double> revenueByMonth) {
        if (revenueByMonth == null || revenueByMonth.size() < 2) {
            return "stable"; // Not enough data to determine trend
        }
        
        // Sort the months chronologically
        List<String> sortedMonths = new ArrayList<>(revenueByMonth.keySet());
        Collections.sort(sortedMonths);
        
        // Get the last two months to determine the trend
        String previousMonth = sortedMonths.get(sortedMonths.size() - 2);
        String currentMonth = sortedMonths.get(sortedMonths.size() - 1);
        
        double previousRevenue = revenueByMonth.get(previousMonth);
        double currentRevenue = revenueByMonth.get(currentMonth);
        
        // Calculate percentage change
        double percentageChange = 0;
        if (previousRevenue > 0) {
            percentageChange = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
        }
        
        // Determine trend based on percentage change
        if (percentageChange >= 5) {
            return "increasing";
        } else if (percentageChange <= -5) {
            return "decreasing";
        } else {
            return "stable";
        }
    }
}