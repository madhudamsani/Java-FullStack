package com.showvault.model;

import java.util.Map;

public class SystemHealth {
    
    private String status;
    private String uptime;
    private double cpuUsage;
    private double memoryUsage;
    private double diskUsage;
    private int activeConnections;
    private int averageResponseTime;
    private Map<String, Object> jvmMetrics;
    private Map<String, Object> databaseMetrics;
    private Map<String, Object> apiMetrics;
    
    // Constructors
    public SystemHealth() {
    }
    
    // Getters and Setters
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
    
    public double getCpuUsage() {
        return cpuUsage;
    }
    
    public void setCpuUsage(double cpuUsage) {
        this.cpuUsage = cpuUsage;
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
    
    public int getAverageResponseTime() {
        return averageResponseTime;
    }
    
    public void setAverageResponseTime(int averageResponseTime) {
        this.averageResponseTime = averageResponseTime;
    }
    
    public Map<String, Object> getJvmMetrics() {
        return jvmMetrics;
    }
    
    public void setJvmMetrics(Map<String, Object> jvmMetrics) {
        this.jvmMetrics = jvmMetrics;
    }
    
    public Map<String, Object> getDatabaseMetrics() {
        return databaseMetrics;
    }
    
    public void setDatabaseMetrics(Map<String, Object> databaseMetrics) {
        this.databaseMetrics = databaseMetrics;
    }
    
    public Map<String, Object> getApiMetrics() {
        return apiMetrics;
    }
    
    public void setApiMetrics(Map<String, Object> apiMetrics) {
        this.apiMetrics = apiMetrics;
    }
}