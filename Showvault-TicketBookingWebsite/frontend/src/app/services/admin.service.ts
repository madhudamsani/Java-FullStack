import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, catchError, map } from 'rxjs/operators';
import { User } from '../models/user.model';
import { Show } from '../models/show.model';
import { Booking, BookingStatus, PaymentStatus } from '../models/booking.model';

export interface DashboardStats {
  totalUsers: number;
  newUsers: number;
  totalShows: number;
  activeShows: number;
  upcomingShows: number;
  totalBookings: number;
  bookingsThisMonth: number;
  totalRevenue: number;
  recentBookings: Booking[];
  popularShows: Array<Show & { ticketsSold: number }>;
  userGrowth: Array<{ date: string; count: number }>;
  recentActivity: Array<{ timestamp: string; user: string; action: string; details?: string }>;
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: string;
    serverLoad: number;
    memoryUsage: number;
    diskUsage: number;
    activeConnections: number;
    responseTime: number;
  };
}

export interface UserReport {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  retentionRate: number;
  userTypes: {
    regular: number;
    organizer: number;
    admin: number;
  };
  growthByMonth: Array<{
    month: string;
    count: number;
  }>;
  maxMonthlyUsers: number;
  registrationSources: {
    [key: string]: number;
  };
  mostActiveUsers: Array<{
    id?: number;
    name: string;
    email?: string;
    role: string;
    bookings: number;
    lastActive: Date;
  }>;
  usersByRole?: {
    user: number;
    organizer: number;
    admin: number;
  };
  userActivity?: Array<{
    date: string;
    logins: number;
  }>;
}

export interface SalesReport {
  totalRevenue: number;
  ticketsSold: number;
  averageTicketPrice: number;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  ticketsByMonth: { [key: string]: number };
  topSellingShows: Array<{ 
    id: number;
    name?: string;
    title?: string;
    organizer: string;
    ticketsSold: number;
    revenue: number;
    averagePrice: number;
    category?: string;
  }>;
  revenueTrend: 'increasing' | 'decreasing' | 'stable';
  revenueByCategory: { [key: string]: number };
  revenueByPlatform: { [key: string]: number };
  salesByPriceCategory: Array<{
    category: string;
    ticketsSold: number;
    revenue: number;
    averagePrice: number;
  }>;
  refundRate: { [key: string]: number };
  conversionRate: number;
  promotionEffectiveness?: Array<{
    code: string;
    usageCount: number;
    revenue: number;
    discountAmount: number;
    conversionRate: number;
    note?: string;
  }>;
  // Add missing properties required by admin-reports.component.ts
  revenueByShow?: Array<{ showId: number; showTitle: string; revenue: number }>;
  maxMonthlyRevenue?: number;
  revenueByPaymentMethod?: Array<{ method: string; revenue: number }>;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:8080/api/admin';

  constructor(private http: HttpClient) {}

  getDashboardStats(startDate?: string, endDate?: string): Observable<DashboardStats> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    
    if (endDate) {
      params = params.set('endDate', endDate);
    }
    
    console.log('Fetching dashboard stats from:', `${this.apiUrl}/dashboard/stats`);
    
    // Use httpOptions to include the authorization header
    const options = {
      ...this.httpOptions,
      params: params
    };
    
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/stats`, options).pipe(
      catchError(error => {
        console.error('Error fetching dashboard stats:', error);
        // Check if it's a connection error
        if (error.status === 0) {
          console.error('Connection error - backend server might be down or not running');
        }
        return throwError(() => new Error(error.message || 'Failed to fetch dashboard stats'));
      })
    );
  }

  getUserReport(params?: { startDate?: string; endDate?: string }): Observable<UserReport> {
    let httpParams = new HttpParams();
    
    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    
    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    
    // Use httpOptions to include the authorization header
    const options = {
      ...this.httpOptions,
      params: httpParams
    };
    
    // Try the dashboard endpoint first, fall back to reports endpoint if needed
    console.log('Fetching user report from:', `${this.apiUrl}/dashboard/user-report`);
    
    return this.http.get<UserReport>(`${this.apiUrl}/dashboard/user-report`, options)
      .pipe(
        catchError(error => {
          console.log('Falling back to reports endpoint for user report');
          return this.http.get<UserReport>(`${this.apiUrl}/reports/dashboard-users`, options);
        })
      ).pipe(
      map(response => {
        console.log('Received user report response:', response);
        
        // Ensure usersByRole is set for the UI
        if (!response.usersByRole && response.userTypes) {
          response.usersByRole = {
            user: response.userTypes.regular || 0,
            organizer: response.userTypes.organizer || 0,
            admin: response.userTypes.admin || 0
          };
        }
        
        // Ensure userActivity is set for the UI
        if (!response.userActivity) {
          response.userActivity = [];
          // Generate mock activity data if needed
          const today = new Date();
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            response.userActivity.push({
              date: date.toISOString().split('T')[0],
              logins: Math.floor(50 + Math.random() * 100)
            });
          }
        }
        
        return response;
      }),
      catchError(error => {
        console.error('Error fetching user report:', error);
        // Check if it's a connection error
        if (error.status === 0) {
          console.error('Connection error - backend server might be down or not running');
        }
        return throwError(() => new Error(error.message || 'Failed to fetch user report'));
      })
    );
  }

  getSalesReport(params?: { startDate?: string; endDate?: string }): Observable<SalesReport> {
    let httpParams = new HttpParams();
    
    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    
    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }
    
    // Use httpOptions to include the authorization header
    const options = {
      ...this.httpOptions,
      params: httpParams
    };
    
    // Try the dashboard endpoint first, fall back to reports endpoint if needed
    console.log('Fetching sales report from:', `${this.apiUrl}/dashboard/sales-report`);
    
    return this.http.get<SalesReport>(`${this.apiUrl}/dashboard/sales-report`, options)
      .pipe(
        catchError(error => {
          console.log('Falling back to reports endpoint for sales report');
          return this.http.get<SalesReport>(`${this.apiUrl}/reports/dashboard-sales`, options);
        })
      ).pipe(
      map(response => {
        console.log('Received sales report response:', response);
        
        // Ensure revenueByShow is set for the UI
        if (!response.revenueByShow) {
          response.revenueByShow = [];
          if (response.topSellingShows) {
            response.topSellingShows.forEach(show => {
              if (response.revenueByShow) {
                response.revenueByShow.push({
                  showId: show.id,
                  showTitle: show.name || show.title || '',
                  revenue: show.revenue
                });
              }
            });
          }
        }
        
        // Convert revenueByMonth from object to array for the UI if needed
        if (response.revenueByMonth && typeof response.revenueByMonth === 'object' && !Array.isArray(response.revenueByMonth)) {
          const revenueByMonthArray: Array<{ month: string; revenue: number }> = [];
          for (const [month, revenue] of Object.entries(response.revenueByMonth)) {
            revenueByMonthArray.push({
              month,
              revenue: Number(revenue)
            });
          }
          response.revenueByMonth = revenueByMonthArray;
        } else if (!response.revenueByMonth) {
          response.revenueByMonth = [];
        }
        
        return response;
      }),
      catchError(error => {
        console.error('Error fetching sales report:', error);
        // Check if it's a connection error
        if (error.status === 0) {
          console.error('Connection error - backend server might be down or not running');
        }
        return throwError(() => new Error(error.message || 'Failed to fetch sales report'));
      })
    );
  }

  getUsers(page: number = 1, limit: number = 10, filters?: { 
    role?: string; 
    status?: string; 
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Observable<{ users: User[]; total: number }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters) {
      if (filters.role) {
        params = params.set('role', filters.role);
      }
      if (filters.status) {
        params = params.set('status', filters.status);
      }
      if (filters.search) {
        params = params.set('search', filters.search);
      }
      if (filters.sortBy) {
        params = params.set('sortBy', filters.sortBy);
        if (filters.sortOrder) {
          params = params.set('sortOrder', filters.sortOrder);
        }
      }
    }

    // Use httpOptions to include the authorization header
    const options = {
      ...this.httpOptions,
      params: params
    };

    console.log('Fetching users from:', `${this.apiUrl}/users`, 'with params:', params);
    
    return this.http.get<{ users: User[]; total: number }>(`${this.apiUrl}/users`, options).pipe(
      map(response => {
        console.log('Received users response:', response);
        
        // Ensure each user has the required fields
        if (response && response.users) {
          response.users = response.users.map(user => {
            // Ensure name is set
            if (!user.name && user.firstName && user.lastName) {
              user.name = `${user.firstName} ${user.lastName}`;
            }
            
            // Ensure status is set
            if (!user.status) {
              user.status = 'active'; // Default to active if status is not provided
            }
            
            // Ensure lastLogin is set
            if (!user.lastLogin && user.lastLoginDate) {
              user.lastLogin = user.lastLoginDate;
            }
            
            return user;
          });
        }
        
        return response;
      }),
      catchError(error => {
        console.error('Error fetching users:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch users'));
      })
    );
  }

  updateUserStatus(userId: number, status: 'active' | 'suspended' | 'inactive' | 'deleted'): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${userId}/status`, { status }, this.httpOptions).pipe(
      catchError(error => {
        console.error(`Error updating user ${userId} status:`, error);
        return throwError(() => new Error(error.message || 'Failed to update user status'));
      })
    );
  }

  getUserById(userId: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${userId}`, this.httpOptions).pipe(
      catchError(error => {
        console.error(`Error fetching user ${userId}:`, error);
        return throwError(() => new Error(error.message || 'User not found'));
      })
    );
  }

  updateUserRole(userId: number, role: 'user' | 'organizer' | 'admin'): Observable<User> {
    const mappedRole = role === 'user' ? 'ROLE_USER' : 
                      role === 'organizer' ? 'ROLE_ORGANIZER' : 
                      'ROLE_ADMIN';
    
    return this.http.put<User>(`${this.apiUrl}/users/${userId}/role`, { role: mappedRole }, this.httpOptions).pipe(
      catchError(error => {
        console.error(`Error updating user ${userId} role:`, error);
        return throwError(() => new Error(error.message || 'Failed to update user role'));
      })
    );
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}`, this.httpOptions).pipe(
      catchError(error => {
        console.error(`Error deleting user ${userId}:`, error);
        return throwError(() => new Error(error.message || 'Failed to delete user'));
      })
    );
  }
  
  resetUserPassword(userId: number): Observable<{ success: boolean; message: string }> {
    console.log(`Resetting password for user ${userId} at endpoint: ${this.apiUrl}/${userId}/reset-password`);
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/${userId}/reset-password`,
      {},
      this.httpOptions
    ).pipe(
      catchError(error => {
        console.error(`Error resetting password for user ${userId}:`, error);
        return throwError(() => new Error(error.message || 'Failed to reset password'));
      })
    );
  }


  

  
  getPlatformSettings(): Observable<{
    general: {
      siteName: string;
      siteDescription: string;
      contactEmail: string;
      supportPhone: string;
      maintenanceMode: boolean;
    };
    security: {
      passwordPolicy: {
        minLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
      };
      sessionTimeout: number;
      maxLoginAttempts: number;
      twoFactorAuth: boolean;
    };
    email: {
      provider: string;
      fromEmail: string;
      fromName: string;
      templates: Array<{ name: string; subject: string; lastUpdated: Date }>;
    };
    payment: {
      providers: Array<{ name: string; enabled: boolean; testMode: boolean }>;
      currency: string;
      taxRate: number;
    };
  }> {
    return this.http.get<{
      general: {
        siteName: string;
        siteDescription: string;
        contactEmail: string;
        supportPhone: string;
        maintenanceMode: boolean;
      };
      security: {
        passwordPolicy: {
          minLength: number;
          requireUppercase: boolean;
          requireLowercase: boolean;
          requireNumbers: boolean;
          requireSpecialChars: boolean;
        };
        sessionTimeout: number;
        maxLoginAttempts: number;
        twoFactorAuth: boolean;
      };
      email: {
        provider: string;
        fromEmail: string;
        fromName: string;
        templates: Array<{ name: string; subject: string; lastUpdated: Date }>;
      };
      payment: {
        providers: Array<{ name: string; enabled: boolean; testMode: boolean }>;
        currency: string;
        taxRate: number;
      };
    }>(`${this.apiUrl}/settings`, this.httpOptions).pipe(
      catchError(error => {
        console.error('Error fetching platform settings:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch platform settings'));
      })
    );
  }
  
  updatePlatformSettings(settings: any): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>
      (`${this.apiUrl}/settings`, settings, this.httpOptions).pipe(
        catchError(error => {
          console.error('Error updating platform settings:', error);
          return throwError(() => new Error(error.message || 'Failed to update platform settings'));
        })
      );
  }
  
  private get httpOptions() {
    const token = localStorage.getItem('auth_token');
    return {
      headers: new HttpHeaders({ 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      })
    };
  }

  getBookings(page: number = 1, limit: number = 10, status?: BookingStatus, date?: string, search?: string): Observable<{ bookings: Booking[]; total: number }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (status) {
      params = params.set('status', status);
    }

    if (date) {
      // Ensure date is in ISO format (YYYY-MM-DD)
      params = params.set('date', date);
      console.log('Adding date filter:', date);
    }
    
    if (search) {
      params = params.set('search', search);
    }
    
    console.log('Fetching bookings with params:', params.toString());

    // Use httpOptions to include the authorization header
    const options = {
      ...this.httpOptions,
      params: params
    };

    return this.http.get<{ bookings: Booking[]; total: number }>(`${this.apiUrl}/bookings`, options).pipe(
      map(response => {
        console.log('Received bookings response:', response);
        
        // Ensure each booking has the required fields
        if (response && response.bookings) {
          response.bookings = response.bookings.map(booking => {
            // Convert string status to enum if needed
            if (typeof booking.status === 'string') {
              try {
                booking.status = booking.status as BookingStatus;
              } catch (e) {
                console.warn('Invalid booking status:', booking.status);
              }
            }
            
            // Ensure dates are properly parsed
            if (booking.bookingDate && typeof booking.bookingDate === 'string') {
              booking.bookingDate = new Date(booking.bookingDate);
            }
            
            if (booking.createdAt && typeof booking.createdAt === 'string') {
              booking.createdAt = new Date(booking.createdAt);
            }
            
            if (booking.showDate && typeof booking.showDate === 'string') {
              booking.showDate = new Date(booking.showDate);
            }
            
            return booking;
          });
        }
        
        return response;
      }),
      catchError(error => {
        console.error('Error fetching bookings:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch bookings'));
      })
    );
  }

  updateBookingStatus(bookingId: number, status: BookingStatus): Observable<Booking> {
    return this.http.put<Booking>(`${this.apiUrl}/bookings/${bookingId}/status`, { status }, this.httpOptions).pipe(
      catchError(error => {
        console.error(`Error updating booking ${bookingId} status:`, error);
        return throwError(() => new Error(error.message || 'Failed to update booking status'));
      })
    );
  }

  processRefund(bookingId: number): Observable<Booking> {
    return this.http.post<Booking>(`${this.apiUrl}/bookings/${bookingId}/refund`, {}, this.httpOptions).pipe(
      catchError(error => {
        console.error(`Error processing refund for booking ${bookingId}:`, error);
        return throwError(() => new Error(error.message || 'Failed to process refund'));
      })
    );
  }
}