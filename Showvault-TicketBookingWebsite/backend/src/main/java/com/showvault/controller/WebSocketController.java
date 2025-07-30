package com.showvault.controller;

import com.showvault.model.User;
import com.showvault.security.services.UserDetailsImpl;
import com.showvault.service.ShowAnalyticsService;
import com.showvault.service.UserService;
import com.showvault.websocket.WebSocketService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Controller for WebSocket communication
 */
@Controller
public class WebSocketController {


    
    @Autowired
    private WebSocketService webSocketService;
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private ShowAnalyticsService showAnalyticsService;
    

    
    /**
     * Handle organizer dashboard data request via WebSocket
     * @param payload The payload containing optional date range
     * @param headerAccessor The message headers
     * @return The dashboard data
     */
    @MessageMapping("/organizer/dashboard")
    @SendTo("/topic/organizer-dashboard")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public Map<String, Object> getOrganizerDashboardData(Map<String, String> payload, SimpMessageHeaderAccessor headerAccessor) {
        Principal principal = headerAccessor.getUser();
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            // Parse date parameters if provided
            LocalDate startDate = null;
            LocalDate endDate = null;
            
            if (payload != null) {
                if (payload.containsKey("startDate")) {
                    startDate = LocalDate.parse(payload.get("startDate"));
                }
                
                if (payload.containsKey("endDate")) {
                    endDate = LocalDate.parse(payload.get("endDate"));
                }
            }
            
            // Get dashboard stats
            Map<String, Object> stats;
            if (startDate != null && endDate != null) {
                stats = showAnalyticsService.getOrganizerDashboardStats(user, startDate, endDate);
            } else {
                stats = showAnalyticsService.getOrganizerDashboardStats(user);
            }
            
            // Format response
            Map<String, Object> response = new HashMap<>();
            response.put("type", "DASHBOARD_UPDATE");
            response.put("data", stats);
            
            return response;
        } else {
            // Return error response
            Map<String, Object> response = new HashMap<>();
            response.put("type", "ERROR");
            response.put("message", "User not found");
            
            return response;
        }
    }
    
    /**
     * Handle organizer sales report request via WebSocket
     * @param payload The payload containing optional parameters
     * @param headerAccessor The message headers
     * @return The sales report data
     */
    @MessageMapping("/organizer/sales-report")
    @SendTo("/topic/organizer-sales")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public Map<String, Object> getOrganizerSalesReport(Map<String, String> payload, SimpMessageHeaderAccessor headerAccessor) {
        Principal principal = headerAccessor.getUser();
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            // Parse parameters if provided
            LocalDate dateFrom = null;
            LocalDate dateTo = null;
            Long showId = null;
            
            if (payload != null) {
                if (payload.containsKey("dateFrom")) {
                    dateFrom = LocalDate.parse(payload.get("dateFrom"));
                }
                
                if (payload.containsKey("dateTo")) {
                    dateTo = LocalDate.parse(payload.get("dateTo"));
                }
                
                if (payload.containsKey("showId")) {
                    showId = Long.parseLong(payload.get("showId"));
                }
            }
            
            // Get sales report
            Map<String, Object> salesReport = showAnalyticsService.getSalesReport(user, dateFrom, dateTo, showId);
            
            // Format response
            Map<String, Object> response = new HashMap<>();
            response.put("type", "SALES_REPORT_UPDATE");
            response.put("data", salesReport);
            
            return response;
        } else {
            // Return error response
            Map<String, Object> response = new HashMap<>();
            response.put("type", "ERROR");
            response.put("message", "User not found");
            
            return response;
        }
    }
}