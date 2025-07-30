package com.showvault.service;

import com.showvault.model.Show;
import com.showvault.model.ShowAnalytics;
import com.showvault.model.User;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public interface ShowAnalyticsService {
    
    ShowAnalytics getShowAnalytics(Long showId);
    
    ShowAnalytics getShowAnalytics(Show show);
    
    Map<String, Object> getOrganizerDashboardStats(User organizer);
    
    Map<String, Object> getOrganizerDashboardStats(User organizer, LocalDate startDate, LocalDate endDate);
    
    List<Map<String, Object>> getTopPerformingShows(User organizer, int limit);
    
    Map<String, Object> getShowPerformanceMetrics(Long showId);
    
    Map<String, Object> getAudienceInsights(Long showId);
    
    Map<String, Object> getSalesAnalytics(Long showId);
    
    Map<String, Object> getPromotionAnalytics(Long showId);
    
    Map<String, Object> getBookingTrends(Long showId, LocalDate startDate, LocalDate endDate);
    
    Map<String, Object> getRevenueBreakdown(Long showId);
    
    Map<String, Object> getOccupancyRates(Long showId);
    
    /**
     * Get sales report for an organizer
     * 
     * @param organizer The organizer user
     * @param dateFrom Optional start date for filtering
     * @param dateTo Optional end date for filtering
     * @param showId Optional show ID for filtering
     * @return Sales report data
     */
    Map<String, Object> getSalesReport(User organizer, LocalDate dateFrom, LocalDate dateTo, Long showId);
    
    /**
     * Get audience demographics for an organizer
     * 
     * @param organizer The organizer user
     * @param showId Optional show ID for filtering
     * @return Audience demographics data
     */
    Map<String, Object> getAudienceDemographics(User organizer, Long showId);
}