package com.showvault.model;

import java.util.List;
import java.util.Map;

public class SalesReport {
    
    private double totalRevenue;
    private int ticketsSold;
    private double averageTicketPrice;
    private Map<String, Double> revenueByMonth;
    private Map<String, Integer> ticketsByMonth;
    private List<Map<String, Object>> topSellingShows;
    private Map<String, Double> revenueByCategory;
    private Map<String, Double> revenueByPlatform;
    private List<Map<String, Object>> salesByPriceCategory;
    private Map<String, Double> refundRate;
    private double conversionRate;
    private List<Map<String, Object>> promotionEffectiveness;
    private String revenueTrend;
    private List<Map<String, Object>> revenueByShow;
    private double maxMonthlyRevenue;
    private List<Map<String, Object>> revenueByPaymentMethod;
    
    // Constructors
    public SalesReport() {
    }
    
    // Getters and Setters
    public double getTotalRevenue() {
        return totalRevenue;
    }
    
    public void setTotalRevenue(double totalRevenue) {
        this.totalRevenue = totalRevenue;
    }
    
    public int getTicketsSold() {
        return ticketsSold;
    }
    
    public void setTicketsSold(int ticketsSold) {
        this.ticketsSold = ticketsSold;
    }
    
    public double getAverageTicketPrice() {
        return averageTicketPrice;
    }
    
    public void setAverageTicketPrice(double averageTicketPrice) {
        this.averageTicketPrice = averageTicketPrice;
    }
    
    public Map<String, Double> getRevenueByMonth() {
        return revenueByMonth;
    }
    
    public void setRevenueByMonth(Map<String, Double> revenueByMonth) {
        this.revenueByMonth = revenueByMonth;
    }
    
    public Map<String, Integer> getTicketsByMonth() {
        return ticketsByMonth;
    }
    
    public void setTicketsByMonth(Map<String, Integer> ticketsByMonth) {
        this.ticketsByMonth = ticketsByMonth;
    }
    
    public List<Map<String, Object>> getTopSellingShows() {
        return topSellingShows;
    }
    
    public void setTopSellingShows(List<Map<String, Object>> topSellingShows) {
        this.topSellingShows = topSellingShows;
    }
    
    public Map<String, Double> getRevenueByCategory() {
        return revenueByCategory;
    }
    
    public void setRevenueByCategory(Map<String, Double> revenueByCategory) {
        this.revenueByCategory = revenueByCategory;
    }
    
    public Map<String, Double> getRevenueByPlatform() {
        return revenueByPlatform;
    }
    
    public void setRevenueByPlatform(Map<String, Double> revenueByPlatform) {
        this.revenueByPlatform = revenueByPlatform;
    }
    
    public List<Map<String, Object>> getSalesByPriceCategory() {
        return salesByPriceCategory;
    }
    
    public void setSalesByPriceCategory(List<Map<String, Object>> salesByPriceCategory) {
        this.salesByPriceCategory = salesByPriceCategory;
    }
    
    public Map<String, Double> getRefundRate() {
        return refundRate;
    }
    
    public void setRefundRate(Map<String, Double> refundRate) {
        this.refundRate = refundRate;
    }
    
    public double getConversionRate() {
        return conversionRate;
    }
    
    public void setConversionRate(double conversionRate) {
        this.conversionRate = conversionRate;
    }
    
    public List<Map<String, Object>> getPromotionEffectiveness() {
        return promotionEffectiveness;
    }
    
    public void setPromotionEffectiveness(List<Map<String, Object>> promotionEffectiveness) {
        this.promotionEffectiveness = promotionEffectiveness;
    }
    
    public String getRevenueTrend() {
        return revenueTrend;
    }
    
    public void setRevenueTrend(String revenueTrend) {
        this.revenueTrend = revenueTrend;
    }
    
    public List<Map<String, Object>> getRevenueByShow() {
        return revenueByShow;
    }
    
    public void setRevenueByShow(List<Map<String, Object>> revenueByShow) {
        this.revenueByShow = revenueByShow;
    }
    
    public double getMaxMonthlyRevenue() {
        return maxMonthlyRevenue;
    }
    
    public void setMaxMonthlyRevenue(double maxMonthlyRevenue) {
        this.maxMonthlyRevenue = maxMonthlyRevenue;
    }
    
    public List<Map<String, Object>> getRevenueByPaymentMethod() {
        return revenueByPaymentMethod;
    }
    
    public void setRevenueByPaymentMethod(List<Map<String, Object>> revenueByPaymentMethod) {
        this.revenueByPaymentMethod = revenueByPaymentMethod;
    }
}