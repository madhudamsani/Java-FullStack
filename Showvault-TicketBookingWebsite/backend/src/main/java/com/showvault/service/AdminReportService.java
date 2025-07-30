package com.showvault.service;

import java.time.LocalDate;
import java.util.Map;

public interface AdminReportService {
    
    /**
     * Get sales report
     * @return Map containing sales report data
     */
    Map<String, Object> getSalesReport();
    
    /**
     * Get sales report for a specific date range
     * @param startDate Start date
     * @param endDate End date
     * @return Map containing sales report data
     */
    Map<String, Object> getSalesReport(LocalDate startDate, LocalDate endDate);
    
    /**
     * Get user report
     * @return Map containing user report data
     */
    Map<String, Object> getUserReport();
    
    /**
     * Get user report for a specific date range
     * @param startDate Start date
     * @param endDate End date
     * @return Map containing user report data
     */
    Map<String, Object> getUserReport(LocalDate startDate, LocalDate endDate);
    
    /**
     * Get booking report
     * @return Map containing booking report data
     */
    Map<String, Object> getBookingReport();
    
    /**
     * Get booking report for a specific date range
     * @param startDate Start date
     * @param endDate End date
     * @return Map containing booking report data
     */
    Map<String, Object> getBookingReport(LocalDate startDate, LocalDate endDate);
    
    /**
     * Get revenue report
     * @param interval Interval (daily, weekly, monthly, yearly)
     * @return Map containing revenue report data
     */
    Map<String, Object> getRevenueReport(String interval);
    
    /**
     * Get revenue report for a specific date range
     * @param startDate Start date
     * @param endDate End date
     * @param interval Interval (daily, weekly, monthly, yearly)
     * @return Map containing revenue report data
     */
    Map<String, Object> getRevenueReport(LocalDate startDate, LocalDate endDate, String interval);
}