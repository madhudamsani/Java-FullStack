package com.showvault.service.impl;

import com.showvault.model.Booking;
import com.showvault.model.BookingPayment;
import com.showvault.model.Promotion;
import com.showvault.model.Show;
import com.showvault.model.ShowAnalytics;
import com.showvault.model.ShowSchedule;
import com.showvault.model.User;
import com.showvault.repository.BookingRepository;
import com.showvault.repository.PromotionRepository;
import com.showvault.repository.ShowRepository;
import com.showvault.repository.ShowScheduleRepository;
import com.showvault.repository.UserRatingRepository;
import com.showvault.service.ShowAnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ShowAnalyticsServiceImpl implements ShowAnalyticsService {

    @Autowired
    private ShowRepository showRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRatingRepository userRatingRepository;
    
    @Autowired
    private ShowScheduleRepository showScheduleRepository;

    @Autowired
    private PromotionRepository promotionRepository;

    @Override
    public ShowAnalytics getShowAnalytics(Long showId) {
        Optional<Show> showOpt = showRepository.findById(showId);
        if (showOpt.isPresent()) {
            return getShowAnalytics(showOpt.get());
        }
        return null;
    }

    @Override
    public ShowAnalytics getShowAnalytics(Show show) {
        ShowAnalytics analytics = new ShowAnalytics(show.getId(), show.getTitle());
        
        // Calculate basic metrics
        List<Booking> bookings = bookingRepository.findBookingsByShowId(show.getId());
        
        int totalTickets = bookings.stream()
                .mapToInt(booking -> booking.getSeatBookings().size())
                .sum();
        
        double totalRevenue = bookings.stream()
                .map(booking -> booking.getTotalAmount())
                .filter(Objects::nonNull)
                .map(BigDecimal::doubleValue)
                .mapToDouble(Double::doubleValue)
                .sum();
        
        analytics.setTotalTicketsSold(totalTickets);
        analytics.setTotalRevenue(totalRevenue);
        analytics.setTotalBookings(bookings.size());
        
        if (totalTickets > 0) {
            analytics.setAverageTicketPrice(totalRevenue / totalTickets);
        }
        
        // Calculate occupancy rate (assuming total capacity is available)
        int totalCapacity = 100; // This should be calculated based on venue capacity
        analytics.setOccupancyRate((double) totalTickets / totalCapacity * 100);
        
        // Bookings by status
        Map<String, Integer> bookingsByStatus = bookings.stream()
                .collect(Collectors.groupingBy(
                        booking -> booking.getStatus().toString(),
                        Collectors.summingInt(booking -> 1)
                ));
        analytics.setBookingsByStatus(bookingsByStatus);
        
        // Revenue by date
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Map<String, Double> revenueByDate = bookings.stream()
                .filter(booking -> booking.getBookingDate() != null)
                .collect(Collectors.groupingBy(
                        booking -> booking.getBookingDate().format(formatter),
                        Collectors.summingDouble(booking -> booking.getTotalAmount() != null ? 
                                booking.getTotalAmount().doubleValue() : 0.0)
                ));
        analytics.setRevenueByDate(revenueByDate);
        
        // Tickets by date
        Map<String, Integer> ticketsByDate = bookings.stream()
                .filter(booking -> booking.getBookingDate() != null)
                .collect(Collectors.groupingBy(
                        booking -> booking.getBookingDate().format(formatter),
                        Collectors.summingInt(booking -> booking.getSeatBookings().size())
                ));
        analytics.setTicketsByDate(ticketsByDate);
        
        // Calculate audience demographics from user data
        Map<String, Integer> audienceDemographics = new HashMap<>();
        
        // This would be implemented to query user demographics from bookings
        // For now, we'll use a placeholder implementation with some reasonable defaults
        audienceDemographics.put("18-24", 15);
        audienceDemographics.put("25-34", 30);
        audienceDemographics.put("35-44", 25);
        audienceDemographics.put("45-54", 20);
        audienceDemographics.put("55+", 10);
        analytics.setAudienceDemographics(audienceDemographics);
        
        // Calculate popular performances from booking data
        List<Map<String, Object>> popularPerformances = new ArrayList<>();
        
        // Group bookings by show schedule
        Map<String, List<Booking>> bookingsByPerformance = new HashMap<>();
        
        for (Booking booking : bookings) {
            if (booking.getShowSchedule() != null) {
                String key = booking.getShowSchedule().getShowDate() + 
                        (booking.getShowSchedule().getStartTime() != null ? 
                        " " + booking.getShowSchedule().getStartTime() : "");
                
                if (!bookingsByPerformance.containsKey(key)) {
                    bookingsByPerformance.put(key, new ArrayList<>());
                }
                bookingsByPerformance.get(key).add(booking);
            }
        }
        
        // Calculate tickets sold and revenue for each performance
        bookingsByPerformance.forEach((performance, performanceBookings) -> {
            String[] parts = performance.split(" ");
            String date = parts[0];
            String time = parts.length > 1 ? parts[1] : "19:30"; // Default time if not specified
            
            int ticketsSold = performanceBookings.stream()
                    .mapToInt(booking -> booking.getSeatBookings().size())
                    .sum();
            
            double revenue = performanceBookings.stream()
                    .map(booking -> booking.getTotalAmount())
                    .filter(Objects::nonNull)
                    .map(BigDecimal::doubleValue)
                    .mapToDouble(Double::doubleValue)
                    .sum();
            
            Map<String, Object> performanceData = new HashMap<>();
            performanceData.put("date", date);
            performanceData.put("time", time);
            performanceData.put("ticketsSold", ticketsSold);
            performanceData.put("revenue", revenue);
            
            popularPerformances.add(performanceData);
        });
        
        // Sort by tickets sold (descending)
        popularPerformances.sort((a, b) -> 
                Integer.compare((Integer) b.get("ticketsSold"), (Integer) a.get("ticketsSold")));
        
        // Limit to top performances
        if (popularPerformances.size() > 5) {
            analytics.setPopularPerformances(popularPerformances.subList(0, 5));
        } else {
            analytics.setPopularPerformances(popularPerformances);
        }
        
        // Calculate sales by price category
        List<Map<String, Object>> salesByPriceCategory = new ArrayList<>();
        
        // Group seat bookings by category
        Map<String, List<Booking>> bookingsByCategory = new HashMap<>();
        
        // This would be implemented to group bookings by seat category
        // For now, we'll use default categories
        
        // Use default categories
        Map<String, Object> vipCategory = new HashMap<>();
        vipCategory.put("category", "VIP");
        vipCategory.put("ticketsSold", 30);
        vipCategory.put("revenue", 3000.0);
        salesByPriceCategory.add(vipCategory);
        
        Map<String, Object> standardCategory = new HashMap<>();
        standardCategory.put("category", "Standard");
        standardCategory.put("ticketsSold", 80);
        standardCategory.put("revenue", 4000.0);
        salesByPriceCategory.add(standardCategory);
        
        Map<String, Object> economyCategory = new HashMap<>();
        economyCategory.put("category", "Economy");
        economyCategory.put("ticketsSold", 40);
        economyCategory.put("revenue", 1600.0);
        salesByPriceCategory.add(economyCategory);
        
        analytics.setSalesByPriceCategory(salesByPriceCategory);
        
        // Calculate bookings by platform
        Map<String, Integer> bookingsByPlatform = new HashMap<>();
        
        // Use default platforms
        bookingsByPlatform = new HashMap<>();
        bookingsByPlatform.put("Web", 70);
        bookingsByPlatform.put("Mobile", 25);
        bookingsByPlatform.put("Box Office", 5);
        
        analytics.setBookingsByPlatform(bookingsByPlatform);
        
        // Calculate views by source (this would typically come from analytics data)
        // For now, we'll use placeholder data
        Map<String, Integer> viewsBySource = new HashMap<>();
        viewsBySource.put("Direct", 40);
        viewsBySource.put("Social Media", 30);
        viewsBySource.put("Search", 20);
        viewsBySource.put("Email", 10);
        analytics.setViewsBySource(viewsBySource);
        
        // Calculate conversion rates (this would typically come from analytics data)
        // For now, we'll use placeholder data
        Map<String, Integer> conversionRates = new HashMap<>();
        conversionRates.put("View to Booking", 15);
        conversionRates.put("Cart to Checkout", 60);
        conversionRates.put("Checkout to Purchase", 85);
        analytics.setConversionRates(conversionRates);
        
        // Get recent bookings
        List<Map<String, Object>> recentBookings = bookings.stream()
                .filter(booking -> booking.getBookingDate() != null)
                .sorted(Comparator.comparing(Booking::getBookingDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(5)
                .map(booking -> {
                    Map<String, Object> bookingData = new HashMap<>();
                    bookingData.put("id", booking.getId());
                    bookingData.put("user", booking.getUser().getFirstName() + " " + booking.getUser().getLastName());
                    bookingData.put("tickets", booking.getSeatBookings().size());
                    bookingData.put("amount", booking.getTotalAmount() != null ? booking.getTotalAmount().doubleValue() : 0.0);
                    bookingData.put("date", booking.getBookingDate() != null ? booking.getBookingDate().toLocalDate().toString() : "");
                    return bookingData;
                })
                .collect(Collectors.toList());
        
        analytics.setRecentBookings(recentBookings);
        
        // Calculate promotion effectiveness
        Map<String, Double> promotionEffectiveness = new HashMap<>();
        
        // Use default data for promotion effectiveness
        promotionEffectiveness.put("SPRING20", 15.0);
        promotionEffectiveness.put("SUMMER10", 8.0);
        promotionEffectiveness.put("EARLYBIRD", 22.0);
        
        analytics.setPromotionEffectiveness(promotionEffectiveness);
        
        return analytics;
    }

    @Override
    public Map<String, Object> getOrganizerDashboardStats(User organizer) {
        return getOrganizerDashboardStats(organizer, LocalDate.now().minusMonths(1), LocalDate.now());
    }

    @Override
    public Map<String, Object> getOrganizerDashboardStats(User organizer, LocalDate startDate, LocalDate endDate) {
        // Get all shows created by the organizer
        List<Show> shows = showRepository.findByCreatedById(organizer.getId());
        
        // Log for debugging
        System.out.println("Found " + shows.size() + " shows for organizer ID: " + organizer.getId());
        
        // Update show statuses based on current date
        updateShowStatuses(shows);
        
        // Calculate total revenue, tickets sold, and bookings
        double totalRevenue = 0;
        int totalTickets = 0;
        int totalBookings = 0;
        
        // For revenue by day calculation
        Map<String, Double> revenueByDay = new HashMap<>();
        DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        
        // For active shows count
        long activeShows = 0;
        long upcomingShows = 0;
        
        // For revenue by month calculation
        Map<String, Double> revenueByMonth = new HashMap<>();
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("yyyy-MM");
        
        // For tickets sold by show
        Map<Long, Integer> ticketsSoldByShow = new HashMap<>();
        Map<Long, String> showTitles = new HashMap<>();
        
        for (Show show : shows) {
            List<Booking> bookings = bookingRepository.findBookingsByShowId(show.getId());
            
            // Filter bookings by date range if specified
            List<Booking> filteredBookings = bookings;
            if (startDate != null && endDate != null) {
                filteredBookings = bookings.stream()
                        .filter(booking -> booking.getBookingDate() != null &&
                                !booking.getBookingDate().toLocalDate().isBefore(startDate) &&
                                !booking.getBookingDate().toLocalDate().isAfter(endDate))
                        .collect(Collectors.toList());
            }
            
            // Calculate revenue and tickets for this show
            double showRevenue = filteredBookings.stream()
                    .map(booking -> booking.getTotalAmount())
                    .filter(Objects::nonNull)
                    .map(BigDecimal::doubleValue)
                    .mapToDouble(Double::doubleValue)
                    .sum();
            
            int showTickets = filteredBookings.stream()
                    .mapToInt(booking -> booking.getSeatBookings().size())
                    .sum();
            
            // Add to totals
            totalRevenue += showRevenue;
            totalTickets += showTickets;
            totalBookings += filteredBookings.size();
            
            // Store tickets sold by show
            ticketsSoldByShow.put(show.getId(), showTickets);
            showTitles.put(show.getId(), show.getTitle());
            
            // Calculate revenue by day
            for (Booking booking : filteredBookings) {
                if (booking.getBookingDate() != null && booking.getTotalAmount() != null) {
                    String day = booking.getBookingDate().format(dayFormatter);
                    double amount = booking.getTotalAmount().doubleValue();
                    
                    revenueByDay.put(day, revenueByDay.getOrDefault(day, 0.0) + amount);
                    
                    // Also calculate revenue by month
                    String month = booking.getBookingDate().format(monthFormatter);
                    revenueByMonth.put(month, revenueByMonth.getOrDefault(month, 0.0) + amount);
                }
            }
            
            // Count active and upcoming shows
            if (show.getStatus() != null) {
                String status = show.getStatus().toString();
                System.out.println("Show ID: " + show.getId() + ", Title: " + show.getTitle() + ", Status: " + status);
                
                if (status.equals("ONGOING")) {
                    activeShows++;
                    System.out.println("Counted as active show: " + show.getTitle());
                } else if (status.equals("UPCOMING")) {
                    upcomingShows++;
                    System.out.println("Counted as upcoming show: " + show.getTitle());
                }
            }
        }
        
        // Calculate average rating
        double averageRating = 0;
        long ratingCount = 0;
        
        for (Show show : shows) {
            Double showRating = userRatingRepository.getAverageRatingForShow(show);
            Long showRatingCount = userRatingRepository.getCountForShow(show);
            
            if (showRating != null && showRatingCount != null) {
                averageRating += showRating * showRatingCount;
                ratingCount += showRatingCount;
            }
        }
        
        if (ratingCount > 0) {
            averageRating /= ratingCount;
        }
        
        // Count shows by status
        Map<String, Long> showsByStatus = shows.stream()
                .collect(Collectors.groupingBy(
                        show -> show.getStatus().toString(),
                        Collectors.counting()
                ));
        
        // Create response
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalShows", shows.size());
        stats.put("activeShows", activeShows);
        stats.put("upcomingShows", upcomingShows);
        stats.put("totalRevenue", totalRevenue);
        stats.put("totalTicketsSold", totalTickets);
        stats.put("totalBookings", totalBookings);
        stats.put("averageRating", averageRating);
        stats.put("showsByStatus", showsByStatus);
        
        // Add revenue by day from actual data
        stats.put("revenueByDay", revenueByDay);
        
        // Convert revenue by month to list format for frontend
        List<Map<String, Object>> revenueByMonthList = new ArrayList<>();
        for (Map.Entry<String, Double> entry : revenueByMonth.entrySet()) {
            Map<String, Object> monthData = new HashMap<>();
            monthData.put("month", entry.getKey());
            monthData.put("revenue", entry.getValue());
            // Also add 'amount' for compatibility with frontend
            monthData.put("amount", entry.getValue());
            revenueByMonthList.add(monthData);
        }
        stats.put("revenueByMonth", revenueByMonthList);
        
        // Convert tickets sold by show to list format for frontend
        List<Map<String, Object>> ticketsSoldByShowList = new ArrayList<>();
        for (Map.Entry<Long, Integer> entry : ticketsSoldByShow.entrySet()) {
            if (entry.getValue() > 0) { // Only include shows with tickets sold
                Map<String, Object> showData = new HashMap<>();
                showData.put("showId", entry.getKey());
                showData.put("showTitle", showTitles.get(entry.getKey()));
                showData.put("ticketsSold", entry.getValue());
                ticketsSoldByShowList.add(showData);
            }
        }
        
        // Sort by tickets sold (descending) and limit to top 5
        ticketsSoldByShowList.sort((a, b) -> 
                Integer.compare((Integer) b.get("ticketsSold"), (Integer) a.get("ticketsSold")));
        
        if (ticketsSoldByShowList.size() > 5) {
            ticketsSoldByShowList = ticketsSoldByShowList.subList(0, 5);
        }
        
        stats.put("ticketsSoldByShow", ticketsSoldByShowList);
        
        // Add top performing shows by revenue
        List<Map<String, Object>> topShows = getTopPerformingShows(organizer, 5);
        stats.put("topShows", topShows);
        
        return stats;
    }

    @Override
    public List<Map<String, Object>> getTopPerformingShows(User organizer, int limit) {
        // Get all shows created by the organizer
        List<Show> shows = showRepository.findByCreatedById(organizer.getId());
        
        // Calculate revenue for each show
        List<Map<String, Object>> topShows = new ArrayList<>();
        
        for (Show show : shows) {
            List<Booking> bookings = bookingRepository.findBookingsByShowId(show.getId());
            
            double revenue = bookings.stream()
                    .map(booking -> booking.getTotalAmount())
                    .filter(Objects::nonNull)
                    .map(BigDecimal::doubleValue)
                    .mapToDouble(Double::doubleValue)
                    .sum();
            
            int tickets = bookings.stream()
                    .mapToInt(booking -> booking.getSeatBookings().size())
                    .sum();
            
            Double rating = userRatingRepository.getAverageRatingForShow(show);
            
            Map<String, Object> showData = new HashMap<>();
            showData.put("id", show.getId());
            showData.put("title", show.getTitle());
            showData.put("revenue", revenue);
            showData.put("ticketsSold", tickets);
            showData.put("rating", rating != null ? rating : 0);
            
            topShows.add(showData);
        }
        
        // Sort by revenue (descending) and limit
        topShows.sort((a, b) -> Double.compare((Double) b.get("revenue"), (Double) a.get("revenue")));
        
        if (topShows.size() > limit) {
            topShows = topShows.subList(0, limit);
        }
        
        return topShows;
    }
    
    /**
     * Updates show statuses based on their schedules and the current date
     * This is a helper method to ensure shows have the correct status
     */
    private void updateShowStatuses(List<Show> shows) {
        LocalDate today = LocalDate.now();
        
        for (Show show : shows) {
            // Skip if the show is cancelled
            if (show.getStatus() == Show.ShowStatus.CANCELLED) {
                continue;
            }
            
            List<ShowSchedule> schedules = showScheduleRepository.findByShowId(show.getId());
            
            if (schedules.isEmpty()) {
                continue;
            }
            
            // Find the earliest and latest schedule dates
            LocalDate earliestDate = schedules.stream()
                .map(schedule -> schedule.getShowDate())
                .min(LocalDate::compareTo)
                .orElse(null);
                
            LocalDate latestDate = schedules.stream()
                .map(schedule -> schedule.getShowDate())
                .max(LocalDate::compareTo)
                .orElse(null);
                
            if (earliestDate == null || latestDate == null) {
                continue;
            }
            
            // Update status based on dates
            Show.ShowStatus newStatus;
            
            if (today.isBefore(earliestDate)) {
                newStatus = Show.ShowStatus.UPCOMING;
            } else if (today.isAfter(latestDate)) {
                newStatus = Show.ShowStatus.COMPLETED;
            } else {
                newStatus = Show.ShowStatus.ONGOING;
            }
            
            // Only update if status has changed
            if (show.getStatus() != newStatus) {
                System.out.println("Updating show status: " + show.getTitle() + 
                    " from " + show.getStatus() + " to " + newStatus);
                show.setStatus(newStatus);
                showRepository.save(show);
            }
        }
    }

    @Override
    public Map<String, Object> getShowPerformanceMetrics(Long showId) {
        Optional<Show> showOpt = showRepository.findById(showId);
        if (!showOpt.isPresent()) {
            return Collections.emptyMap();
        }
        
        Show show = showOpt.get();
        List<Booking> bookings = bookingRepository.findBookingsByShowId(showId);
        
        // Calculate metrics
        int totalTickets = bookings.stream()
                .mapToInt(booking -> booking.getSeatBookings().size())
                .sum();
        
        double totalRevenue = bookings.stream()
                .map(booking -> booking.getTotalAmount())
                .filter(Objects::nonNull)
                .map(BigDecimal::doubleValue)
                .mapToDouble(Double::doubleValue)
                .sum();
        
        Double averageRating = userRatingRepository.getAverageRatingForShow(show);
        Long ratingCount = userRatingRepository.getCountForShow(show);
        
        // Create response
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("showId", show.getId());
        metrics.put("title", show.getTitle());
        metrics.put("totalTicketsSold", totalTickets);
        metrics.put("totalRevenue", totalRevenue);
        metrics.put("totalBookings", bookings.size());
        metrics.put("averageRating", averageRating != null ? averageRating : 0);
        metrics.put("ratingCount", ratingCount != null ? ratingCount : 0);
        
        // Mock data for other metrics (in a real implementation, these would be calculated from actual data)
        metrics.put("conversionRate", 15.5);
        metrics.put("viewCount", 2500);
        metrics.put("clickThroughRate", 22.3);
        
        return metrics;
    }

    @Override
    public Map<String, Object> getAudienceInsights(Long showId) {
        // This would be implemented with real data in a production environment
        // For now, we'll return mock data
        Map<String, Object> insights = new HashMap<>();
        
        Map<String, Integer> demographics = new HashMap<>();
        demographics.put("18-24", 15);
        demographics.put("25-34", 30);
        demographics.put("35-44", 25);
        demographics.put("45-54", 20);
        demographics.put("55+", 10);
        insights.put("demographics", demographics);
        
        Map<String, Integer> locations = new HashMap<>();
        locations.put("New York", 40);
        locations.put("Los Angeles", 15);
        locations.put("Chicago", 10);
        locations.put("Houston", 8);
        locations.put("Other", 27);
        insights.put("locations", locations);
        
        Map<String, Integer> devices = new HashMap<>();
        devices.put("Desktop", 45);
        devices.put("Mobile", 40);
        devices.put("Tablet", 15);
        insights.put("devices", devices);
        
        Map<String, Integer> bookingTimes = new HashMap<>();
        bookingTimes.put("Morning", 15);
        bookingTimes.put("Afternoon", 30);
        bookingTimes.put("Evening", 45);
        bookingTimes.put("Night", 10);
        insights.put("bookingTimes", bookingTimes);
        
        return insights;
    }

    @Override
    public Map<String, Object> getSalesAnalytics(Long showId) {
        Optional<Show> showOpt = showRepository.findById(showId);
        if (!showOpt.isPresent()) {
            return Collections.emptyMap();
        }
        
        Show show = showOpt.get();
        List<Booking> bookings = bookingRepository.findBookingsByShowId(show.getId());
        
        // Calculate sales metrics
        double totalRevenue = bookings.stream()
                .map(booking -> booking.getTotalAmount())
                .filter(Objects::nonNull)
                .map(BigDecimal::doubleValue)
                .mapToDouble(Double::doubleValue)
                .sum();
        
        int totalTickets = bookings.stream()
                .mapToInt(booking -> booking.getSeatBookings().size())
                .sum();
        
        // Group bookings by date
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Map<String, Double> revenueByDate = bookings.stream()
                .filter(booking -> booking.getBookingDate() != null)
                .collect(Collectors.groupingBy(
                        booking -> booking.getBookingDate().format(formatter),
                        Collectors.summingDouble(booking -> booking.getTotalAmount() != null ? 
                                booking.getTotalAmount().doubleValue() : 0.0)
                ));
        
        Map<String, Integer> ticketsByDate = bookings.stream()
                .filter(booking -> booking.getBookingDate() != null)
                .collect(Collectors.groupingBy(
                        booking -> booking.getBookingDate().format(formatter),
                        Collectors.summingInt(booking -> booking.getSeatBookings().size())
                ));
        
        // Create response
        Map<String, Object> analytics = new HashMap<>();
        analytics.put("totalRevenue", totalRevenue);
        analytics.put("totalTickets", totalTickets);
        analytics.put("revenueByDate", revenueByDate);
        analytics.put("ticketsByDate", ticketsByDate);
        
        // Mock data for other metrics (in a real implementation, these would be calculated from actual data)
        List<Map<String, Object>> salesByPriceCategory = new ArrayList<>();
        
        Map<String, Object> vipCategory = new HashMap<>();
        vipCategory.put("category", "VIP");
        vipCategory.put("ticketsSold", 30);
        vipCategory.put("revenue", 3000.0);
        salesByPriceCategory.add(vipCategory);
        
        Map<String, Object> standardCategory = new HashMap<>();
        standardCategory.put("category", "Standard");
        standardCategory.put("ticketsSold", 80);
        standardCategory.put("revenue", 4000.0);
        salesByPriceCategory.add(standardCategory);
        
        Map<String, Object> economyCategory = new HashMap<>();
        economyCategory.put("category", "Economy");
        economyCategory.put("ticketsSold", 40);
        economyCategory.put("revenue", 1600.0);
        salesByPriceCategory.add(economyCategory);
        
        analytics.put("salesByPriceCategory", salesByPriceCategory);
        
        return analytics;
    }

    @Override
    public Map<String, Object> getPromotionAnalytics(Long showId) {
        // This would be implemented with real data in a production environment
        // For now, we'll return mock data
        Map<String, Object> analytics = new HashMap<>();
        
        List<Map<String, Object>> promotions = new ArrayList<>();
        
        Map<String, Object> spring20 = new HashMap<>();
        spring20.put("code", "SPRING20");
        spring20.put("usageCount", 45);
        spring20.put("revenue", 2250.0);
        spring20.put("discountAmount", 450.0);
        promotions.add(spring20);
        
        Map<String, Object> summer10 = new HashMap<>();
        summer10.put("code", "SUMMER10");
        summer10.put("usageCount", 30);
        summer10.put("revenue", 1500.0);
        summer10.put("discountAmount", 150.0);
        promotions.add(summer10);
        
        Map<String, Object> earlyBird = new HashMap<>();
        earlyBird.put("code", "EARLYBIRD");
        earlyBird.put("usageCount", 60);
        earlyBird.put("revenue", 3000.0);
        earlyBird.put("discountAmount", 600.0);
        promotions.add(earlyBird);
        
        analytics.put("promotions", promotions);
        analytics.put("totalPromotionUsage", 135);
        analytics.put("totalDiscountAmount", 1200.0);
        analytics.put("totalRevenueWithPromotion", 6750.0);
        
        return analytics;
    }

    @Override
    public Map<String, Object> getBookingTrends(Long showId, LocalDate startDate, LocalDate endDate) {
        Optional<Show> showOpt = showRepository.findById(showId);
        if (!showOpt.isPresent()) {
            return Collections.emptyMap();
        }
        
        Show show = showOpt.get();
        List<Booking> bookings = bookingRepository.findBookingsByShowId(show.getId());
        
        // Filter bookings by date range
        List<Booking> filteredBookings = bookings.stream()
                .filter(booking -> booking.getBookingDate() != null)
                .filter(booking -> !booking.getBookingDate().toLocalDate().isBefore(startDate) && !booking.getBookingDate().toLocalDate().isAfter(endDate))
                .collect(Collectors.toList());
        
        // Group bookings by date
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Map<String, Integer> bookingsByDate = filteredBookings.stream()
                .collect(Collectors.groupingBy(
                        booking -> booking.getBookingDate().format(formatter),
                        Collectors.summingInt(booking -> 1)
                ));
        
        Map<String, Double> revenueByDate = filteredBookings.stream()
                .collect(Collectors.groupingBy(
                        booking -> booking.getBookingDate().format(formatter),
                        Collectors.summingDouble(booking -> booking.getTotalAmount() != null ? 
                                booking.getTotalAmount().doubleValue() : 0.0)
                ));
        
        // Create response
        Map<String, Object> trends = new HashMap<>();
        trends.put("bookingsByDate", bookingsByDate);
        trends.put("revenueByDate", revenueByDate);
        trends.put("totalBookings", filteredBookings.size());
        trends.put("totalRevenue", filteredBookings.stream()
                .map(booking -> booking.getTotalAmount())
                .filter(Objects::nonNull)
                .map(BigDecimal::doubleValue)
                .mapToDouble(Double::doubleValue)
                .sum());
        
        return trends;
    }

    @Override
    public Map<String, Object> getRevenueBreakdown(Long showId) {
        // This would be implemented with real data in a production environment
        // For now, we'll return mock data
        Map<String, Object> breakdown = new HashMap<>();
        
        breakdown.put("ticketSales", 8500.0);
        breakdown.put("merchandiseSales", 1200.0);
        breakdown.put("concessionSales", 800.0);
        breakdown.put("totalRevenue", 10500.0);
        
        List<Map<String, Object>> revenueByCategory = new ArrayList<>();
        
        Map<String, Object> ticketSales = new HashMap<>();
        ticketSales.put("category", "Ticket Sales");
        ticketSales.put("amount", 8500.0);
        ticketSales.put("percentage", 81.0);
        revenueByCategory.add(ticketSales);
        
        Map<String, Object> merchandise = new HashMap<>();
        merchandise.put("category", "Merchandise");
        merchandise.put("amount", 1200.0);
        merchandise.put("percentage", 11.4);
        revenueByCategory.add(merchandise);
        
        Map<String, Object> concessions = new HashMap<>();
        concessions.put("category", "Concessions");
        concessions.put("amount", 800.0);
        concessions.put("percentage", 7.6);
        revenueByCategory.add(concessions);
        
        breakdown.put("revenueByCategory", revenueByCategory);
        
        return breakdown;
    }

    @Override
    public Map<String, Object> getOccupancyRates(Long showId) {
        Optional<Show> showOpt = showRepository.findById(showId);
        if (!showOpt.isPresent()) {
            return Collections.emptyMap();
        }
        
        Show show = showOpt.get();
        List<Booking> bookings = bookingRepository.findBookingsByShowId(show.getId());
        
        // Calculate occupancy rate (assuming total capacity is available)
        int totalCapacity = 100; // This should be calculated based on venue capacity
        
        int totalTickets = bookings.stream()
                .mapToInt(booking -> booking.getSeatBookings().size())
                .sum();
        
        double occupancyRate = (double) totalTickets / totalCapacity * 100;
        
        // Create response
        Map<String, Object> occupancy = new HashMap<>();
        
        List<Map<String, Object>> occupancyByPerformance = new ArrayList<>();
        
        Map<String, Object> performance1 = new HashMap<>();
        performance1.put("date", "2024-05-15");
        performance1.put("time", "19:30");
        performance1.put("totalSeats", 200);
        performance1.put("soldSeats", 180);
        performance1.put("occupancyRate", 90.0);
        occupancyByPerformance.add(performance1);
        
        Map<String, Object> performance2 = new HashMap<>();
        performance2.put("date", "2024-05-16");
        performance2.put("time", "19:30");
        performance2.put("totalSeats", 200);
        performance2.put("soldSeats", 160);
        performance2.put("occupancyRate", 80.0);
        occupancyByPerformance.add(performance2);
        
        Map<String, Object> performance3 = new HashMap<>();
        performance3.put("date", "2024-05-17");
        performance3.put("time", "19:30");
        performance3.put("totalSeats", 200);
        performance3.put("soldSeats", 190);
        performance3.put("occupancyRate", 95.0);
        occupancyByPerformance.add(performance3);
        
        occupancy.put("occupancyByPerformance", occupancyByPerformance);
        occupancy.put("averageOccupancyRate", 88.3);
        occupancy.put("totalCapacity", 600);
        occupancy.put("totalSoldSeats", 530);
        occupancy.put("overallOccupancyRate", occupancyRate);
        
        return occupancy;
    }
    
    @Override
    public Map<String, Object> getSalesReport(User organizer, LocalDate dateFrom, LocalDate dateTo, Long showId) {
        Map<String, Object> salesReport = new HashMap<>();
        
        // Get shows created by the organizer
        List<Show> shows;
        if (showId != null) {
            Optional<Show> showOpt = showRepository.findById(showId);
            shows = showOpt.map(Collections::singletonList).orElse(Collections.emptyList());
        } else {
            shows = showRepository.findByCreatedById(organizer.getId());
        }
        
        // Calculate total revenue, tickets sold, and bookings
        double totalRevenue = 0;
        int totalTickets = 0;
        int totalBookings = 0;
        
        // For revenue by category calculation
        Map<String, Double> revenueByCategory = new HashMap<>();
        
        // For top selling venues calculation
        Map<Long, Integer> ticketsByVenue = new HashMap<>();
        Map<Long, String> venueNames = new HashMap<>();
        
        // For revenue by payment method calculation
        Map<String, Double> revenueByPaymentMethod = new HashMap<>();
        
        for (Show show : shows) {
            List<Booking> bookings = bookingRepository.findBookingsByShowId(show.getId());
            
            // Filter by date if specified
            if (dateFrom != null && dateTo != null) {
                bookings = bookings.stream()
                        .filter(booking -> booking.getBookingDate() != null &&
                                !booking.getBookingDate().toLocalDate().isBefore(dateFrom) &&
                                !booking.getBookingDate().toLocalDate().isAfter(dateTo))
                        .collect(Collectors.toList());
            }
            
            // Calculate revenue and tickets for this show
            double showRevenue = bookings.stream()
                    .map(booking -> booking.getTotalAmount())
                    .filter(Objects::nonNull)
                    .map(BigDecimal::doubleValue)
                    .mapToDouble(Double::doubleValue)
                    .sum();
            
            int showTickets = bookings.stream()
                    .mapToInt(booking -> booking.getSeatBookings().size())
                    .sum();
            
            // Add to totals
            totalRevenue += showRevenue;
            totalTickets += showTickets;
            totalBookings += bookings.size();
            
            // Add to revenue by category
            String category = show.getGenre() != null ? show.getGenre() : "Other";
            revenueByCategory.put(category, revenueByCategory.getOrDefault(category, 0.0) + showRevenue);
            
            // Process venue data
            for (Booking booking : bookings) {
                if (booking.getShowSchedule() != null && booking.getShowSchedule().getVenue() != null) {
                    Long venueId = booking.getShowSchedule().getVenue().getId();
                    String venueName = booking.getShowSchedule().getVenue().getName();
                    
                    int ticketCount = booking.getSeatBookings().size();
                    ticketsByVenue.put(venueId, ticketsByVenue.getOrDefault(venueId, 0) + ticketCount);
                    venueNames.put(venueId, venueName);
                }
                
                // Process payment method data from booking payments
                if (booking.getPayments() != null && !booking.getPayments().isEmpty() && booking.getTotalAmount() != null) {
                    for (BookingPayment payment : booking.getPayments()) {
                        if (payment.getMethod() != null) {
                            String paymentMethod = payment.getMethod().getDisplayName();
                            double amount = payment.getAmount() != null ? 
                                payment.getAmount().doubleValue() : booking.getTotalAmount().doubleValue();
                            
                            revenueByPaymentMethod.put(paymentMethod, revenueByPaymentMethod.getOrDefault(paymentMethod, 0.0) + amount);
                        }
                    }
                } else if (booking.getTotalAmount() != null) {
                    // If no payment details, use "Other" as default
                    String paymentMethod = "Other";
                    double amount = booking.getTotalAmount().doubleValue();
                    
                    revenueByPaymentMethod.put(paymentMethod, revenueByPaymentMethod.getOrDefault(paymentMethod, 0.0) + amount);
                }
            }
        }
        
        // Calculate average ticket price
        double averageTicketPrice = totalTickets > 0 ? totalRevenue / totalTickets : 0;
        
        // Calculate occupancy rate based on actual venue capacities
        int totalCapacity = 0;
        for (Show show : shows) {
            // Get all schedules for this show
            List<Booking> bookings = bookingRepository.findBookingsByShowId(show.getId());
            
            // Get unique schedules from bookings
            Set<Long> scheduleIds = bookings.stream()
                    .filter(b -> b.getShowSchedule() != null)
                    .map(b -> b.getShowSchedule().getId())
                    .collect(Collectors.toSet());
            
            // For each schedule, add its capacity to the total
            for (Long scheduleId : scheduleIds) {
                // In a real implementation, we would query the schedule's venue capacity
                // For now, use a reasonable default based on venue type
                int scheduleCapacity = 100; // Default capacity
                
                // Try to get actual capacity from the booking's schedule
                Optional<Booking> bookingWithSchedule = bookings.stream()
                        .filter(b -> b.getShowSchedule() != null && b.getShowSchedule().getId().equals(scheduleId))
                        .findFirst();
                
                if (bookingWithSchedule.isPresent() && bookingWithSchedule.get().getShowSchedule().getVenue() != null) {
                    int venueCapacity = bookingWithSchedule.get().getShowSchedule().getVenue().getCapacity();
                    if (venueCapacity > 0) {
                        scheduleCapacity = venueCapacity;
                    }
                }
                
                totalCapacity += scheduleCapacity;
            }
        }
        
        double occupancyRate = totalCapacity > 0 ? (double) totalTickets / totalCapacity * 100 : 0;
        
        // Create response
        salesReport.put("totalRevenue", totalRevenue);
        salesReport.put("ticketsSold", totalTickets);
        salesReport.put("averageTicketPrice", averageTicketPrice);
        salesReport.put("occupancyRate", occupancyRate);
        salesReport.put("totalCapacity", totalCapacity);
        salesReport.put("totalBookings", totalBookings);
        
        // Revenue by show
        List<Map<String, Object>> revenueByShow = new ArrayList<>();
        for (Show show : shows) {
            List<Booking> bookings = bookingRepository.findBookingsByShowId(show.getId());
            
            // Filter by date if specified
            if (dateFrom != null && dateTo != null) {
                bookings = bookings.stream()
                        .filter(booking -> booking.getBookingDate() != null &&
                                !booking.getBookingDate().toLocalDate().isBefore(dateFrom) &&
                                !booking.getBookingDate().toLocalDate().isAfter(dateTo))
                        .collect(Collectors.toList());
            }
            
            double revenue = bookings.stream()
                    .map(booking -> booking.getTotalAmount())
                    .filter(Objects::nonNull)
                    .map(BigDecimal::doubleValue)
                    .mapToDouble(Double::doubleValue)
                    .sum();
            
            int tickets = bookings.stream()
                    .mapToInt(booking -> booking.getSeatBookings().size())
                    .sum();
            
            Map<String, Object> showData = new HashMap<>();
            showData.put("showId", show.getId());
            showData.put("showTitle", show.getTitle());
            showData.put("revenue", revenue);
            showData.put("ticketsSold", tickets);
            
            revenueByShow.add(showData);
        }
        salesReport.put("revenueByShow", revenueByShow);
        
        // Revenue by month
        Map<String, Double> revenueByMonth = new HashMap<>();
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("yyyy-MM");
        
        for (Show show : shows) {
            List<Booking> bookings = bookingRepository.findBookingsByShowId(show.getId());
            
            // Filter by date if specified
            if (dateFrom != null && dateTo != null) {
                bookings = bookings.stream()
                        .filter(booking -> booking.getBookingDate() != null &&
                                !booking.getBookingDate().toLocalDate().isBefore(dateFrom) &&
                                !booking.getBookingDate().toLocalDate().isAfter(dateTo))
                        .collect(Collectors.toList());
            }
            
            for (Booking booking : bookings) {
                if (booking.getBookingDate() != null && booking.getTotalAmount() != null) {
                    String month = booking.getBookingDate().format(monthFormatter);
                    double amount = booking.getTotalAmount().doubleValue();
                    
                    revenueByMonth.put(month, revenueByMonth.getOrDefault(month, 0.0) + amount);
                }
            }
        }
        
        // Convert to list of maps for easier consumption by frontend
        List<Map<String, Object>> revenueByMonthList = new ArrayList<>();
        for (Map.Entry<String, Double> entry : revenueByMonth.entrySet()) {
            Map<String, Object> monthData = new HashMap<>();
            monthData.put("month", entry.getKey());
            monthData.put("amount", entry.getValue());
            // Also add 'revenue' for compatibility with frontend
            monthData.put("revenue", entry.getValue());
            revenueByMonthList.add(monthData);
        }
        salesReport.put("revenueByMonth", revenueByMonthList);
        
        // Sales by day
        Map<String, Double> salesByDay = new HashMap<>();
        DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        
        for (Show show : shows) {
            List<Booking> bookings = bookingRepository.findBookingsByShowId(show.getId());
            
            // Filter by date if specified
            if (dateFrom != null && dateTo != null) {
                bookings = bookings.stream()
                        .filter(booking -> booking.getBookingDate() != null &&
                                !booking.getBookingDate().toLocalDate().isBefore(dateFrom) &&
                                !booking.getBookingDate().toLocalDate().isAfter(dateTo))
                        .collect(Collectors.toList());
            }
            
            for (Booking booking : bookings) {
                if (booking.getBookingDate() != null && booking.getTotalAmount() != null) {
                    String day = booking.getBookingDate().format(dayFormatter);
                    double amount = booking.getTotalAmount().doubleValue();
                    
                    salesByDay.put(day, salesByDay.getOrDefault(day, 0.0) + amount);
                }
            }
        }
        
        // Convert to list of maps for easier consumption by frontend
        List<Map<String, Object>> salesByDayList = new ArrayList<>();
        for (Map.Entry<String, Double> entry : salesByDay.entrySet()) {
            Map<String, Object> dayData = new HashMap<>();
            dayData.put("date", entry.getKey());
            dayData.put("sales", entry.getValue());
            salesByDayList.add(dayData);
        }
        salesReport.put("salesByDay", salesByDayList);
        
        // Top selling shows by revenue
        List<Map<String, Object>> topSellingShows = new ArrayList<>(revenueByShow);
        topSellingShows.sort((a, b) -> Double.compare((Double) b.get("revenue"), (Double) a.get("revenue")));
        
        if (topSellingShows.size() > 5) {
            topSellingShows = topSellingShows.subList(0, 5);
        }
        salesReport.put("topSellingShows", topSellingShows);
        
        // Revenue by category
        List<Map<String, Object>> revenueByCategories = new ArrayList<>();
        for (Map.Entry<String, Double> entry : revenueByCategory.entrySet()) {
            Map<String, Object> categoryData = new HashMap<>();
            categoryData.put("category", entry.getKey());
            categoryData.put("revenue", entry.getValue());
            revenueByCategories.add(categoryData);
        }
        salesReport.put("revenueByCategory", revenueByCategories);
        
        // Top selling venues
        List<Map<String, Object>> topSellingVenues = new ArrayList<>();
        for (Map.Entry<Long, Integer> entry : ticketsByVenue.entrySet()) {
            Map<String, Object> venueData = new HashMap<>();
            venueData.put("venueId", entry.getKey());
            venueData.put("venueName", venueNames.get(entry.getKey()));
            venueData.put("ticketsSold", entry.getValue());
            topSellingVenues.add(venueData);
        }
        
        // Sort by tickets sold (descending) and limit to top 5
        topSellingVenues.sort((a, b) -> 
                Integer.compare((Integer) b.get("ticketsSold"), (Integer) a.get("ticketsSold")));
        
        if (topSellingVenues.size() > 5) {
            topSellingVenues = topSellingVenues.subList(0, 5);
        }
        salesReport.put("topSellingVenues", topSellingVenues);
        
        // Revenue by payment method
        List<Map<String, Object>> revenueByPaymentMethodList = new ArrayList<>();
        for (Map.Entry<String, Double> entry : revenueByPaymentMethod.entrySet()) {
            Map<String, Object> methodData = new HashMap<>();
            methodData.put("method", entry.getKey());
            methodData.put("revenue", entry.getValue());
            revenueByPaymentMethodList.add(methodData);
        }
        salesReport.put("revenueByPaymentMethod", revenueByPaymentMethodList);
        
        // Calculate conversion rate (if we have data on views vs. bookings)
        // In a real implementation, this would come from analytics data
        // For now, we'll calculate a reasonable estimate based on bookings vs. show views
        double conversionRate = 0.0;
        if (totalBookings > 0 && shows.size() > 0) {
            // Assume each show has been viewed 10x more than bookings on average
            int estimatedViews = totalBookings * 10;
            conversionRate = (double) totalBookings / estimatedViews * 100;
        }
        salesReport.put("conversionRate", conversionRate);
        
        // Calculate revenue trend
        String revenueTrend = "stable";
        if (revenueByMonthList.size() >= 2) {
            // Sort by month
            revenueByMonthList.sort(Comparator.comparing(m -> (String) m.get("month")));
            
            // Compare last two months
            if (revenueByMonthList.size() >= 2) {
                double lastMonth = (Double) revenueByMonthList.get(revenueByMonthList.size() - 1).get("amount");
                double previousMonth = (Double) revenueByMonthList.get(revenueByMonthList.size() - 2).get("amount");
                
                if (lastMonth > previousMonth * 1.05) { // 5% increase
                    revenueTrend = "increasing";
                } else if (lastMonth < previousMonth * 0.95) { // 5% decrease
                    revenueTrend = "decreasing";
                }
            }
        }
        salesReport.put("revenueTrend", revenueTrend);
        
        // Calculate max monthly revenue
        double maxMonthlyRevenue = revenueByMonthList.stream()
                .mapToDouble(m -> (Double) m.get("amount"))
                .max()
                .orElse(0.0);
        salesReport.put("maxMonthlyRevenue", maxMonthlyRevenue);
        
        return salesReport;
    }
    
    @Override
    public Map<String, Object> getAudienceDemographics(User organizer, Long showId) {
        Map<String, Object> demographics = new HashMap<>();
        
        // Get bookings for analysis
        List<Booking> allBookings = new ArrayList<>();
        
        if (showId != null) {
            // Get bookings for a specific show
            Optional<Show> showOpt = showRepository.findById(showId);
            if (showOpt.isPresent()) {
                Show show = showOpt.get();
                // Verify the show belongs to this organizer
                if (show.getCreatedBy().getId().equals(organizer.getId())) {
                    allBookings.addAll(bookingRepository.findBookingsByShowId(showId));
                }
            }
        } else {
            // Get bookings for all shows by this organizer
            List<Show> shows = showRepository.findByCreatedById(organizer.getId());
            for (Show show : shows) {
                allBookings.addAll(bookingRepository.findBookingsByShowId(show.getId()));
            }
        }
        
        // Extract user data from bookings for demographic analysis
        List<User> users = allBookings.stream()
                .map(Booking::getUser)
                .distinct()
                .collect(Collectors.toList());
        
        // Since we don't have birthdate data, we'll use a simulated distribution
        // based on the user's registration date or other available data
        Map<String, Integer> ageGroups = new HashMap<>();
        ageGroups.put("18-24", 0);
        ageGroups.put("25-34", 0);
        ageGroups.put("35-44", 0);
        ageGroups.put("45-54", 0);
        ageGroups.put("55+", 0);
        
        // Distribute users across age groups based on a simple algorithm
        // (this is just a placeholder until real demographic data is available)
        int totalUsers = users.size();
        int usersAssigned = 0;
        
        // Assign users to age groups based on a typical distribution
        int youngAdults = (int)(totalUsers * 0.25); // 25% in 18-24
        int thirties = (int)(totalUsers * 0.35);    // 35% in 25-34
        int forties = (int)(totalUsers * 0.20);     // 20% in 35-44
        int fifties = (int)(totalUsers * 0.15);     // 15% in 45-54
        int seniors = totalUsers - youngAdults - thirties - forties - fifties; // Remainder in 55+
        
        ageGroups.put("18-24", youngAdults);
        ageGroups.put("25-34", thirties);
        ageGroups.put("35-44", forties);
        ageGroups.put("45-54", fifties);
        ageGroups.put("55+", seniors);
        
        demographics.put("ageGroups", ageGroups);
        
        // Since we don't have gender data, we'll use a simulated distribution
        Map<String, Integer> gender = new HashMap<>();
        gender.put("Male", (int)(totalUsers * 0.48));    // 48% male
        gender.put("Female", (int)(totalUsers * 0.49));  // 49% female
        gender.put("Other", totalUsers - gender.get("Male") - gender.get("Female")); // Remainder as other
        
        demographics.put("gender", gender);
        
        // Calculate location distribution based on user addresses
        Map<String, Integer> location = new HashMap<>();
        location.put("Local", 0);
        location.put("Regional", 0);
        location.put("National", 0);
        location.put("International", 0);
        
        // Since we don't have detailed location data, we'll use a simulated distribution
        // based on typical patterns for event attendance
        location.put("Local", (int)(totalUsers * 0.60));     // 60% local
        location.put("Regional", (int)(totalUsers * 0.25));  // 25% regional
        location.put("National", (int)(totalUsers * 0.10));  // 10% national
        location.put("International", totalUsers - location.get("Local") - location.get("Regional") - location.get("National")); // Remainder international
        demographics.put("location", location);
        
        // Calculate attendance frequency based on booking history
        Map<String, Integer> attendanceFrequency = new HashMap<>();
        attendanceFrequency.put("First Time", 0);
        attendanceFrequency.put("Occasional", 0);
        attendanceFrequency.put("Regular", 0);
        attendanceFrequency.put("Frequent", 0);
        
        // Group bookings by user
        Map<Long, List<Booking>> bookingsByUser = allBookings.stream()
                .collect(Collectors.groupingBy(booking -> booking.getUser().getId()));
        
        for (Map.Entry<Long, List<Booking>> entry : bookingsByUser.entrySet()) {
            int bookingCount = entry.getValue().size();
            
            if (bookingCount == 1) {
                attendanceFrequency.put("First Time", attendanceFrequency.get("First Time") + 1);
            } else if (bookingCount >= 2 && bookingCount <= 3) {
                attendanceFrequency.put("Occasional", attendanceFrequency.get("Occasional") + 1);
            } else if (bookingCount >= 4 && bookingCount <= 6) {
                attendanceFrequency.put("Regular", attendanceFrequency.get("Regular") + 1);
            } else {
                attendanceFrequency.put("Frequent", attendanceFrequency.get("Frequent") + 1);
            }
        }
        demographics.put("attendanceFrequency", attendanceFrequency);
        
        // Calculate booking preferences based on booking platform
        Map<String, Integer> bookingPreferences = new HashMap<>();
        bookingPreferences.put("Web", 0);
        bookingPreferences.put("Mobile App", 0);
        bookingPreferences.put("Box Office", 0);
        
        for (Booking booking : allBookings) {
            if (booking.getBookingSource() != null) {
                String platform = booking.getBookingSource();
                if (platform.equalsIgnoreCase("WEB")) {
                    bookingPreferences.put("Web", bookingPreferences.get("Web") + 1);
                } else if (platform.equalsIgnoreCase("MOBILE") || platform.equalsIgnoreCase("APP")) {
                    bookingPreferences.put("Mobile App", bookingPreferences.get("Mobile App") + 1);
                } else if (platform.equalsIgnoreCase("BOX_OFFICE") || platform.equalsIgnoreCase("VENUE")) {
                    bookingPreferences.put("Box Office", bookingPreferences.get("Box Office") + 1);
                }
            }
        }
        demographics.put("bookingPreferences", bookingPreferences);
        
        // Calculate interests based on show types/genres that users have booked
        Map<String, Integer> interests = new HashMap<>();
        
        // Get all shows that users have booked
        Set<Show> bookedShows = allBookings.stream()
                .filter(booking -> booking.getShowSchedule() != null && booking.getShowSchedule().getShow() != null)
                .map(booking -> booking.getShowSchedule().getShow())
                .collect(Collectors.toSet());
        
        // Count genres/types
        for (Show show : bookedShows) {
            String genre = show.getGenre();
            if (genre != null) {
                interests.put(genre, interests.getOrDefault(genre, 0) + 1);
            }
        }
        
        // If we don't have enough data, add some default categories
        if (interests.size() < 3) {
            if (!interests.containsKey("Music")) interests.put("Music", 0);
            if (!interests.containsKey("Theater")) interests.put("Theater", 0);
            if (!interests.containsKey("Comedy")) interests.put("Comedy", 0);
            if (!interests.containsKey("Dance")) interests.put("Dance", 0);
        }
        
        demographics.put("interests", interests);
        
        return demographics;
    }
}