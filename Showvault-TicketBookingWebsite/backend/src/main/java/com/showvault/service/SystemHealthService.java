package com.showvault.service;

import com.showvault.model.SystemHealth;

import java.util.List;
import java.util.Map;

public interface SystemHealthService {
    
    SystemHealth getSystemHealth();
    
    Map<String, Object> getJvmMetrics();
    
    Map<String, Object> getDatabaseMetrics();
    
    Map<String, Object> getApiMetrics();
    
    String getStatus();
    
    String getUptime();
    
    double getCpuUsage();
    
    double getMemoryUsage();
    
    double getDiskUsage();
    
    int getActiveConnections();
    
    int getAverageResponseTime();
    
    /**
     * Get system logs with pagination and filters
     * @param offset Pagination offset
     * @param limit Pagination limit
     * @param level Log level filter
     * @param service Service filter
     * @return List of log entries
     */
    List<Map<String, Object>> getSystemLogs(int offset, int limit, String level, String service);
    
    /**
     * Count system logs with filters
     * @param level Log level filter
     * @param service Service filter
     * @return Total count of matching logs
     */
    long countSystemLogs(String level, String service);
    
    /**
     * Set maintenance mode
     * @param enabled Whether maintenance mode should be enabled
     */
    void setMaintenanceMode(boolean enabled);
    
    /**
     * Clear system cache
     */
    void clearSystemCache();
}