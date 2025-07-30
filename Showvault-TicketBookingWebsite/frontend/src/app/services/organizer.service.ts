import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, delay, map } from 'rxjs/operators';

import { Show, ShowAnalytics, AudienceDemographics } from '../models/show.model';

export interface OrganizerDashboardStats {
  totalShows: number;
  activeShows: number;
  totalRevenue: number;
  totalTicketsSold: number;
  upcomingShows: number;
  revenueByMonth: { month: string; revenue: number }[];
  ticketsSoldByShow: { showId: number; showTitle: string; ticketsSold: number }[];
}

export interface SalesReport {
  totalRevenue: number;
  ticketsSold: number;
  averageTicketPrice: number;
  occupancyRate: number; // percentage
  revenueByShow: { showId: number; showTitle: string; revenue: number }[];
  revenueByMonth: { month: string; amount: number }[]; // Using amount instead of revenue
  // This can be either an array of objects or a simple key-value object
  revenueByCategory: { category: string; revenue: number }[] | { [key: string]: number };
  salesByDay: { date: string; sales: number }[];
  topSellingShows: { showId: number; showTitle: string; ticketsSold: number }[];
  topSellingVenues: { venueId: number; venueName: string; ticketsSold: number }[];
  // Optional properties
  conversionRate?: number;
  revenueTrend?: 'increasing' | 'decreasing' | 'stable';
  maxMonthlyRevenue?: number;
  revenueByPaymentMethod?: { method: string; revenue: number }[];
}

export interface CustomerMessage {
  id?: number;
  showId: number;
  scheduleId?: number;
  subject: string;
  message: string;
  recipientType: 'ALL' | 'TICKET_HOLDERS' | 'SPECIFIC_USERS';
  recipientIds?: number[]; // User IDs if SPECIFIC_USERS
  status: 'DRAFT' | 'SENT' | 'SCHEDULED';
  scheduledDate?: string;
  sentDate?: string;
  sentCount?: number;
  openCount?: number;
  clickCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizerService {
  private apiUrl = 'http://localhost:8080/api/organizer';
  
  private get httpOptions() {
    // Get the auth token from localStorage
    const token = localStorage.getItem('auth_token');
    
    // Create headers with content type and auth token if available
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
    
    return { headers };
  };

  constructor(private http: HttpClient) { }

  // Dashboard statistics
  getDashboardStats(startDate?: string, endDate?: string): Observable<OrganizerDashboardStats> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    
    if (endDate) {
      params = params.set('endDate', endDate);
    }
    
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    params = params.set('_', timestamp.toString());
    
    console.log('Fetching dashboard stats with params:', params.toString());
    
    // Get the auth token directly to ensure we have it for this request
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('No authentication token available for dashboard stats');
      return throwError(() => new Error('Authentication required to fetch dashboard stats'));
    }
    
    // Get current user info for debugging
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
      try {
        const currentUser = JSON.parse(currentUserStr);
        console.log('Current user from localStorage:', currentUser);
      } catch (e) {
        console.error('Error parsing current user:', e);
      }
    } else {
      console.warn('No current user found in localStorage');
    }
    
    // Create headers with auth token
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Authorization': `Bearer ${token}`
    });
    
    console.log('Making HTTP request to:', `${this.apiUrl}/dashboard`);
    console.log('With headers:', headers);
    
    // First try to get real data from the backend
    return this.http.get<any>(`${this.apiUrl}/dashboard`, { 
      params,
      headers,
      observe: 'response'  // Get full response including headers and status
    }).pipe(
      map((response: any) => {
        console.log('HTTP Status:', response.status);
        console.log('Response headers:', response.headers);
        console.log('Raw dashboard response body:', response.body);
        
        const responseData = response.body;
        
        // Map the backend response to our frontend model
        const stats: OrganizerDashboardStats = {
          totalShows: responseData.totalShows || 0,
          activeShows: responseData.activeShows || 0,
          totalRevenue: responseData.totalRevenue || 0,
          totalTicketsSold: responseData.totalTicketsSold || 0,
          upcomingShows: responseData.upcomingShows || 0,
          revenueByMonth: responseData.revenueByMonth || [],
          ticketsSoldByShow: responseData.ticketsSoldByShow || []
        };
        
        // Log the show status counts if available
        if (responseData.showsByStatus) {
          console.log('Shows by status:', responseData.showsByStatus);
          
          // Update activeShows if we have ONGOING status count
          if (responseData.showsByStatus.ONGOING) {
            stats.activeShows = responseData.showsByStatus.ONGOING;
            console.log('Updated activeShows from showsByStatus:', stats.activeShows);
          }
          
          // Update upcomingShows if we have UPCOMING status count
          if (responseData.showsByStatus.UPCOMING) {
            stats.upcomingShows = responseData.showsByStatus.UPCOMING;
            console.log('Updated upcomingShows from showsByStatus:', stats.upcomingShows);
          }
        }
        
        return stats;
      }),
      catchError(error => {
        console.error('Error fetching dashboard stats:', error);
        console.error('Status:', error.status);
        console.error('Status text:', error.statusText);
        console.error('Error details:', error.error);
        
        // If we get a 401 (Unauthorized), redirect to login
        if (error.status === 401) {
          console.error('Authentication error - redirecting to login');
          // Clear local storage and redirect to login page
          localStorage.removeItem('auth_token');
          localStorage.removeItem('currentUser');
          window.location.href = '/login';
          return throwError(() => new Error('Authentication required'));
        }
        
        // If we get a 403 or other error, return mock data for development
        console.log('Returning mock dashboard stats for development');
        
        // Create mock data
        const mockStats: OrganizerDashboardStats = {
          totalShows: 5,
          activeShows: 2,
          totalRevenue: 25000,
          totalTicketsSold: 350,
          upcomingShows: 2,
          revenueByMonth: [
            { month: '2025-01', revenue: 5000 },
            { month: '2025-02', revenue: 7500 },
            { month: '2025-03', revenue: 6000 },
            { month: '2025-04', revenue: 8500 },
            { month: '2025-05', revenue: 10000 }
          ],
          ticketsSoldByShow: [
            { showId: 1, showTitle: 'Hamilton', ticketsSold: 120 },
            { showId: 2, showTitle: 'The Lion King', ticketsSold: 85 },
            { showId: 3, showTitle: 'Wicked', ticketsSold: 65 },
            { showId: 4, showTitle: 'Phantom of the Opera', ticketsSold: 45 },
            { showId: 5, showTitle: 'Chicago', ticketsSold: 35 }
          ]
        };
        
        return of(mockStats).pipe(delay(500)); // Simulate network delay
      })
    );
  }

  // Sales reports
  getSalesReport(dateFrom?: string, dateTo?: string, showId?: number): Observable<SalesReport> {
    let params = new HttpParams();
    
    if (dateFrom) {
      params = params.set('dateFrom', dateFrom);
    }
    
    if (dateTo) {
      params = params.set('dateTo', dateTo);
    }
    
    if (showId) {
      params = params.set('showId', showId.toString());
    }
    
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    params = params.set('_', timestamp.toString());
    
    console.log('Fetching sales report with params:', params.toString());
    
    // Get the auth token directly to ensure we have it for this request
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('No authentication token available for sales report');
      return throwError(() => new Error('Authentication required to fetch sales report'));
    }
    
    // Get current user info for debugging
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
      try {
        const currentUser = JSON.parse(currentUserStr);
        console.log('Current user from localStorage:', currentUser);
      } catch (e) {
        console.error('Error parsing current user:', e);
      }
    } else {
      console.warn('No current user found in localStorage');
    }
    
    // Create headers with auth token
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Authorization': `Bearer ${token}`
    });
    
    console.log('Making HTTP request to:', `${this.apiUrl}/sales-report`);
    console.log('With headers:', headers);
    
    // First try to get real data from the backend
    return this.http.get<any>(`${this.apiUrl}/sales-report`, { 
      params,
      headers,
      observe: 'response'  // Get full response including headers and status
    }).pipe(
      map((response: any) => {
        console.log('HTTP Status:', response.status);
        console.log('Response headers:', response.headers);
        console.log('Raw sales report response body:', response.body);
        
        const responseData = response.body;
        
        // Map the backend response to our frontend model
        const report: SalesReport = {
          totalRevenue: responseData.totalRevenue || 0,
          ticketsSold: responseData.ticketsSold || 0,
          averageTicketPrice: responseData.averageTicketPrice || 0,
          occupancyRate: responseData.occupancyRate || 0,
          revenueByShow: responseData.revenueByShow || [],
          revenueByMonth: responseData.revenueByMonth || [],
          revenueByCategory: responseData.revenueByCategory || [],
          salesByDay: responseData.salesByDay || [],
          topSellingShows: responseData.topSellingShows || [],
          topSellingVenues: responseData.topSellingVenues || [],
          conversionRate: responseData.conversionRate,
          revenueTrend: responseData.revenueTrend,
          maxMonthlyRevenue: responseData.maxMonthlyRevenue,
          revenueByPaymentMethod: responseData.revenueByPaymentMethod || []
        };
        
        return report;
      }),
      catchError(error => {
        console.error('Error fetching sales report:', error);
        console.error('Status:', error.status);
        console.error('Status text:', error.statusText);
        console.error('Error details:', error.error);
        
        // If we get a 401 (Unauthorized), redirect to login
        if (error.status === 401) {
          console.error('Authentication error - redirecting to login');
          // Clear local storage and redirect to login page
          localStorage.removeItem('auth_token');
          localStorage.removeItem('currentUser');
          window.location.href = '/login';
          return throwError(() => new Error('Authentication required'));
        }
        
        // If we get a 403 or other error, return mock data for development
        console.log('Returning mock sales report for development');
        
        // Create mock data
        const mockSalesReport: SalesReport = {
          totalRevenue: 25000,
          ticketsSold: 350,
          averageTicketPrice: 71.43,
          occupancyRate: 78.5,
          revenueByShow: [
            { showId: 1, showTitle: 'Hamilton', revenue: 8500 },
            { showId: 2, showTitle: 'The Lion King', revenue: 6200 },
            { showId: 3, showTitle: 'Wicked', revenue: 4800 },
            { showId: 4, showTitle: 'Phantom of the Opera', revenue: 3200 },
            { showId: 5, showTitle: 'Chicago', revenue: 2300 }
          ],
          revenueByMonth: [
            { month: '2025-01', amount: 5000 },
            { month: '2025-02', amount: 7500 },
            { month: '2025-03', amount: 6000 },
            { month: '2025-04', amount: 8500 },
            { month: '2025-05', amount: 10000 }
          ],
          // Using array format for revenueByCategory
          revenueByCategory: [
            { category: 'Musical', revenue: 15000 },
            { category: 'Drama', revenue: 5000 },
            { category: 'Comedy', revenue: 3000 },
            { category: 'Concert', revenue: 2000 }
          ],
          salesByDay: [
            { date: '2025-05-10', sales: 1200 },
            { date: '2025-05-11', sales: 1500 },
            { date: '2025-05-12', sales: 1000 },
            { date: '2025-05-13', sales: 1800 },
            { date: '2025-05-14', sales: 2000 },
            { date: '2025-05-15', sales: 2500 },
            { date: '2025-05-16', sales: 3000 }
          ],
          topSellingShows: [
            { showId: 1, showTitle: 'Hamilton', ticketsSold: 120 },
            { showId: 2, showTitle: 'The Lion King', ticketsSold: 85 },
            { showId: 3, showTitle: 'Wicked', ticketsSold: 65 },
            { showId: 4, showTitle: 'Phantom of the Opera', ticketsSold: 45 },
            { showId: 5, showTitle: 'Chicago', ticketsSold: 35 }
          ],
          topSellingVenues: [
            { venueId: 1, venueName: 'Broadway Theater', ticketsSold: 150 },
            { venueId: 2, venueName: 'Lincoln Center', ticketsSold: 100 },
            { venueId: 3, venueName: 'Radio City Music Hall', ticketsSold: 75 },
            { venueId: 4, venueName: 'Madison Square Garden', ticketsSold: 25 }
          ],
          conversionRate: 65.2,
          revenueTrend: 'increasing',
          maxMonthlyRevenue: 10000,
          revenueByPaymentMethod: [
            { method: 'Credit Card', revenue: 18000 },
            { method: 'PayPal', revenue: 5000 },
            { method: 'Bank Transfer', revenue: 2000 }
          ]
        };
        
        return of(mockSalesReport).pipe(delay(500)); // Simulate network delay
      })
    );
  }

  // Audience demographics
  getAudienceDemographics(showId?: number): Observable<AudienceDemographics> {
    let params = new HttpParams();
    
    if (showId) {
      params = params.set('showId', showId.toString());
    }
    
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    params = params.set('_', timestamp.toString());
    
    console.log('Fetching audience demographics with params:', params.toString());
    
    // Get the auth token directly to ensure we have it for this request
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('No authentication token available for audience demographics');
      return throwError(() => new Error('Authentication required to fetch audience demographics'));
    }
    
    // Create headers with auth token
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Authorization': `Bearer ${token}`
    });
    
    // First try to get real data from the backend
    return this.http.get<AudienceDemographics>(`${this.apiUrl}/audience-demographics`, { 
      params,
      headers
    }).pipe(
      catchError(error => {
        console.error('Error fetching audience demographics:', error);
        
        // If we get a 403 or other error, return mock data for development
        console.log('Returning mock audience demographics for development');
        
        // Create mock data
        const mockDemographics: AudienceDemographics = {
          ageGroups: {
            '18-24': 15,
            '25-34': 30,
            '35-44': 25,
            '45-54': 20,
            '55+': 10
          },
          genderDistribution: {
            'male': 45,
            'female': 52,
            'other': 3
          },
          locationDistribution: {
            'New York': 35,
            'Los Angeles': 20,
            'Chicago': 15,
            'Houston': 10,
            'Other': 20
          }
        };
        
        return of(mockDemographics).pipe(delay(500)); // Simulate network delay
      })
    );
  }

  // Customer communication
  getMessages(showId?: number): Observable<CustomerMessage[]> {
    let params = new HttpParams();
    
    if (showId) {
      params = params.set('showId', showId.toString());
    }
    
    return this.http.get<CustomerMessage[]>(`${this.apiUrl}/messages`, { params }).pipe(
      catchError(error => {
        console.error('Error fetching messages:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch messages'));
      })
    );
  }

  sendMessage(message: CustomerMessage): Observable<CustomerMessage> {
    return this.http.post<CustomerMessage>(`${this.apiUrl}/messages`, message, this.httpOptions).pipe(
      catchError(error => {
        console.error('Error sending message:', error);
        return throwError(() => new Error(error.message || 'Failed to send message'));
      })
    );
  }

  updateMessage(messageId: number, message: CustomerMessage): Observable<CustomerMessage> {
    return this.http.put<CustomerMessage>(`${this.apiUrl}/messages/${messageId}`, message, this.httpOptions).pipe(
      catchError(error => {
        console.error(`Error updating message ${messageId}:`, error);
        return throwError(() => new Error(error.message || 'Failed to update message'));
      })
    );
  }

  deleteMessage(messageId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/messages/${messageId}`, this.httpOptions).pipe(
      catchError(error => {
        console.error(`Error deleting message ${messageId}:`, error);
        return throwError(() => new Error(error.message || 'Failed to delete message'));
      })
    );
  }

  // Performance metrics
  getShowPerformanceMetrics(showId: number): Observable<ShowAnalytics> {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const params = new HttpParams().set('_', timestamp.toString());
    
    console.log(`Fetching performance metrics for show ${showId}`);
    
    return this.http.get<ShowAnalytics>(`${this.apiUrl}/shows/${showId}/performance`, {
      params,
      headers: new HttpHeaders({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      })
    }).pipe(
      catchError(error => {
        console.error(`Error fetching performance metrics for show ${showId}:`, error);
        return throwError(() => new Error(error.message || 'Failed to fetch performance metrics'));
      })
    );
  }
}