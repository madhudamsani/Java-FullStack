package com.showvault.model;

import java.util.List;
import java.util.Map;

public class DashboardStats {
    
    private int totalUsers;
    private int totalShows;
    private int activeShows;
    private int upcomingShows;
    private int totalBookings;
    private int bookingsThisMonth;
    private double totalRevenue;
    private List<Map<String, Object>> recentBookings;
    private List<Map<String, Object>> popularShows;
    private List<Map<String, Object>> userGrowth;
    private List<Map<String, Object>> recentActivity;
    private SystemHealth systemHealth;
    
    public static class SystemHealth {
        private String status;
        private String uptime;
        private double serverLoad;
        private double memoryUsage;
        private double diskUsage;
        private int activeConnections;
        private int responseTime;
        
        public SystemHealth() {
        }
        
        public String getStatus() {
            return status;
        }
        
        public void setStatus(String status) {
            this.status = status;
        }
        
        public String getUptime() {
            return uptime;
        }
        
        public void setUptime(String uptime) {
            this.uptime = uptime;
        }
        
        public double getServerLoad() {
            return serverLoad;
        }
        
        public void setServerLoad(double serverLoad) {
            this.serverLoad = serverLoad;
        }
        
        public double getMemoryUsage() {
            return memoryUsage;
        }
        
        public void setMemoryUsage(double memoryUsage) {
            this.memoryUsage = memoryUsage;
        }
        
        public double getDiskUsage() {
            return diskUsage;
        }
        
        public void setDiskUsage(double diskUsage) {
            this.diskUsage = diskUsage;
        }
        
        public int getActiveConnections() {
            return activeConnections;
        }
        
        public void setActiveConnections(int activeConnections) {
            this.activeConnections = activeConnections;
        }
        
        public int getResponseTime() {
            return responseTime;
        }
        
        public void setResponseTime(int responseTime) {
            this.responseTime = responseTime;
        }
    }
    
    // Constructors
    public DashboardStats() {
    }
    
    // Getters and Setters
    public int getTotalUsers() {
        return totalUsers;
    }
    
    public void setTotalUsers(int totalUsers) {
        this.totalUsers = totalUsers;
    }
    
    public int getTotalShows() {
        return totalShows;
    }
    
    public void setTotalShows(int totalShows) {
        this.totalShows = totalShows;
    }
    
    public int getActiveShows() {
        return activeShows;
    }
    
    public void setActiveShows(int activeShows) {
        this.activeShows = activeShows;
    }
    
    public int getUpcomingShows() {
        return upcomingShows;
    }
    
    public void setUpcomingShows(int upcomingShows) {
        this.upcomingShows = upcomingShows;
    }
    
    public int getTotalBookings() {
        return totalBookings;
    }
    
    public void setTotalBookings(int totalBookings) {
        this.totalBookings = totalBookings;
    }
    
    public int getBookingsThisMonth() {
        return bookingsThisMonth;
    }
    
    public void setBookingsThisMonth(int bookingsThisMonth) {
        this.bookingsThisMonth = bookingsThisMonth;
    }
    
    public double getTotalRevenue() {
        return totalRevenue;
    }
    
    public void setTotalRevenue(double totalRevenue) {
        this.totalRevenue = totalRevenue;
    }
    
    public List<Map<String, Object>> getRecentBookings() {
        return recentBookings;
    }
    
    public void setRecentBookings(List<Map<String, Object>> recentBookings) {
        this.recentBookings = recentBookings;
    }
    
    public List<Map<String, Object>> getPopularShows() {
        return popularShows;
    }
    
    public void setPopularShows(List<Map<String, Object>> popularShows) {
        this.popularShows = popularShows;
    }
    
    public List<Map<String, Object>> getUserGrowth() {
        return userGrowth;
    }
    
    public void setUserGrowth(List<Map<String, Object>> userGrowth) {
        this.userGrowth = userGrowth;
    }
    
    public List<Map<String, Object>> getRecentActivity() {
        return recentActivity;
    }
    
    public void setRecentActivity(List<Map<String, Object>> recentActivity) {
        this.recentActivity = recentActivity;
    }
    
    public SystemHealth getSystemHealth() {
        return systemHealth;
    }
    
    public void setSystemHealth(SystemHealth systemHealth) {
        this.systemHealth = systemHealth;
    }
}