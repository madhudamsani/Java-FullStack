import { Component, OnInit, OnDestroy } from '@angular/core';
import { ShowService } from '../../services/show.service';
import { OrganizerService, SalesReport, OrganizerDashboardStats } from '../../services/organizer.service';
import { Show } from '../../models/show.model';
import { WebSocketService } from '../../services/websocket.service';

import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

@Component({
  selector: 'app-organizer-dashboard',
  templateUrl: './organizer-dashboard.component.html',
  styleUrls: ['./organizer-dashboard.component.css', '../../shared/styles/dashboard-animations.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, DecimalPipe]
})
export class OrganizerDashboardComponent implements OnInit, OnDestroy {
  private alive = true;
  private dataRefreshSubscription: Subscription | null = null;
  private activitySubscription: Subscription | null = null;
  private readonly REFRESH_INTERVAL = 30000; // 30 seconds
  private readonly ACTIVITY_TOPIC = '/topic/organizer/activity';
  
  shows: Show[] = [];
  salesReport: SalesReport | null = null;
  dashboardStats: OrganizerDashboardStats | null = null;
  selectedShow: Show | null = null;
  activeTab = 'overview';
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  // Filter form
  filterForm: FormGroup;
  showStatusOptions = ['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalShows = 0;

  constructor(
    private fb: FormBuilder,
    private showService: ShowService,
    private organizerService: OrganizerService,
    private router: Router,
    public webSocketService: WebSocketService // Changed to public so it can be accessed from the template
  ) {
    this.filterForm = this.fb.group({
      status: ['ALL'],
      search: [''],
      dateFrom: [''],
      dateTo: ['']
    });
  }

  ngOnInit(): void {
    console.log('OrganizerDashboardComponent: Initializing...');
    
    // Check if user is authenticated
    const token = localStorage.getItem('auth_token');
    console.log('Auth token available:', !!token);
    
    // Get current user info
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
      try {
        const currentUser = JSON.parse(currentUserStr);
        console.log('Current user role:', currentUser.role);
        
        // Check if user has organizer role
        if (currentUser.role !== 'ROLE_ORGANIZER' && currentUser.role !== 'ROLE_ADMIN') {
          console.error('User does not have organizer or admin role');
          this.errorMessage = 'You do not have permission to access this page.';
          return;
        }
      } catch (e) {
        console.error('Error parsing current user:', e);
      }
    } else {
      console.warn('No current user found in localStorage');
      this.errorMessage = 'Authentication required. Please log in.';
      return;
    }
    
    this.loadDashboardStats();
    this.loadShows();
    this.loadSalesReport();
    this.setupAutoRefresh();
    
    // Wait for initial data to load before subscribing to real-time updates
    setTimeout(() => {
      this.subscribeToRealtimeActivity();
    }, 1000);
  }
  
  /**
   * Subscribe to real-time activity updates via WebSocket
   */
  private subscribeToRealtimeActivity(): void {
    console.log('Subscribing to real-time activity updates via WebSocket');
    
    try {
      this.activitySubscription = this.webSocketService
        .connect(this.ACTIVITY_TOPIC)
        .pipe(takeWhile(() => this.alive))
        .subscribe({
          next: (activity) => {
            console.log('Received real-time activity update:', activity);
            // Handle real-time updates here
            this.refreshData();
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
   * Set the active tab and load relevant data
   */
  setActiveTab(tab: string): void {
    this.activeTab = tab;
    
    // Load data for the selected tab if not already loaded
    if (tab === 'shows') {
      this.loadShows();
    } else if (tab === 'sales') {
      this.loadSalesReport();
    } else if (tab === 'overview') {
      this.loadDashboardStats();
    }
  }

  private setupAutoRefresh(): void {
    console.log(`Setting up auto-refresh every ${this.REFRESH_INTERVAL/1000} seconds`);
    this.dataRefreshSubscription = interval(this.REFRESH_INTERVAL)
      .pipe(takeWhile(() => this.alive))
      .subscribe(() => {
        console.log('Auto-refreshing dashboard data...');
        this.loadDashboardStats();
        this.loadShows();
        this.loadSalesReport();
      });
  }

  loadDashboardStats(): void {
    this.isLoading = true;
    console.log('Loading dashboard stats via HTTP...');
    
    // Get date range from filter form if available
    const dateFrom = this.filterForm.value.dateFrom || undefined;
    const dateTo = this.filterForm.value.dateTo || undefined;
    
    // Check if user is authenticated
    const token = localStorage.getItem('auth_token');
    console.log('Auth token available:', !!token);
    
    // Get current user info
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
      try {
        const currentUser = JSON.parse(currentUserStr);
        console.log('Current user role:', currentUser.role);
        this.debugUserInfo(currentUser);
      } catch (e) {
        console.error('Error parsing current user:', e);
      }
    } else {
      console.warn('No current user found in localStorage');
    }
    
    this.organizerService.getDashboardStats(dateFrom, dateTo).subscribe({
      next: (stats) => {
        console.log('Dashboard stats loaded successfully via HTTP:', stats);
        this.debugDashboardStats(stats);
        
        // Ensure all required properties exist
        this.dashboardStats = {
          totalShows: stats.totalShows || 0,
          activeShows: stats.activeShows || 0,
          totalRevenue: stats.totalRevenue || 0,
          totalTicketsSold: stats.totalTicketsSold || 0,
          upcomingShows: stats.upcomingShows || 0,
          revenueByMonth: stats.revenueByMonth || [],
          ticketsSoldByShow: stats.ticketsSoldByShow || []
        };
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        console.error('Error details:', error.message);
        if (error.error) {
          console.error('Server error:', error.error);
        }
        this.errorMessage = 'Failed to load dashboard statistics. Please try again.';
        this.isLoading = false;
      }
    });
  }
  
  /**
   * Request dashboard data via WebSocket
   */
  requestDashboardDataViaWebSocket(): void {
    if (!this.webSocketService.isConnected()) {
      console.warn('WebSocket not connected. Cannot request dashboard data.');
      return;
    }
    
    console.log('Requesting dashboard data via WebSocket...');
    
    // Get date range from filter form if available
    const dateFrom = this.filterForm.value.dateFrom || undefined;
    const dateTo = this.filterForm.value.dateTo || undefined;
    
    // Prepare payload
    const payload: any = {};
    if (dateFrom) payload.startDate = dateFrom;
    if (dateTo) payload.endDate = dateTo;
    
    // Send request via WebSocket
    this.webSocketService.send('/app/organizer/dashboard', payload);
  }

  loadShows(): void {
    this.isLoading = true;
    
    // Get filter values
    const filters = {
      status: this.filterForm.value.status !== 'ALL' ? this.filterForm.value.status : undefined,
      search: this.filterForm.value.search || undefined,
      dateFrom: this.filterForm.value.dateFrom || undefined,
      dateTo: this.filterForm.value.dateTo || undefined,
      page: this.currentPage - 1, // API uses 0-based indexing
      pageSize: this.pageSize
    };
    
    this.showService.searchMyShowsByFilters(filters).subscribe({
      next: (response) => {
        if (Array.isArray(response)) {
          this.shows = response;
          this.totalShows = response.length;
        } else {
          this.shows = response.content;
          this.totalShows = response.totalElements;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading shows:', error);
        this.errorMessage = 'Failed to load shows. Please try again.';
        this.isLoading = false;
      }
    });
  }

  loadSalesReport(): void {
    this.isLoading = true;
    console.log('Loading sales report...');
    
    // Get date range from filter form if available
    const dateFrom = this.filterForm.value.dateFrom || undefined;
    const dateTo = this.filterForm.value.dateTo || undefined;
    
    // Get selected show ID if available
    const showId = this.selectedShow ? this.selectedShow.id : undefined;
    
    this.organizerService.getSalesReport(dateFrom, dateTo, showId).subscribe({
      next: (report) => {
        console.log('Sales report loaded:', report);
        this.debugSalesReport(report);
        
        // Ensure all required properties exist
        this.salesReport = {
          totalRevenue: report.totalRevenue || 0,
          ticketsSold: report.ticketsSold || 0,
          averageTicketPrice: report.averageTicketPrice || 0,
          occupancyRate: report.occupancyRate || 0,
          revenueByShow: report.revenueByShow || [],
          revenueByMonth: report.revenueByMonth || [],
          revenueByCategory: report.revenueByCategory || [],
          salesByDay: report.salesByDay || [],
          topSellingShows: report.topSellingShows || [],
          topSellingVenues: report.topSellingVenues || [],
          conversionRate: report.conversionRate || 0,
          revenueTrend: report.revenueTrend || 'stable',
          maxMonthlyRevenue: report.maxMonthlyRevenue || 0,
          revenueByPaymentMethod: report.revenueByPaymentMethod || []
        };
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading sales report:', error);
        console.error('Error details:', error.message);
        if (error.error) {
          console.error('Server error:', error.error);
        }
        this.errorMessage = 'Failed to load sales report. Please try again.';
        this.isLoading = false;
      }
    });
  }
  
  /**
   * Request sales report data via WebSocket
   */
  requestSalesReportViaWebSocket(): void {
    if (!this.webSocketService.isConnected()) {
      console.warn('WebSocket not connected. Cannot request sales report.');
      return;
    }
    
    console.log('Requesting sales report via WebSocket...');
    
    // Get date range from filter form if available
    const dateFrom = this.filterForm.value.dateFrom || undefined;
    const dateTo = this.filterForm.value.dateTo || undefined;
    
    // Get selected show ID if available
    const showId = this.selectedShow ? this.selectedShow.id : undefined;
    
    // Prepare payload
    const payload: any = {};
    if (dateFrom) payload.dateFrom = dateFrom;
    if (dateTo) payload.dateTo = dateTo;
    if (showId) payload.showId = showId.toString();
    
    // Send request via WebSocket
    this.webSocketService.send('/app/organizer/sales-report', payload);
  }

  applyFilters(): void {
    this.currentPage = 1; // Reset to first page when applying filters
    this.loadShows();
    this.loadDashboardStats();
    this.loadSalesReport();
    
    // Then request real-time updates via WebSocket
    if (this.webSocketService.isConnected()) {
      this.requestDashboardDataViaWebSocket();
      this.requestSalesReportViaWebSocket();
    }
  }
  
  /**
   * Apply filter for dashboard data
   */
  applyFilter(): void {
    console.log('Applying filter with values:', this.filterForm.value);
    
    // Load data via HTTP first for immediate feedback
    this.loadDashboardStats();
    this.loadShows();
    this.loadSalesReport();
    
    // Then request real-time updates via WebSocket
    if (this.webSocketService.isConnected()) {
      this.requestDashboardDataViaWebSocket();
      this.requestSalesReportViaWebSocket();
    }
  }

  resetFilters(): void {
    this.filterForm.reset({
      status: 'ALL',
      search: '',
      dateFrom: '',
      dateTo: ''
    });
    this.currentPage = 1;
    this.loadShows();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadShows();
  }



  /**
   * Refresh all dashboard data
   */
  refreshData(): void {
    console.log('Manually refreshing dashboard data...');
    this.isLoading = true;
    
    // Load data based on active tab
    if (this.activeTab === 'overview') {
      this.loadDashboardStats();
      this.loadShows();
    } else if (this.activeTab === 'shows') {
      this.loadShows();
    } else if (this.activeTab === 'sales') {
      this.loadSalesReport();
    }
    
    // Show success message
    setTimeout(() => {
      this.isLoading = false;
      this.successMessage = 'Dashboard data refreshed successfully';
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    }, 1000);
  }

  
  getShowStatusClass(status: string | undefined): string {
    if (!status) return 'bg-light text-dark';
    
    switch (status) {
      case 'UPCOMING':
        return 'bg-primary';
      case 'ONGOING':
        return 'bg-success';
      case 'COMPLETED':
        return 'bg-secondary';
      case 'CANCELLED':
        return 'bg-danger';
      default:
        return 'bg-light text-dark';
    }
  }
  
  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString();
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Error';
    }
  }
  
  /**
   * Get the number of tickets sold for a show
   * This is a helper method to handle the case where the ticketsSold property doesn't exist on the Show type
   */
  getShowTicketsSold(show: any): number {
    // Check if the show has a ticketsSold property
    if (show && 'ticketsSold' in show) {
      return show.ticketsSold || 0;
    }
    
    // If not, try to find it in the dashboard stats
    if (this.dashboardStats && this.dashboardStats.ticketsSoldByShow) {
      const showStats = this.dashboardStats.ticketsSoldByShow.find(
        (item: any) => item.showId === show.id || item.showTitle === show.title
      );
      if (showStats) {
        return showStats.ticketsSold || 0;
      }
    }
    
    // Default to 0 if no data is found
    return 0;
  }
  
  // Debug methods
  private debugUserInfo(user: any): void {
    console.log('Debug - User Info:');
    console.log('ID:', user.id);
    console.log('Username:', user.username);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('First Name:', user.firstName);
    console.log('Last Name:', user.lastName);
  }
  
  private debugDashboardStats(stats: any): void {
    console.log('Debug - Dashboard Stats:');
    console.log('Total Shows:', stats.totalShows);
    console.log('Active Shows:', stats.activeShows);
    console.log('Total Revenue:', stats.totalRevenue);
    console.log('Total Tickets Sold:', stats.totalTicketsSold);
    console.log('Upcoming Shows:', stats.upcomingShows);
    
    if (stats.revenueByMonth) {
      console.log('Revenue By Month:', stats.revenueByMonth.length, 'entries');
      stats.revenueByMonth.forEach((item: any, index: number) => {
        console.log(`Month ${index}:`, item.month, 'Revenue:', item.amount || item.revenue);
      });
    } else {
      console.log('Revenue By Month: Not available');
    }
    
    if (stats.ticketsSoldByShow) {
      console.log('Tickets Sold By Show:', stats.ticketsSoldByShow.length, 'entries');
      stats.ticketsSoldByShow.forEach((item: any, index: number) => {
        console.log(`Show ${index}:`, item.showTitle, 'Tickets:', item.ticketsSold);
      });
    } else {
      console.log('Tickets Sold By Show: Not available');
    }
  }
  
  private debugSalesReport(report: any): void {
    console.log('Debug - Sales Report:');
    console.log('Total Revenue:', report.totalRevenue);
    console.log('Tickets Sold:', report.ticketsSold);
    console.log('Average Ticket Price:', report.averageTicketPrice);
    console.log('Occupancy Rate:', report.occupancyRate);
    
    if (report.revenueByShow) {
      console.log('Revenue By Show:', report.revenueByShow.length, 'entries');
      report.revenueByShow.forEach((item: any, index: number) => {
        console.log(`Show ${index}:`, item.showTitle, 'Revenue:', item.revenue);
      });
    } else {
      console.log('Revenue By Show: Not available');
    }
    
    if (report.revenueByMonth) {
      console.log('Revenue By Month:', report.revenueByMonth.length, 'entries');
      report.revenueByMonth.forEach((item: any, index: number) => {
        console.log(`Month ${index}:`, item.month, 'Amount:', item.amount);
      });
    } else {
      console.log('Revenue By Month: Not available');
    }
    
    if (report.topSellingShows) {
      console.log('Top Selling Shows:', report.topSellingShows.length, 'entries');
      report.topSellingShows.forEach((item: any, index: number) => {
        console.log(`Show ${index}:`, item.showTitle, 'Tickets:', item.ticketsSold);
      });
    } else {
      console.log('Top Selling Shows: Not available');
    }
  }
  
  getTotalPages(): number {
    return Math.ceil(this.totalShows / this.pageSize);
  }
  
  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    
    // Show at most 5 page numbers
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}