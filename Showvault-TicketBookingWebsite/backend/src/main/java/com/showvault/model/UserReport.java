package com.showvault.model;

import java.util.List;
import java.util.Map;

public class UserReport {
    
    private int totalUsers;
    private int activeUsers;
    private int newUsers;
    private Map<String, Integer> usersByRole;
    private List<Map<String, Object>> userActivity;
    private Map<String, Integer> userTypes;
    private List<Map<String, Object>> growthByMonth;
    private int maxMonthlyUsers;
    private List<Map<String, Object>> mostActiveUsers;
    private Map<String, Integer> registrationSources;
    private double retentionRate;
    
    // Constructors
    public UserReport() {
    }
    
    // Getters and Setters
    public int getTotalUsers() {
        return totalUsers;
    }
    
    public void setTotalUsers(int totalUsers) {
        this.totalUsers = totalUsers;
    }
    
    public int getActiveUsers() {
        return activeUsers;
    }
    
    public void setActiveUsers(int activeUsers) {
        this.activeUsers = activeUsers;
    }
    
    public int getNewUsers() {
        return newUsers;
    }
    
    public void setNewUsers(int newUsers) {
        this.newUsers = newUsers;
    }
    
    public Map<String, Integer> getUsersByRole() {
        return usersByRole;
    }
    
    public void setUsersByRole(Map<String, Integer> usersByRole) {
        this.usersByRole = usersByRole;
    }
    
    public List<Map<String, Object>> getUserActivity() {
        return userActivity;
    }
    
    public void setUserActivity(List<Map<String, Object>> userActivity) {
        this.userActivity = userActivity;
    }
    
    public Map<String, Integer> getUserTypes() {
        return userTypes;
    }
    
    public void setUserTypes(Map<String, Integer> userTypes) {
        this.userTypes = userTypes;
    }
    
    public List<Map<String, Object>> getGrowthByMonth() {
        return growthByMonth;
    }
    
    public void setGrowthByMonth(List<Map<String, Object>> growthByMonth) {
        this.growthByMonth = growthByMonth;
    }
    
    public int getMaxMonthlyUsers() {
        return maxMonthlyUsers;
    }
    
    public void setMaxMonthlyUsers(int maxMonthlyUsers) {
        this.maxMonthlyUsers = maxMonthlyUsers;
    }
    
    public List<Map<String, Object>> getMostActiveUsers() {
        return mostActiveUsers;
    }
    
    public void setMostActiveUsers(List<Map<String, Object>> mostActiveUsers) {
        this.mostActiveUsers = mostActiveUsers;
    }
    
    public Map<String, Integer> getRegistrationSources() {
        return registrationSources;
    }
    
    public void setRegistrationSources(Map<String, Integer> registrationSources) {
        this.registrationSources = registrationSources;
    }
    
    public double getRetentionRate() {
        return retentionRate;
    }
    
    public void setRetentionRate(double retentionRate) {
        this.retentionRate = retentionRate;
    }
}