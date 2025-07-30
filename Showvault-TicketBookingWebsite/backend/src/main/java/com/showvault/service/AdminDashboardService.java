package com.showvault.service;

import com.showvault.model.DashboardStats;
import com.showvault.model.SalesReport;
import com.showvault.model.UserReport;

import java.time.LocalDate;

public interface AdminDashboardService {
    
    DashboardStats getDashboardStats();
    
    DashboardStats getDashboardStats(LocalDate startDate, LocalDate endDate);
    
    UserReport getUserReport();
    
    UserReport getUserReport(LocalDate startDate, LocalDate endDate);
    
    SalesReport getSalesReport();
    
    SalesReport getSalesReport(LocalDate startDate, LocalDate endDate);
}