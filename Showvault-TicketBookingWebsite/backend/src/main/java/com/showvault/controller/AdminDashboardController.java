package com.showvault.controller;

import com.showvault.model.DashboardStats;
import com.showvault.model.SalesReport;
import com.showvault.model.UserReport;
import com.showvault.service.AdminDashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin/dashboard")
@PreAuthorize("hasRole('ADMIN')")
public class AdminDashboardController {

    @Autowired
    private AdminDashboardService adminDashboardService;

    @GetMapping("/stats")
    public ResponseEntity<DashboardStats> getDashboardStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        DashboardStats stats;
        if (startDate != null && endDate != null) {
            stats = adminDashboardService.getDashboardStats(startDate, endDate);
        } else {
            stats = adminDashboardService.getDashboardStats();
        }
        
        return new ResponseEntity<>(stats, HttpStatus.OK);
    }

    @GetMapping("/user-report")
    public ResponseEntity<UserReport> getUserReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        UserReport report;
        if (startDate != null && endDate != null) {
            report = adminDashboardService.getUserReport(startDate, endDate);
        } else {
            report = adminDashboardService.getUserReport();
        }
        
        return new ResponseEntity<>(report, HttpStatus.OK);
    }

    @GetMapping("/sales-report")
    public ResponseEntity<?> getSalesReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        try {
            SalesReport report;
            if (startDate != null && endDate != null) {
                report = adminDashboardService.getSalesReport(startDate, endDate);
            } else {
                report = adminDashboardService.getSalesReport();
            }
            
            return new ResponseEntity<>(report, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>("Error generating sales report: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}