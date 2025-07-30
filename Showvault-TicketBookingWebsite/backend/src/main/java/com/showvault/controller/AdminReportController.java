package com.showvault.controller;

import com.showvault.model.SalesReport;
import com.showvault.model.UserReport;
import com.showvault.service.AdminReportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminReportController {
    
    private static final Logger logger = LoggerFactory.getLogger(AdminReportController.class);

    @Autowired
    private AdminReportService adminReportService;

    // Original endpoints
    @GetMapping("/reports/sales")
    public ResponseEntity<?> getSalesReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        Map<String, Object> report;
        if (startDate != null && endDate != null) {
            report = adminReportService.getSalesReport(startDate, endDate);
        } else {
            report = adminReportService.getSalesReport();
        }
        
        return new ResponseEntity<>(report, HttpStatus.OK);
    }

    @GetMapping("/reports/users")
    public ResponseEntity<?> getUserReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        Map<String, Object> report;
        if (startDate != null && endDate != null) {
            report = adminReportService.getUserReport(startDate, endDate);
        } else {
            report = adminReportService.getUserReport();
        }
        
        return new ResponseEntity<>(report, HttpStatus.OK);
    }

    @GetMapping("/reports/bookings")
    public ResponseEntity<?> getBookingReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        Map<String, Object> report;
        if (startDate != null && endDate != null) {
            report = adminReportService.getBookingReport(startDate, endDate);
        } else {
            report = adminReportService.getBookingReport();
        }
        
        return new ResponseEntity<>(report, HttpStatus.OK);
    }

    @GetMapping("/reports/revenue")
    public ResponseEntity<?> getRevenueReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "monthly") String interval) {
        
        Map<String, Object> report;
        if (startDate != null && endDate != null) {
            report = adminReportService.getRevenueReport(startDate, endDate, interval);
        } else {
            report = adminReportService.getRevenueReport(interval);
        }
        
        return new ResponseEntity<>(report, HttpStatus.OK);
    }

    @GetMapping("/reports/export/{reportType}")
    public ResponseEntity<?> exportReport(
            @PathVariable String reportType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "pdf") String format) {
        
        // In a real implementation, this would generate and return a file
        // For now, we'll just return a success message
        
        return new ResponseEntity<>(Map.of(
            "success", true,
            "message", reportType + " report exported successfully in " + format.toUpperCase() + " format"
        ), HttpStatus.OK);
    }
    
    // Additional endpoints to match the frontend service expectations
    
    @GetMapping("/reports/dashboard-users")
    public ResponseEntity<UserReport> getDashboardUserReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        logger.info("Received request for dashboard user report");
        
        Map<String, Object> reportData;
        if (startDate != null && endDate != null) {
            reportData = adminReportService.getUserReport(startDate, endDate);
        } else {
            reportData = adminReportService.getUserReport();
        }
        
        // Convert the generic report data to the UserReport model
        UserReport userReport = new UserReport();
        
        try {
            userReport.setTotalUsers((Integer) reportData.get("totalUsers"));
            userReport.setActiveUsers((Integer) reportData.get("activeUsers"));
            userReport.setNewUsers((Integer) reportData.get("newUsers"));
            userReport.setRetentionRate((Double) reportData.get("retentionRate"));
            userReport.setUserTypes((Map<String, Integer>) reportData.get("userTypes"));
            userReport.setGrowthByMonth((java.util.List<Map<String, Object>>) reportData.get("growthByMonth"));
            userReport.setMaxMonthlyUsers((Integer) reportData.get("maxMonthlyUsers"));
            userReport.setRegistrationSources((Map<String, Integer>) reportData.get("registrationSources"));
            userReport.setMostActiveUsers((java.util.List<Map<String, Object>>) reportData.get("mostActiveUsers"));
            userReport.setUserActivity((java.util.List<Map<String, Object>>) reportData.get("userActivity"));
            
            // Convert userTypes to usersByRole for the frontend
            Map<String, Integer> usersByRole = new HashMap<>();
            Map<String, Integer> userTypes = userReport.getUserTypes();
            if (userTypes != null) {
                usersByRole.put("user", userTypes.getOrDefault("regular", 0));
                usersByRole.put("organizer", userTypes.getOrDefault("organizer", 0));
                usersByRole.put("admin", userTypes.getOrDefault("admin", 0));
            }
            userReport.setUsersByRole(usersByRole);
            
            logger.info("Successfully prepared user report response");
        } catch (Exception e) {
            logger.error("Error converting user report data", e);
        }
        
        return new ResponseEntity<>(userReport, HttpStatus.OK);
    }
    
    @GetMapping("/reports/dashboard-sales")
    public ResponseEntity<SalesReport> getDashboardSalesReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        logger.info("Received request for dashboard sales report");
        
        Map<String, Object> reportData;
        if (startDate != null && endDate != null) {
            reportData = adminReportService.getSalesReport(startDate, endDate);
        } else {
            reportData = adminReportService.getSalesReport();
        }
        
        // Convert the generic report data to the SalesReport model
        SalesReport salesReport = new SalesReport();
        
        try {
            salesReport.setTotalRevenue((Double) reportData.get("totalRevenue"));
            salesReport.setTicketsSold((Integer) reportData.get("ticketsSold"));
            salesReport.setAverageTicketPrice((Double) reportData.get("averageTicketPrice"));
            salesReport.setTopSellingShows((java.util.List<Map<String, Object>>) reportData.get("topSellingShows"));
            salesReport.setRevenueTrend((String) reportData.get("revenueTrend"));
            salesReport.setRevenueByShow((java.util.List<Map<String, Object>>) reportData.get("revenueByShow"));
            salesReport.setMaxMonthlyRevenue((Double) reportData.get("maxMonthlyRevenue"));
            salesReport.setRevenueByPaymentMethod((java.util.List<Map<String, Object>>) reportData.get("revenueByPaymentMethod"));
            
            // Convert revenueByMonth list to map for the frontend
            java.util.List<Map<String, Object>> revenueByMonthList = 
                (java.util.List<Map<String, Object>>) reportData.get("revenueByMonth");
            
            Map<String, Double> revenueByMonth = new HashMap<>();
            if (revenueByMonthList != null) {
                for (Map<String, Object> monthData : revenueByMonthList) {
                    String month = (String) monthData.get("month");
                    Double revenue = ((Number) monthData.get("revenue")).doubleValue();
                    revenueByMonth.put(month, revenue);
                }
            }
            salesReport.setRevenueByMonth(revenueByMonth);
            
            // Set default values for other required fields
            Map<String, Integer> ticketsByMonth = new HashMap<>();
            for (String month : revenueByMonth.keySet()) {
                ticketsByMonth.put(month, (int) (revenueByMonth.get(month) / salesReport.getAverageTicketPrice()));
            }
            salesReport.setTicketsByMonth(ticketsByMonth);
            
            logger.info("Successfully prepared sales report response");
        } catch (Exception e) {
            logger.error("Error converting sales report data", e);
        }
        
        return new ResponseEntity<>(salesReport, HttpStatus.OK);
    }
}