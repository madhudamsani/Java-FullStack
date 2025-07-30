package com.showvault.controller;

import com.showvault.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/reports")
@PreAuthorize("hasRole('ADMIN')")
public class ReportController {

    @Autowired
    private ReportService reportService;

    /**
     * Get dashboard statistics for admin overview
     * @return Map containing various statistics
     */
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        Map<String, Object> stats = reportService.getDashboardStats();
        return new ResponseEntity<>(stats, HttpStatus.OK);
    }

    /**
     * Get user statistics report
     * @return Map containing user statistics
     */
    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> getUserReport() {
        Map<String, Object> report = reportService.getUserReport();
        return new ResponseEntity<>(report, HttpStatus.OK);
    }

    /**
     * Get sales statistics report for a specific period
     * @param startDate Start date for the report period
     * @param endDate End date for the report period
     * @return Map containing sales statistics
     */
    @GetMapping("/sales")
    public ResponseEntity<Map<String, Object>> getSalesReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        // Default to last 30 days if dates not provided
        if (startDate == null) {
            startDate = LocalDateTime.now().minusDays(30);
        }
        
        if (endDate == null) {
            endDate = LocalDateTime.now();
        }
        
        Map<String, Object> report = reportService.getSalesReport(startDate, endDate);
        return new ResponseEntity<>(report, HttpStatus.OK);
    }

    /**
     * Get show performance report for a specific show
     * @param showId ID of the show
     * @return Map containing show performance statistics
     */
    @GetMapping("/shows/{showId}/performance")
    public ResponseEntity<Map<String, Object>> getShowPerformanceReport(@PathVariable Long showId) {
        Map<String, Object> report = reportService.getShowPerformanceReport(showId);
        
        if (report.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        
        return new ResponseEntity<>(report, HttpStatus.OK);
    }
    
    /**
     * Get trending shows based on recent bookings
     * @param days Number of days to look back for trending analysis (optional, default 30)
     * @param limit Maximum number of shows to return (optional, default 10)
     * @return Map containing trending shows data
     */
    @GetMapping("/trending-shows")
    public ResponseEntity<Map<String, Object>> getTrendingShowsReport(
            @RequestParam(required = false) Integer days,
            @RequestParam(required = false) Integer limit) {
        
        int daysToLookBack = days != null ? days : 30;
        int resultsLimit = limit != null ? limit : 10;
        
        Map<String, Object> report = reportService.getTrendingShowsReport(daysToLookBack, resultsLimit);
        return new ResponseEntity<>(report, HttpStatus.OK);
    }
    
    /**
     * Get top revenue-generating shows
     * @param days Number of days to look back for revenue analysis (optional, default 30)
     * @param limit Maximum number of shows to return (optional, default 10)
     * @return Map containing top revenue shows data
     */
    @GetMapping("/top-revenue-shows")
    public ResponseEntity<Map<String, Object>> getTopRevenueShowsReport(
            @RequestParam(required = false) Integer days,
            @RequestParam(required = false) Integer limit) {
        
        int daysToLookBack = days != null ? days : 30;
        int resultsLimit = limit != null ? limit : 10;
        
        Map<String, Object> report = reportService.getTopRevenueShowsReport(daysToLookBack, resultsLimit);
        return new ResponseEntity<>(report, HttpStatus.OK);
    }
}