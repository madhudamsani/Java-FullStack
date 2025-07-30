package com.showvault.service.impl;

import com.showvault.model.User;
import com.showvault.service.ShowAnalyticsService;
import com.showvault.websocket.WebSocketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for broadcasting dashboard updates to connected clients
 * This service periodically checks for data changes and broadcasts updates
 * to ensure real-time data on the organizer dashboard
 */
@Service
public class DashboardBroadcastService {

    @Autowired
    private WebSocketService webSocketService;
    
    @Autowired
    private ShowAnalyticsService showAnalyticsService;
    
    // Cache of last sent dashboard stats by user ID
    private final Map<Long, Map<String, Object>> lastDashboardStats = new ConcurrentHashMap<>();
    
    // Cache of last sent sales reports by user ID
    private final Map<Long, Map<String, Object>> lastSalesReports = new ConcurrentHashMap<>();
    
    /**
     * Scheduled task to check for dashboard updates and broadcast them
     * Runs every 10 seconds to ensure real-time data
     */
    @Scheduled(fixedRate = 10000) // 10 seconds
    public void broadcastDashboardUpdates() {
        // This would typically query active users from a session registry
        // For simplicity, we'll just broadcast to all topics
        broadcastToTopic();
    }
    
    /**
     * Broadcast dashboard updates for a specific user
     * @param user The user to broadcast updates for
     */
    public void broadcastUserDashboardUpdates(User user) {
        if (user == null) {
            return;
        }
        
        // Get current dashboard stats
        Map<String, Object> currentStats = showAnalyticsService.getOrganizerDashboardStats(user);
        
        // Check if stats have changed since last broadcast
        Map<String, Object> lastStats = lastDashboardStats.get(user.getId());
        if (lastStats == null || !lastStats.equals(currentStats)) {
            // Stats have changed, broadcast update
            Map<String, Object> message = new HashMap<>();
            message.put("type", "DASHBOARD_UPDATE");
            message.put("data", currentStats);
            
            webSocketService.sendToTopic("/topic/organizer-dashboard", message);
            
            // Update cache
            lastDashboardStats.put(user.getId(), currentStats);
        }
        
        // Get current sales report
        Map<String, Object> currentSalesReport = showAnalyticsService.getSalesReport(
                user, LocalDate.now().minusMonths(1), LocalDate.now(), null);
        
        // Check if sales report has changed since last broadcast
        Map<String, Object> lastSalesReport = lastSalesReports.get(user.getId());
        if (lastSalesReport == null || !lastSalesReport.equals(currentSalesReport)) {
            // Sales report has changed, broadcast update
            Map<String, Object> message = new HashMap<>();
            message.put("type", "SALES_REPORT_UPDATE");
            message.put("data", currentSalesReport);
            
            webSocketService.sendToTopic("/topic/organizer-sales", message);
            
            // Update cache
            lastSalesReports.put(user.getId(), currentSalesReport);
        }
    }
    
    /**
     * Broadcast updates to all topics
     * This is a simplified approach - in a production environment,
     * you would broadcast only to relevant users
     */
    private void broadcastToTopic() {
        // For demonstration, we'll just broadcast a notification that data may have changed
        // This will prompt clients to request fresh data
        Map<String, Object> updateNotification = new HashMap<>();
        updateNotification.put("type", "DATA_CHANGED");
        updateNotification.put("timestamp", System.currentTimeMillis());
        
        webSocketService.sendToTopic("/topic/organizer-dashboard", updateNotification);
        webSocketService.sendToTopic("/topic/organizer-sales", updateNotification);
    }
    
    /**
     * Manually trigger a broadcast update
     * This can be called when data is known to have changed
     * (e.g., after a booking is created or updated)
     */
    public void triggerBroadcastUpdate() {
        broadcastToTopic();
    }
}