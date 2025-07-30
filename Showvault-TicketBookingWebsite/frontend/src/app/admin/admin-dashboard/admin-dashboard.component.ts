import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { AdminService, DashboardStats, UserReport, SalesReport } from '../../services/admin.service';
import { interval, Subscription, forkJoin } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { default as Annotation } from 'chartjs-plugin-annotation';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css', '../../shared/styles/dashboard-animations.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;
  
  private alive = true;
  private dataRefreshSubscription: Subscription | null = null;
  private activitySubscription: Subscription | null = null;
  private readonly REFRESH_INTERVAL = 30000; // 30 seconds
  private readonly ACTIVITY_TOPIC = '/topic/admin/activity';
  dashboardStats: DashboardStats | null = null;
  userReport: UserReport | null = null;
  salesReport: SalesReport | null = null;
  activeTab = 'overview';
  isLoading = true;
  error = '';

  // Chart configurations
  userDistributionChartData: ChartData<'pie'> = {
    labels: ['Regular Users', 'Organizers', 'Admins'],
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: ['#0d6efd', '#20c997', '#dc3545']
      }
    ]
  };

  userDistributionChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      }
    }
  };

  userGrowthChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'User Growth',
        fill: true,
        tension: 0.4,
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13, 110, 253, 0.1)',
        pointBackgroundColor: '#0d6efd',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#0d6efd'
      }
    ]
  };

  userGrowthChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      }
    }
  };

  revenueChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Monthly Revenue',
        backgroundColor: '#20c997',
        hoverBackgroundColor: '#198754'
      }
    ]
  };

  revenueChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value;
          }
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += '$' + context.parsed.y.toFixed(2);
            }
            return label;
          }
        }
      }
    }
  };

  constructor(
    private adminService: AdminService,
    public webSocketService: WebSocketService  // Changed to public so it can be accessed from the template
  ) { }

  ngOnInit(): void {
    this.loadDashboardData();
    this.setupAutoRefresh();
    
    // Wait for initial data to load before subscribing to real-time updates
    setTimeout(() => {
      this.subscribeToRealtimeActivity();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.alive = false;
    
    // Clean up subscriptions
    if (this.dataRefreshSubscription) {
      this.dataRefreshSubscription.unsubscribe();
    }
    if (this.activitySubscription) {
      this.activitySubscription.unsubscribe();
    }
    
    // Disconnect from WebSocket if we're the only subscriber
    // This is a safe approach as other components might be using the WebSocket service
    if (this.webSocketService.isConnected()) {
      console.log('Disconnecting from WebSocket');
      try {
        // Only disconnect from our specific topic
        this.webSocketService.disconnect();
      } catch (error) {
        console.error('Error disconnecting from WebSocket:', error);
        // Continue with cleanup even if disconnect fails
      }
    }
  }
  
  /**
   * Subscribe to real-time activity updates via WebSocket
   */
  private subscribeToRealtimeActivity(): void {
    console.log('Subscribing to real-time activity updates via WebSocket');
    
    // Check if we're running on localhost and log the connection details
    if (window.location.hostname === 'localhost') {
      console.log('Running on localhost. WebSocket endpoint:', 
        `${window.location.protocol}//${window.location.hostname}:8080/api/ws`);
    }
    
    try {
      this.activitySubscription = this.webSocketService
        .connect(this.ACTIVITY_TOPIC)
        .pipe(takeWhile(() => this.alive))
        .subscribe({
          next: (activity) => {
            console.log('Received real-time activity update:', activity);
            this.updateRecentActivity(activity);
          },
          error: (error) => {
            console.error('WebSocket activity subscription error:', error);
            // Don't show error to user, just log it
            // The dashboard will still work with periodic refresh
          },
          complete: () => {
            console.log('WebSocket activity subscription completed');
          }
        });
    } catch (error) {
      console.error('Error setting up WebSocket connection:', error);
      // Continue with application flow even if WebSocket fails
      // The dashboard will still work with periodic refresh
    }
  }
  
  /**
   * Update the recent activity list with new real-time data
   */
  private updateRecentActivity(activity: any): void {
    if (!this.dashboardStats) {
      return;
    }
    
    // Initialize recentActivity array if it doesn't exist
    if (!this.dashboardStats.recentActivity) {
      this.dashboardStats.recentActivity = [];
    }
    
    // Ensure the activity has a timestamp if not provided
    if (!activity.timestamp) {
      activity.timestamp = new Date().toISOString();
    }
    
    // Add the new activity to the beginning of the array
    this.dashboardStats.recentActivity.unshift(activity);
    
    // Limit the array to the most recent 10 activities
    if (this.dashboardStats.recentActivity.length > 10) {
      this.dashboardStats.recentActivity = this.dashboardStats.recentActivity.slice(0, 10);
    }
    
    // Apply animation class to the first item (will be handled by the template)
    // The CSS class 'new-activity' is applied in the template using [class.new-activity]="i === 0"
  }

  private setupAutoRefresh(): void {
    this.dataRefreshSubscription = interval(this.REFRESH_INTERVAL)
      .pipe(takeWhile(() => this.alive))
      .subscribe(() => {
        this.loadDashboardData();
      });
  }

  loadDashboardData(startDate?: string, endDate?: string): void {
    // Don't prevent the initial load
    if (this.isLoading && this.dashboardStats !== null) {
      console.log('Skipping duplicate request while loading');
      return;
    }
    
    console.log('Loading dashboard data...');
    this.isLoading = true;
    this.error = '';
    
    // Load all dashboard data concurrently
    const dashboardRequest = this.adminService.getDashboardStats(startDate, endDate);
    const userRequest = this.adminService.getUserReport({ startDate, endDate });
    const salesRequest = this.adminService.getSalesReport();
    
    // Use forkJoin to handle all requests together
    forkJoin({
      stats: dashboardRequest,
      users: userRequest,
      sales: salesRequest
    }).subscribe({
      next: (data: { stats: DashboardStats; users: UserReport; sales: SalesReport }) => {
        this.dashboardStats = data.stats;
        this.userReport = data.users;
        this.salesReport = data.sales;
        this.isLoading = false;
        
        // Update chart data
        this.updateCharts();
      },
      error: (error: any) => {
        this.error = 'Failed to load dashboard data. Please try again.';
        this.isLoading = false;
        console.error('Error loading dashboard data:', error);
        
        // Check for authentication errors
        if (error.status === 401) {
          this.error = 'Authentication error. Please log in again.';
          console.error('Authentication error - user not authorized to access admin dashboard');
        } else if (error.status === 403) {
          this.error = 'Access denied. You do not have permission to view this data.';
          console.error('Authorization error - user does not have admin privileges');
        } else if (error.status === 0) {
          this.error = 'Cannot connect to the server. Please check if the backend is running.';
        }
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  loadUserReport(startDate?: string, endDate?: string): void {
    if (this.userReport && !startDate && !endDate) return; // Don't reload if already loaded and no date filters
    
    this.isLoading = true;
    this.error = '';
    
    this.adminService.getUserReport({ startDate, endDate }).subscribe({
      next: (report) => {
        this.userReport = report;
        this.isLoading = false;
        this.updateUserCharts();
      },
      error: (error: unknown) => {
        this.error = 'Failed to load user report. Please try again.';
        this.isLoading = false;
        console.error('Error loading user report:', error);
      }
    });
  }

  loadSalesReport(): void {
    if (this.salesReport) return; // Don't reload if already loaded
    
    this.isLoading = true;
    this.error = '';
    
    this.adminService.getSalesReport().subscribe({
      next: (report) => {
        this.salesReport = report;
        this.isLoading = false;
        this.updateSalesCharts();
      },
      error: (error: unknown) => {
        this.error = 'Failed to load sales report. Please try again.';
        this.isLoading = false;
        console.error('Error loading sales report:', error);
      }
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    
    // Load data for the selected tab if not already loaded
    if (tab === 'users') {
      this.loadUserReport();
    } else if (tab === 'sales') {
      this.loadSalesReport();
    }
  }

  // Helper method to format date
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }

  // Update all charts with real data
  private updateCharts(): void {
    this.updateUserCharts();
    this.updateSalesCharts();
  }

  // Update user-related charts
  private updateUserCharts(): void {
    if (this.userReport) {
      // Update user distribution chart
      this.userDistributionChartData.datasets[0].data = [
        this.userReport.userTypes?.regular || 0,
        this.userReport.userTypes?.organizer || 0,
        this.userReport.userTypes?.admin || 0
      ];

      // Update user growth chart
      if (this.userReport.growthByMonth && this.userReport.growthByMonth.length > 0) {
        // Extract month and count from each growth data point
        this.userGrowthChartData.labels = this.userReport.growthByMonth.map(item => item.month);
        this.userGrowthChartData.datasets[0].data = this.userReport.growthByMonth.map(item => 
          typeof item.count === 'number' ? item.count : 0);
      }

      // Refresh charts
      if (this.chart) {
        this.chart.update();
      }
    }
  }

  // Update sales-related charts
  private updateSalesCharts(): void {
    if (this.salesReport) {
      // Update revenue chart
      if (this.salesReport.revenueByMonth) {
        // Convert the Map to an array of objects for the chart
        const revenueData = Object.entries(this.salesReport.revenueByMonth).map(([month, amount]) => ({
          month,
          amount
        }));
        
        // Sort by month to ensure chronological order
        revenueData.sort((a, b) => a.month.localeCompare(b.month));
        
        // Update chart data
        this.revenueChartData.labels = revenueData.map(item => item.month);
        this.revenueChartData.datasets[0].data = revenueData.map(item => Number(item.amount));
      }

      // Refresh charts
      if (this.chart) {
        this.chart.update();
      }
    }
  }
}