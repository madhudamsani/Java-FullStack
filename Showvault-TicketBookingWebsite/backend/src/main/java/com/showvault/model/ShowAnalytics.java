package com.showvault.model;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public class ShowAnalytics {
    
    private Long showId;
    private String showTitle;
    private int totalTicketsSold;
    private double totalRevenue;
    private double averageTicketPrice;
    private int totalBookings;
    private double occupancyRate;
    private Map<String, Integer> bookingsByStatus;
    private Map<String, Double> revenueByDate;
    private Map<String, Integer> ticketsByDate;
    private Map<String, Integer> audienceDemographics;
    private List<Map<String, Object>> popularPerformances;
    private List<Map<String, Object>> salesByPriceCategory;
    private Map<String, Integer> bookingsByPlatform;
    private Map<String, Integer> viewsBySource;
    private Map<String, Integer> conversionRates;
    private List<Map<String, Object>> recentBookings;
    private Map<String, Double> promotionEffectiveness;
    
    // Constructors
    public ShowAnalytics() {
    }
    
    public ShowAnalytics(Long showId, String showTitle) {
        this.showId = showId;
        this.showTitle = showTitle;
    }
    
    // Getters and Setters
    public Long getShowId() {
        return showId;
    }
    
    public void setShowId(Long showId) {
        this.showId = showId;
    }
    
    public String getShowTitle() {
        return showTitle;
    }
    
    public void setShowTitle(String showTitle) {
        this.showTitle = showTitle;
    }
    
    public int getTotalTicketsSold() {
        return totalTicketsSold;
    }
    
    public void setTotalTicketsSold(int totalTicketsSold) {
        this.totalTicketsSold = totalTicketsSold;
    }
    
    public double getTotalRevenue() {
        return totalRevenue;
    }
    
    public void setTotalRevenue(double totalRevenue) {
        this.totalRevenue = totalRevenue;
    }
    
    public double getAverageTicketPrice() {
        return averageTicketPrice;
    }
    
    public void setAverageTicketPrice(double averageTicketPrice) {
        this.averageTicketPrice = averageTicketPrice;
    }
    
    public int getTotalBookings() {
        return totalBookings;
    }
    
    public void setTotalBookings(int totalBookings) {
        this.totalBookings = totalBookings;
    }
    
    public double getOccupancyRate() {
        return occupancyRate;
    }
    
    public void setOccupancyRate(double occupancyRate) {
        this.occupancyRate = occupancyRate;
    }
    
    public Map<String, Integer> getBookingsByStatus() {
        return bookingsByStatus;
    }
    
    public void setBookingsByStatus(Map<String, Integer> bookingsByStatus) {
        this.bookingsByStatus = bookingsByStatus;
    }
    
    public Map<String, Double> getRevenueByDate() {
        return revenueByDate;
    }
    
    public void setRevenueByDate(Map<String, Double> revenueByDate) {
        this.revenueByDate = revenueByDate;
    }
    
    public Map<String, Integer> getTicketsByDate() {
        return ticketsByDate;
    }
    
    public void setTicketsByDate(Map<String, Integer> ticketsByDate) {
        this.ticketsByDate = ticketsByDate;
    }
    
    public Map<String, Integer> getAudienceDemographics() {
        return audienceDemographics;
    }
    
    public void setAudienceDemographics(Map<String, Integer> audienceDemographics) {
        this.audienceDemographics = audienceDemographics;
    }
    
    public List<Map<String, Object>> getPopularPerformances() {
        return popularPerformances;
    }
    
    public void setPopularPerformances(List<Map<String, Object>> popularPerformances) {
        this.popularPerformances = popularPerformances;
    }
    
    public List<Map<String, Object>> getSalesByPriceCategory() {
        return salesByPriceCategory;
    }
    
    public void setSalesByPriceCategory(List<Map<String, Object>> salesByPriceCategory) {
        this.salesByPriceCategory = salesByPriceCategory;
    }
    
    public Map<String, Integer> getBookingsByPlatform() {
        return bookingsByPlatform;
    }
    
    public void setBookingsByPlatform(Map<String, Integer> bookingsByPlatform) {
        this.bookingsByPlatform = bookingsByPlatform;
    }
    
    public Map<String, Integer> getViewsBySource() {
        return viewsBySource;
    }
    
    public void setViewsBySource(Map<String, Integer> viewsBySource) {
        this.viewsBySource = viewsBySource;
    }
    
    public Map<String, Integer> getConversionRates() {
        return conversionRates;
    }
    
    public void setConversionRates(Map<String, Integer> conversionRates) {
        this.conversionRates = conversionRates;
    }
    
    public List<Map<String, Object>> getRecentBookings() {
        return recentBookings;
    }
    
    public void setRecentBookings(List<Map<String, Object>> recentBookings) {
        this.recentBookings = recentBookings;
    }
    
    public Map<String, Double> getPromotionEffectiveness() {
        return promotionEffectiveness;
    }
    
    public void setPromotionEffectiveness(Map<String, Double> promotionEffectiveness) {
        this.promotionEffectiveness = promotionEffectiveness;
    }
}