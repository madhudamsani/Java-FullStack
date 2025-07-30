import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { UserReport } from '../../models/user-report.model';
import { SalesReport } from '../../models/sales-report.model';

@Component({
  selector: 'app-admin-reports',
  templateUrl: './admin-reports.component.html',
  styleUrls: ['./admin-reports.component.css']
})
export class AdminReportsComponent implements OnInit {
  activeTab = 'sales';
  salesReport: SalesReport | null = null;
  
  userReport: UserReport | null = null;
  isLoading = true;
  error = '';

  constructor(
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.isLoading = true;
    this.error = '';
    
    if (this.activeTab === 'sales') {
      this.loadSalesReport();
    } else if (this.activeTab === 'users') {
      this.loadUserReport();
    }
  }

  loadSalesReport(): void {
    // Use fixed 30 days date range
    const params = this.getDefaultDateRange();
    this.adminService.getSalesReport(params).subscribe({
      next: (report) => {
        // Transform the data to match the expected format
        const transformedReport: SalesReport = {
          ...report,
          // Convert revenueByMonth from object to array format
          revenueByMonth: this.convertRevenueByMonthToArray(report.revenueByMonth),
          // Convert revenueByCategory from object to array format
          revenueByCategory: this.convertRevenueByCategoryToArray(report.revenueByCategory),
          // Add missing properties with default values
          maxMonthlyRevenue: this.calculateMaxMonthlyRevenue(report.revenueByMonth),
          revenueByPaymentMethod: this.getRevenueByPaymentMethod(report),
          revenueByShow: this.getRevenueByShow(report)
        };
        
        this.salesReport = transformedReport;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load sales report. Please try again.';
        this.isLoading = false;
        console.error('Error loading sales report:', error);
      }
    });
  }
  
  // Helper method to convert revenueByMonth from object to array format
  private convertRevenueByMonthToArray(revenueByMonth: Array<{ month: string; revenue: number }> | { [key: string]: number } | undefined): Array<{ month: string; amount: number }> {
    if (!revenueByMonth) return [];
    
    // If it's already an array, convert it to the expected format
    if (Array.isArray(revenueByMonth)) {
      return revenueByMonth.map(item => ({
        month: item.month,
        amount: item.revenue
      })).sort((a, b) => a.month.localeCompare(b.month));
    }
    
    // Otherwise, convert from object format
    return Object.entries(revenueByMonth).map(([month, amount]) => ({
      month,
      amount
    })).sort((a, b) => a.month.localeCompare(b.month));
  }
  
  // Helper method to convert revenueByCategory from object to array format
  private convertRevenueByCategoryToArray(revenueByCategory: { [key: string]: number } | undefined): Array<{ category: string; revenue: number }> {
    if (!revenueByCategory) return [];
    
    return Object.entries(revenueByCategory).map(([category, revenue]) => ({
      category,
      revenue
    }));
  }
  
  // Helper method to calculate maxMonthlyRevenue
  private calculateMaxMonthlyRevenue(revenueByMonth: Array<{ month: string; revenue: number }> | { [key: string]: number } | undefined): number {
    if (!revenueByMonth) return 0;
    
    // If it's an array
    if (Array.isArray(revenueByMonth)) {
      const values = revenueByMonth.map(item => item.revenue);
      return values.length > 0 ? Math.max(...values) : 0;
    }
    
    // If it's an object
    const values = Object.values(revenueByMonth);
    return values.length > 0 ? Math.max(...values) : 0;
  }
  
  // Helper method to get revenueByPaymentMethod
  private getRevenueByPaymentMethod(report: any): Array<{ method: string; revenue: number }> {
    // If the backend provides this data, use it
    if (report.revenueByPaymentMethod) return report.revenueByPaymentMethod;
    
    // Otherwise, derive it from revenueByPlatform if available
    if (report.revenueByPlatform) {
      return Object.entries(report.revenueByPlatform).map(([method, revenue]) => ({
        method,
        revenue: revenue as number
      }));
    }
    
    // Default empty array if no data is available
    return [];
  }
  
  // Helper method to get revenueByShow
  private getRevenueByShow(report: any): Array<{ showTitle: string; revenue: number }> {
    // If the backend provides this data, use it
    if (report.revenueByShow) return report.revenueByShow;
    
    // Otherwise, derive it from topSellingShows if available
    if (report.topSellingShows) {
      return report.topSellingShows.map((show: any) => ({
        showTitle: show.name || show.title || 'Unknown Show',
        revenue: show.revenue
      }));
    }
    
    // Default empty array if no data is available
    return [];
  }

  loadUserReport(): void {
    // Use fixed 30 days date range
    const params = this.getDefaultDateRange();
    this.adminService.getUserReport(params).subscribe({
      next: (report) => {
        this.userReport = report;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load user report. Please try again.';
        this.isLoading = false;
        console.error('Error loading user report:', error);
      }
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.loadReports();
  }

  // Get default date range (last 30 days)
  private getDefaultDateRange(): { startDate: string; endDate: string } {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 30);

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  }

  exportReport(format: 'pdf' | 'csv' | 'excel'): void {
    // In a real application, this would call a backend API to generate the report
    alert(`Exporting ${this.activeTab} report as ${format.toUpperCase()}... (Not implemented in this demo)`);
  }

  printReport(): void {
    window.print();
  }
}