import { Component, OnInit } from '@angular/core';
import { AdminService, UserReport, SalesReport } from '../../services/admin.service';

@Component({
  selector: 'app-report-management',
  templateUrl: './report-management.component.html',
  styleUrls: ['./report-management.component.css']
})
export class ReportManagementComponent implements OnInit {
  userReport: UserReport | null = null;
  salesReport: SalesReport | null = null;
  activeTab = 'users';
  isLoading = false;
  error = '';

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadUserReport();
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    
    if (tab === 'users' && !this.userReport) {
      this.loadUserReport();
    } else if (tab === 'sales' && !this.salesReport) {
      this.loadSalesReport();
    }
  }



  loadUserReport(): void {
    this.isLoading = true;
    this.error = '';
    
    console.log('Loading user report...');
    
    this.adminService.getUserReport().subscribe({
      next: (report) => {
        console.log('User report loaded successfully:', report);
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

  loadSalesReport(): void {
    this.isLoading = true;
    this.error = '';
    
    console.log('Loading sales report...');
    
    this.adminService.getSalesReport().subscribe({
      next: (report) => {
        console.log('Sales report loaded successfully:', report);
        this.salesReport = report;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load sales report. Please try again.';
        this.isLoading = false;
        console.error('Error loading sales report:', error);
      }
    });
  }

  exportReportCSV(): void {
    // In a real implementation, this would generate and download a CSV file
    const reportType = this.activeTab === 'users' ? 'User Analytics' : 'Sales Reports';
    
    // Create a simple CSV from the current report data
    let csvContent = '';
    
    if (this.activeTab === 'users' && this.userReport) {
      csvContent = `User Report\n\n`;
      csvContent += `Total Users,${this.userReport.totalUsers}\n`;
      csvContent += `Active Users,${this.userReport.activeUsers}\n`;
      csvContent += `New Users,${this.userReport.newUsers}\n\n`;
      
      csvContent += `Users by Role\n`;
      csvContent += `Role,Count,Percentage\n`;
      for (const [role, count] of Object.entries(this.userReport.usersByRole || {})) {
        csvContent += `${role},${count},${this.getPercentage(count, this.userReport.totalUsers)}\n`;
      }
    } else if (this.activeTab === 'sales' && this.salesReport) {
      csvContent = `Sales Report\n\n`;
      csvContent += `Total Revenue,$${this.salesReport.totalRevenue.toFixed(2)}\n`;
      csvContent += `Tickets Sold,${this.salesReport.ticketsSold}\n`;
      csvContent += `Average Ticket Price,$${this.salesReport.averageTicketPrice.toFixed(2)}\n\n`;
      
      csvContent += `Revenue by Show\n`;
      csvContent += `Show ID,Title,Revenue,Percentage\n`;
      for (const show of this.salesReport.revenueByShow || []) {
        csvContent += `${show.showId},${show.showTitle},$${show.revenue.toFixed(2)},${this.getPercentage(show.revenue, this.salesReport.totalRevenue)}\n`;
      }
    }
    
    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType.toLowerCase().replace(' ', '_')}_${this.formatDate(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`Exported ${reportType} to CSV`);
  }

  printReport(): void {
    // In a real implementation, this would format and print the report
    console.log('Printing report...');
    window.print();
  }

  // Helper methods for calculating percentages
  getPercentage(value: number, total: number): string {
    if (!total) return '0%';
    return Math.round((value / total) * 100) + '%';
  }

  getPercentageValue(value: number, total: number): number {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  }

  // Helper method to format date for CSV filename
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}