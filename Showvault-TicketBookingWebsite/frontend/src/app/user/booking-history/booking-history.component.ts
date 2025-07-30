import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingService } from '../../services/booking.service';
import { ImageService } from '../../services/image.service';
import { Booking, BookingStatus, BookingSummary } from '../../models/booking.model';
import { ShowStatus } from '../../models/show.model';

@Component({
  selector: 'app-booking-history',
  templateUrl: './booking-history.component.html',
  styleUrls: ['./booking-history.component.css']
})
export class BookingHistoryComponent implements OnInit, OnDestroy {
  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  isLoading = true;
  error = '';
  successMessage = '';
  BookingStatus = BookingStatus; // Make enum available in template
  
  // Loading states for buttons - track per booking ID
  downloadingTickets = new Set<number>();
  cancellingBookings = new Set<number>();
  
  // For refund request
  showRefundModal = false;
  selectedBookingId: number | null = null;
  refundForm: FormGroup;

  // Helper methods for template
  getStatusClass(status: string | undefined): string {
    if (!status) return 'badge bg-secondary';
    
    // Convert to uppercase for consistency
    const upperStatus = status.toString().toUpperCase();
    
    console.log('Getting status class for:', upperStatus);
    
    switch (upperStatus) {
      case 'CONFIRMED': return 'badge bg-success';
      case 'CANCELLED': return 'badge bg-danger';
      case 'PENDING': return 'badge bg-warning text-dark';
      case 'EXPIRED': return 'badge bg-secondary';
      case 'REFUND_REQUESTED': return 'badge bg-info';
      case 'REFUNDED': return 'badge bg-secondary';
      default: return 'badge bg-success'; // Default to success (confirmed) if status is unknown
    }
  }
  
  getStatusDisplayName(status: string | undefined): string {
    if (!status) return 'N/A';
    
    // Convert to uppercase for consistency
    const upperStatus = status.toString().toUpperCase();
    
    switch (upperStatus) {
      case 'CONFIRMED': return 'Confirmed';
      case 'CANCELLED': return 'Cancelled';
      case 'PENDING': return 'Pending';
      case 'EXPIRED': return 'Expired';
      case 'REFUND_REQUESTED': return 'Refund Requested';
      case 'REFUNDED': return 'Refunded';
      default: return status; // Return original status if unknown
    }
  }
  
  /**
   * Get image URL with fallback to appropriate default image
   * @param imageUrl The original image URL
   * @param type The type of content (show, movie, concert, etc.)
   * @param subType Optional subtype for more specific images (action, rock, ballet, etc.)
   * @param title Optional title for searching specific content images
   * @returns A valid image URL
   */
  getImageUrl(imageUrl: string | undefined | null, type: string = 'show', subType: string = '', title: string = ''): string {
    return this.imageService.getImageUrl(imageUrl, type, subType, title);
  }

  /**
   * Calculate show status based on show date/time compared to current date/time
   */
  calculateShowStatus(booking: any): ShowStatus {
    // Get show date from either the new model or the old model
    let showDate: Date | null = null;
    let showTime: string | null = null;
    
    if (booking.showDate) {
      showDate = new Date(booking.showDate);
    } else if (booking.showSchedule?.showDate) {
      showDate = new Date(booking.showSchedule.showDate);
      showTime = booking.showSchedule.startTime;
    } else if (booking.schedule?.showDate) {
      showDate = new Date(booking.schedule.showDate);
      showTime = booking.schedule.startTime;
    }
    
    if (!showDate) {
      return ShowStatus.DRAFT; // Default if no date available
    }
    
    // If we have show time, combine it with the date
    if (showTime) {
      const [hours, minutes] = showTime.split(':').map(Number);
      showDate.setHours(hours, minutes, 0, 0);
    }
    
    const now = new Date();
    const showDateTime = showDate.getTime();
    const currentTime = now.getTime();
    
    // Calculate time differences
    const timeDiff = showDateTime - currentTime;
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    // Determine status based on time
    if (hoursDiff < -2) {
      // Show ended more than 2 hours ago
      return ShowStatus.COMPLETED;
    } else if (hoursDiff < 0) {
      // Show is currently happening (within 2 hours of start time)
      return ShowStatus.ONGOING;
    } else if (hoursDiff <= 24) {
      // Show is within 24 hours
      return ShowStatus.UPCOMING;
    } else {
      // Show is more than 24 hours away
      return ShowStatus.UPCOMING;
    }
  }

  /**
   * Get show status display name
   */
  getShowStatusDisplayName(status: ShowStatus): string {
    switch (status) {
      case ShowStatus.UPCOMING: return 'Upcoming';
      case ShowStatus.ONGOING: return 'Ongoing';
      case ShowStatus.COMPLETED: return 'Completed';
      case ShowStatus.CANCELLED: return 'Cancelled';
      case ShowStatus.SUSPENDED: return 'Suspended';
      case ShowStatus.DRAFT: return 'Draft';
      default: return 'Unknown';
    }
  }

  /**
   * Get tooltip text for show status
   */
  getShowStatusTooltip(booking: any): string {
    const showStatus = this.calculateShowStatus(booking);
    const statusDisplayName = this.getShowStatusDisplayName(showStatus);
    
    // Add additional context based on status
    switch (showStatus) {
      case ShowStatus.COMPLETED:
        return `Show Status: ${statusDisplayName} - Show has ended`;
      case ShowStatus.ONGOING:
        return `Show Status: ${statusDisplayName} - Show is currently happening`;
      case ShowStatus.UPCOMING:
        const showDate = this.getShowDate(booking);
        if (showDate) {
          const timeDiff = showDate.getTime() - new Date().getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
          if (daysDiff === 0) {
            return `Show Status: ${statusDisplayName} - Show is today`;
          } else if (daysDiff === 1) {
            return `Show Status: ${statusDisplayName} - Show is tomorrow`;
          } else {
            return `Show Status: ${statusDisplayName} - Show in ${daysDiff} days`;
          }
        }
        return `Show Status: ${statusDisplayName}`;
      case ShowStatus.CANCELLED:
        return `Show Status: ${statusDisplayName} - Show has been cancelled`;
      case ShowStatus.SUSPENDED:
        return `Show Status: ${statusDisplayName} - Show is temporarily suspended`;
      default:
        return `Show Status: ${statusDisplayName}`;
    }
  }

  /**
   * Helper method to get show date from booking
   */
  private getShowDate(booking: any): Date | null {
    if (booking.showDate) {
      return new Date(booking.showDate);
    } else if (booking.showSchedule?.showDate) {
      return new Date(booking.showSchedule.showDate);
    } else if (booking.schedule?.showDate) {
      return new Date(booking.schedule.showDate);
    }
    return null;
  }

  canCancel(booking: any): boolean {
    console.log('Checking if booking can be cancelled:', booking);
    
    if (!booking || !booking.status) {
      console.log('Booking has no status, cannot cancel');
      return false;
    }
    
    // Normalize status to uppercase for comparison
    const normalizedStatus = booking.status.toString().toUpperCase();
    console.log('Normalized status:', normalizedStatus);
    
    // Check if booking is already cancelled or refunded
    if (normalizedStatus === 'CANCELLED' || 
        normalizedStatus === 'REFUNDED' ||
        normalizedStatus === 'REFUND_REQUESTED') {
      console.log('Booking is already cancelled, refunded, or has a refund request');
      return false;
    }
    
    // Only allow cancellation for CONFIRMED or PENDING bookings
    if (normalizedStatus !== 'CONFIRMED' && normalizedStatus !== 'PENDING') {
      console.log('Booking status does not allow cancellation:', booking.status);
      return false;
    }
    
    // Get show date from either the new model or the old model
    let showDate: Date | null = null;
    if (booking.showDate) {
      showDate = new Date(booking.showDate);
      console.log('Using booking.showDate:', showDate);
    } else if (booking.showSchedule?.showDate) {
      showDate = new Date(booking.showSchedule.showDate);
      console.log('Using booking.showSchedule.showDate:', showDate);
    } else if (booking.schedule?.showDate) {
      showDate = new Date(booking.schedule.showDate);
      console.log('Using booking.schedule.showDate:', showDate);
    }
    
    if (!showDate) {
      console.log('No show date found, cannot cancel');
      return false;
    }
    
    // Check if the show date is more than 24 hours in the future
    const now = new Date();
    const cutoffTime = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // Add 24 hours in milliseconds
    
    console.log('Show date:', showDate);
    console.log('Cutoff time (24h from now):', cutoffTime);
    console.log('Show date time:', showDate.getTime());
    console.log('Cutoff time time:', cutoffTime.getTime());
    
    const canCancel = showDate.getTime() > cutoffTime.getTime();
            
    console.log('Can cancel booking:', canCancel);
    return canCancel;
  }

  canDownloadTicket(booking: any): boolean {
    if (!booking || !booking.status) {
      return false;
    }
    
    // Normalize status to uppercase for comparison
    const normalizedStatus = booking.status.toString().toUpperCase();
    
    // Only allow ticket download for CONFIRMED bookings
    return normalizedStatus === 'CONFIRMED';
  }

  // Helper methods for loading states
  isDownloadingTicket(bookingId: number | undefined): boolean {
    return bookingId ? this.downloadingTickets.has(bookingId) : false;
  }

  isCancellingBooking(bookingId: number | undefined): boolean {
    return bookingId ? this.cancellingBookings.has(bookingId) : false;
  }
  
  // For email ticket
  showEmailModal = false;
  emailForm: FormGroup;
  
  // For notifications
  notifications: any[] = [];
  unreadNotifications = 0;
  showNotifications = false;
  
  // For filtering
  statusFilter = 'all';
  searchQuery = '';
  sortOrder = 'newest';

  constructor(
    private bookingService: BookingService,
    private imageService: ImageService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.refundForm = this.fb.group({
      reason: ['', [Validators.required, Validators.minLength(10)]]
    });
    
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.loadBookings();
    this.loadNotifications();
    
    // Set up periodic refresh of bookings to ensure data is up-to-date
    this.setupPeriodicRefresh();
    
    // Test backend connectivity
    this.testBackendConnectivity();
  }
  
  testBackendConnectivity(): void {
    console.log('Testing backend connectivity...');
    const token = localStorage.getItem('auth_token');
    if (token) {
      console.log('Auth token exists:', token.substring(0, 20) + '...');
      
      // Test if token is expired
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const expirationTime = tokenData.exp * 1000;
        const isExpired = Date.now() > expirationTime;
        console.log('Token expired:', isExpired);
        console.log('Token expires at:', new Date(expirationTime));
        console.log('Current time:', new Date());
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    } else {
      console.warn('No auth token found');
    }
  }
  
  testApiConnectivity(): void {
    console.log('Testing API connectivity manually...');
    
    if (this.bookings.length > 0) {
      const firstBooking = this.bookings[0];
      console.log('Testing with first booking:', firstBooking);
      
      // Test cancel API
      if (this.canCancel(firstBooking)) {
        console.log('Testing cancel API (dry run)...');
        // Don't actually cancel, just test the service method exists
        console.log('Cancel method available:', typeof this.cancelBooking === 'function');
      }
      
      // Test download API
      if (this.canDownloadTicket(firstBooking)) {
        console.log('Testing download API...');
        console.log('Download method available:', typeof this.downloadTicket === 'function');
        
        // Actually try to download the first confirmed booking
        if (firstBooking.id) {
          console.log('Attempting to download ticket for booking:', firstBooking.id);
          this.downloadTicket(firstBooking.id);
        }
      }
    }
  }
  
  setupPeriodicRefresh(): void {
    // Refresh bookings every 30 seconds to ensure we have the latest data
    const refreshInterval = setInterval(() => {
      console.log('Performing periodic refresh of bookings...');
      this.refreshBookings();
    }, 30000); // 30 seconds
    
    // Store the interval ID so we can clear it when the component is destroyed
    // @ts-ignore - Property might not exist on window
    window['bookingRefreshInterval'] = refreshInterval;
  }
  
  refreshBookings(): void {
    // This is a silent refresh that doesn't show loading indicators
    console.log('Silently refreshing bookings...');
    
    this.bookingService.getUserBookings().subscribe({
      next: (bookings) => {
        console.log('Received updated bookings:', bookings);
        
        // Ensure all bookings have a status
        bookings.forEach(booking => {
          if (!booking.status) {
            console.log(`Setting missing status to CONFIRMED for booking ID: ${booking.id}`);
            booking.status = BookingStatus.CONFIRMED;
          }
        });
        
        // Check if there are any changes
        const hasChanges = this.hasBookingChanges(this.bookings, bookings);
        
        if (hasChanges) {
          console.log('Detected changes in bookings, updating view...');
          this.bookings = bookings;
          this.applyFilters();
        } else {
          console.log('No changes detected in bookings');
        }
      },
      error: (error) => {
        console.error('Error refreshing bookings:', error);
        // Don't show error to user for silent refresh
      }
    });
  }
  
  hasBookingChanges(oldBookings: Booking[], newBookings: Booking[]): boolean {
    // Quick check for length changes
    if (oldBookings.length !== newBookings.length) {
      return true;
    }
    
    // Check for changes in booking IDs or statuses
    const oldIds = new Set(oldBookings.map(b => b.id));
    const newIds = new Set(newBookings.map(b => b.id));
    
    // Check if any IDs are different
    if ([...oldIds].some(id => !newIds.has(id)) || [...newIds].some(id => !oldIds.has(id))) {
      return true;
    }
    
    // Check if any statuses have changed
    for (const newBooking of newBookings) {
      const oldBooking = oldBookings.find(b => b.id === newBooking.id);
      if (oldBooking && oldBooking.status !== newBooking.status) {
        return true;
      }
    }
    
    return false;
  }

  loadBookings(): void {
    this.isLoading = true;
    this.error = '';
    console.log('Loading bookings...');
    
    // Check if user is logged in
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('No auth token found, user is not logged in');
      this.error = 'Please log in to view your bookings';
      this.isLoading = false;
      
      // Redirect to login page
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }
    
    // Check if token is valid - but don't log out if there's an issue
    // We'll let the API call handle authentication errors instead
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = tokenData.exp * 1000;
      const isExpired = Date.now() > expirationTime;
      
      if (isExpired) {
        console.warn('Auth token may be expired, but continuing with API call');
      }
    } catch (e) {
      console.warn('Error parsing token, but continuing with API call:', e);
    }
    
    // Check if we have any bookings in localStorage as a backup
    let localBookings: Booking[] = [];
    try {
      localBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
      if (localBookings.length > 0) {
        console.log('Found bookings in localStorage:', localBookings);
      }
    } catch (e) {
      console.error('Error checking localStorage for bookings:', e);
    }
    
    console.log('Calling getUserBookings with valid token');
    
    this.bookingService.getUserBookings().subscribe({
      next: (bookings) => {
        console.log('Received bookings from API:', bookings);
        
        if (bookings.length === 0) {
          console.log('No bookings found from API');
          
          // If no bookings from API but we have local bookings, use those
          if (localBookings.length > 0) {
            console.log('Using bookings from localStorage as fallback');
            this.bookings = localBookings;
            this.applyFilters();
          }
        } else {
          console.log(`Found ${bookings.length} bookings from API`);
          
          // Log details of each booking for debugging
          bookings.forEach(booking => {
            console.log(`Booking ID: ${booking.id}, Number: ${booking.bookingNumber}, Status: ${booking.status}`);
            console.log(`Show: ${booking.showSchedule?.show?.title}`);
            console.log(`Seats: ${booking.seatBookings?.length || 0}`);
            
            // Ensure booking status is set to CONFIRMED if it's missing or null
            if (!booking.status) {
              console.log(`Setting missing status to CONFIRMED for booking ID: ${booking.id}`);
              booking.status = BookingStatus.CONFIRMED;
            }
          });
          
          this.bookings = bookings;
          
          // Enhance show images for all bookings
          this.bookings.forEach(booking => {
            if (booking.showSchedule?.show?.title) {
              const show = booking.showSchedule.show;
              this.imageService.getSpecificMovieImage(
                show.title,
                show.type || 'Show',
                '',
                show.posterUrl || ''
              ).subscribe(imageUrl => {
                if (booking.showSchedule && booking.showSchedule.show) {
                  // Use type assertion to add all image properties
                  (booking.showSchedule.show as any).imageUrl = imageUrl;
                  (booking.showSchedule.show as any).image = imageUrl;
                  (booking.showSchedule.show as any).posterUrl = imageUrl;
                }
              });
            } else if (booking.show?.title) {
              const show = booking.show;
              this.imageService.getSpecificMovieImage(
                show.title,
                show.type || 'Show',
                '',
                show.posterUrl || ''
              ).subscribe(imageUrl => {
                if (booking.show) {
                  // Use type assertion to add all image properties
                  (booking.show as any).imageUrl = imageUrl;
                  (booking.show as any).image = imageUrl;
                  (booking.show as any).posterUrl = imageUrl;
                }
              });
            }
          });
          
          this.applyFilters();
          
          // Update localStorage with the latest bookings
          try {
            localStorage.setItem('userBookings', JSON.stringify(bookings));
            console.log('Updated localStorage with latest bookings');
          } catch (e) {
            console.error('Error updating localStorage with bookings:', e);
          }
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading bookings from API:', error);
        
        // Check if it's an authentication error, but don't automatically log out
        if (error.status === 401 || error.status === 403 || 
            error.message?.includes('Authentication') || 
            error.message?.includes('auth')) {
          console.warn('Authentication issue when loading bookings, attempting to recover');
          
          // Try to refresh the token manually
          const token = localStorage.getItem('auth_token');
          if (token) {
            try {
              // Parse the token to get user info
              const tokenData = JSON.parse(atob(token.split('.')[1]));
              console.log('Token contains user info:', tokenData.sub);
              
              // Store user info in session storage for recovery
              sessionStorage.setItem('current_username', tokenData.sub);
              
              // Show a helpful message
              this.error = 'Session may have expired. Please try refreshing the page or logging in again.';
              
              // Use local bookings if available
              const localBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
              if (localBookings.length > 0) {
                console.log('Using cached bookings from localStorage');
                this.bookings = localBookings;
                this.applyFilters();
              }
            } catch (e) {
              console.error('Error parsing token during recovery:', e);
              this.error = 'Unable to load bookings. Please try refreshing the page.';
            }
          } else {
            this.error = 'Unable to load bookings. Please try logging in again.';
          }
        } else {
          // If API call fails but we have local bookings, use those
          if (localBookings.length > 0) {
            console.log('Using bookings from localStorage due to API error');
            this.bookings = localBookings;
            this.applyFilters();
            this.error = 'Using cached booking data. Some information may not be up-to-date.';
          } else {
            this.error = 'Failed to load booking history. Please try again.';
          }
        }
        
        this.isLoading = false;
      }
    });
  }
  
  loadNotifications(): void {
    console.log('Loading notifications...');
    
    // Check if user is logged in
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('No auth token found, cannot load notifications');
      return;
    }
    
    this.bookingService.getBookingNotifications().subscribe({
      next: (notifications) => {
        console.log('Received notifications:', notifications);
        this.notifications = notifications;
        this.unreadNotifications = notifications.filter(n => !n.read).length;
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        
        // Don't show error for authentication issues with notifications
        // as they're not critical to the main functionality
        if (error.status === 401 || error.status === 403) {
          console.log('Authentication error when loading notifications - ignoring');
        }
      }
    });
  }
  
  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    
    // Mark notifications as read when opened
    if (this.showNotifications && this.unreadNotifications > 0) {
      this.notifications.forEach(notification => {
        if (!notification.read) {
          this.bookingService.markNotificationAsRead(notification.id).subscribe();
          notification.read = true;
        }
      });
      this.unreadNotifications = 0;
    }
  }
  
  applyFilters(): void {
    // Start with all bookings
    let filtered = [...this.bookings];
    
    // Apply status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(booking => {
        // Convert to uppercase for consistency
        const bookingStatus = typeof booking.status === 'string' ? booking.status.toUpperCase() : booking.status;
        const filterStatus = typeof this.statusFilter === 'string' ? this.statusFilter.toUpperCase() : this.statusFilter;
        return bookingStatus === filterStatus;
      });
    }
    
    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(booking => 
        (booking.showName?.toLowerCase().includes(query)) ||
        (booking.showSchedule?.show?.title?.toLowerCase().includes(query)) ||
        (booking.bookingNumber?.toLowerCase().includes(query)) ||
        (booking.id?.toString().includes(query)) || false
      );
    }
    
    // Apply sorting
    if (this.sortOrder === 'newest') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.bookingDate || 0).getTime();
        const dateB = new Date(b.bookingDate || 0).getTime();
        return dateB - dateA;
      });
    } else if (this.sortOrder === 'oldest') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.bookingDate || 0).getTime();
        const dateB = new Date(b.bookingDate || 0).getTime();
        return dateA - dateB;
      });
    } else if (this.sortOrder === 'price-high') {
      filtered.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
    } else if (this.sortOrder === 'price-low') {
      filtered.sort((a, b) => (a.totalAmount || 0) - (b.totalAmount || 0));
    }
    
    this.filteredBookings = filtered;
  }

  cancelBooking(bookingId: number): void {
    if (!bookingId) {
      console.error('Invalid booking ID:', bookingId);
      this.error = 'Invalid booking ID. Please try again.';
      return;
    }
    
    console.log('Starting cancellation for booking ID:', bookingId);
    
    // Find the booking to check its details
    const bookingToCancel = this.bookings.find(b => b.id === bookingId);
    if (bookingToCancel) {
      console.log('Booking found for cancellation:', {
        id: bookingToCancel.id,
        status: bookingToCancel.status,
        bookingNumber: bookingToCancel.bookingNumber,
        canCancel: this.canCancel(bookingToCancel)
      });
    } else {
      console.warn('Booking not found in local array for ID:', bookingId);
    }
    
    if (confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      // Show loading state for this specific booking
      this.cancellingBookings.add(bookingId);
      this.error = '';
      this.successMessage = '';
      
      this.bookingService.cancelBooking(bookingId).subscribe({
        next: (response) => {
          console.log('Booking cancelled successfully:', response);
          this.successMessage = 'Booking cancelled successfully!';
          
          // Update the status in the local array
          const cancelledBooking = this.bookings.find(b => b.id === bookingId);
          if (cancelledBooking) {
            console.log('Updating booking status to CANCELLED');
            cancelledBooking.status = BookingStatus.CANCELLED;
          } else {
            console.warn('Could not find booking with ID:', bookingId);
          }
          
          // Apply filters to update the filtered list
          this.applyFilters();
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
          
          // Refresh bookings after a short delay
          setTimeout(() => {
            this.refreshBookings();
          }, 1000);
          
          // Hide loading state
          this.cancellingBookings.delete(bookingId);
        },
        error: (error) => {
          console.error('Error cancelling booking:', error);
          
          // Check if it's an authentication error
          if (error.status === 401 || error.status === 403) {
            this.error = 'Authentication error. Please log in again.';
            
            // Redirect to login page
            setTimeout(() => {
              this.router.navigate(['/login'], { 
                queryParams: { returnUrl: this.router.url }
              });
            }, 2000);
          } else if (error.status === 404) {
            this.error = 'Booking not found. It may have been already cancelled.';
          } else if (error.status === 400) {
            this.error = 'Cannot cancel this booking. It may be too close to the show date or already cancelled.';
          } else {
            this.error = 'Failed to cancel booking. Please try again.';
          }
          
          // Clear error message after 5 seconds
          setTimeout(() => {
            this.error = '';
          }, 5000);
          
          // Hide loading state
          this.cancellingBookings.delete(bookingId);
        }
      });
    }
  }
  
  /**
   * View booking details
   * @param bookingId The booking ID
   */
  viewBookingDetails(bookingId: number): void {
    if (!bookingId) return;
    
    console.log('Viewing booking details for ID:', bookingId);
    
    // Find the booking in the local array
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) {
      this.error = 'Booking not found.';
      return;
    }
    
    // Create seat details from the booking
    const seatDetails = booking.seatBookings?.map(sb => ({
      row: sb.seat?.rowName || '',
      seatNumber: sb.seat?.seatNumber || 0,
      price: sb.price || 0,
      category: sb.seat?.category || ''
    })) || [];
    
    // Create a proper booking summary object
    const bookingSummary = {
      show: {
        id: booking.showSchedule?.show?.id || 0,
        title: booking.showSchedule?.show?.title || booking.showName || 'Show',
        type: booking.showSchedule?.show?.type || 'Movie',
   image: booking.showSchedule?.show?.posterUrl || '',
     posterUrl: booking.showSchedule?.show?.posterUrl || '',
      imageUrl: booking.showSchedule?.show?.posterUrl || ''
      },
      schedule: {
        id: booking.showSchedule?.id || 0,
        date: booking.showDate ? new Date(booking.showDate).toISOString().split('T')[0] : 
              (booking.showSchedule?.showDate ? new Date(booking.showSchedule.showDate).toISOString().split('T')[0] : ''),
        time: booking.showDate ? new Date(booking.showDate).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) :
              (booking.showSchedule?.startTime || '19:00'),
        venue: booking.venueName || booking.showSchedule?.venue?.name || 'Venue'
      },
      seats: {
        count: seatDetails.length,
        details: seatDetails
      },
      pricing: {
        subtotal: booking.totalAmount || 0,
        fees: 0,
        taxes: 0,
        total: booking.totalAmount || 0
      },
      customer: {
        name: (booking.user?.firstName || '') + ' ' + (booking.user?.lastName || ''),
        email: booking.user?.email || '',
        phone: booking.user?.phoneNumber || ''
      },
      bookingNumber: booking.bookingNumber || '',
      venue: booking.showSchedule?.venue?.name || booking.venueName || 'Venue'
    };
    
    // Navigate to the booking confirmation page with both booking response and summary
    this.router.navigate(['/booking/confirmation'], {
      state: {
        bookingResponse: {
          booking: booking,
          success: true,
          confirmationCode: booking.bookingNumber,
          message: 'Booking details'
        },
        bookingSummary: bookingSummary
      }
    });
  }

  downloadTicket(bookingId: number): void {
    if (!bookingId) {
      console.error('Invalid booking ID:', bookingId);
      this.error = 'Invalid booking ID. Please try again.';
      return;
    }
    
    console.log('Starting ticket download for booking ID:', bookingId);
    
    // Find the booking to check its status
    const bookingForDownload = this.bookings.find(b => b.id === bookingId);
    if (bookingForDownload) {
      console.log('Booking found for download:', {
        id: bookingForDownload.id,
        status: bookingForDownload.status,
        bookingNumber: bookingForDownload.bookingNumber
      });
    } else {
      console.warn('Booking not found in local array for ID:', bookingId);
    }
    
    // Show loading state for this specific booking
    this.downloadingTickets.add(bookingId);
    this.error = '';
    this.successMessage = '';
    
    // Check if user is logged in
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('No auth token found, cannot download ticket');
      this.error = 'Please log in to download your ticket';
      this.downloadingTickets.delete(bookingId);
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        this.error = '';
      }, 3000);
      
      // Redirect to login page
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.url }
      });
      return;
    }
    
    // Find the booking to get the booking number if needed
    const bookingToDownload = this.bookings.find(b => b.id === bookingId);
    
    // Log the booking details for debugging
    console.log('Found booking:', bookingToDownload);
    
    if (!bookingToDownload) {
      console.error('Booking not found with ID:', bookingId);
      this.error = 'Booking not found. Please refresh the page and try again.';
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        this.error = '';
      }, 3000);
      
      // Hide loading state
      this.downloadingTickets.delete(bookingId);
      return;
    }
    
    // Check if the booking is confirmed
    const normalizedStatus = bookingToDownload.status.toString().toUpperCase();
    if (normalizedStatus !== 'CONFIRMED') {
      console.error('Cannot download ticket for non-confirmed booking:', bookingToDownload.status);
      this.error = 'Tickets can only be downloaded for confirmed bookings.';
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        this.error = '';
      }, 3000);
      
      // Hide loading state
      this.downloadingTickets.delete(bookingId);
      return;
    }
    
    // Use bookingNumber if available, otherwise fall back to confirmationCode
    const bookingNumber = bookingToDownload?.bookingNumber || bookingToDownload?.confirmationCode;
    
    console.log('Using booking number:', bookingNumber);
    
    // Try to download by booking number first if available
    if (bookingNumber) {
      console.log('Trying to download by booking number first:', bookingNumber);
      
      this.bookingService.downloadTicketByNumber(bookingNumber).subscribe({
        next: (blob) => {
          if (blob.size === 0) {
            this.error = 'Empty ticket received. Please try again later.';
            
            // Clear error message after 3 seconds
            setTimeout(() => {
              this.error = '';
            }, 3000);
            
            // Hide loading state
            this.downloadingTickets.delete(bookingId);
            return;
          }
          
          console.log('Ticket downloaded successfully, creating download link');
          
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ticket-${bookingNumber}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          this.successMessage = 'Ticket downloaded successfully!';
          this.downloadingTickets.delete(bookingId);
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          console.error('Error downloading ticket by booking number:', error);
          
          // Check if it's an authentication error
          if (error.status === 401 || error.status === 403) {
            console.error('Authentication error when downloading ticket');
            this.error = 'Authentication error. Please log in again.';
            
            // Clear error message after 3 seconds
            setTimeout(() => {
              this.error = '';
            }, 3000);
            
            // Redirect to login page
            this.router.navigate(['/login'], { 
              queryParams: { returnUrl: this.router.url }
            });
            return;
          }
          
          // If booking number fails, try by ID as fallback
          console.log('Falling back to download by ID:', bookingId);
          
          this.bookingService.downloadTicket(bookingId).subscribe({
            next: (blob) => {
              if (blob.size === 0) {
                this.error = 'Empty ticket received. Please try again later.';
                
                // Clear error message after 3 seconds
                setTimeout(() => {
                  this.error = '';
                }, 3000);
                return;
              }
              
              console.log('Ticket downloaded successfully by ID, creating download link');
              
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `ticket-${bookingId}.pdf`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              
              this.successMessage = 'Ticket downloaded successfully!';
              this.downloadingTickets.delete(bookingId);
              
              // Clear success message after 3 seconds
              setTimeout(() => {
                this.successMessage = '';
              }, 3000);
            },
            error: (secondError) => {
              console.error('Error downloading ticket by ID:', secondError);
              
              // Check if it's an authentication error
              if (secondError.status === 401 || secondError.status === 403) {
                console.error('Authentication error when downloading ticket by ID');
                this.error = 'Authentication error. Please log in again.';
                
                // Redirect to login page
                this.router.navigate(['/login'], { 
                  queryParams: { returnUrl: this.router.url }
                });
              } else {
                this.error = 'Failed to download ticket. Please try again later or contact support.';
              }
              
              // Clear error message after 3 seconds
              setTimeout(() => {
                this.error = '';
              }, 3000);
              this.downloadingTickets.delete(bookingId);
            }
          });
        }
      });
    } else {
      // If no booking number is available, try by ID
      this.bookingService.downloadTicket(bookingId).subscribe({
        next: (blob) => {
          if (blob.size === 0) {
            this.error = 'Empty ticket received. Please try again later.';
            this.downloadingTickets.delete(bookingId);
            return;
          }
          
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ticket-${bookingId}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          this.successMessage = 'Ticket downloaded successfully!';
          this.downloadingTickets.delete(bookingId);
        },
        error: (error) => {
          console.error('Error downloading ticket by ID:', error);
          this.error = 'Failed to download ticket. Please try again later or contact support.';
          this.downloadingTickets.delete(bookingId);
          
          // Clear error message after 3 seconds
          setTimeout(() => {
            this.error = '';
          }, 3000);
        }
      });
    }
  }
  
  openRefundModal(bookingId: number): void {
    this.selectedBookingId = bookingId;
    this.showRefundModal = true;
    this.refundForm.reset();
  }
  
  closeRefundModal(): void {
    this.showRefundModal = false;
    this.selectedBookingId = null;
  }
  
  submitRefundRequest(): void {
    if (this.refundForm.valid && this.selectedBookingId) {
      const reason = this.refundForm.value.reason;
      
      this.bookingService.requestRefund(this.selectedBookingId, reason).subscribe({
        next: () => {
          this.successMessage = 'Refund request submitted successfully!';
          
          // Update the status in the local array
          const booking = this.bookings.find(b => b.id === this.selectedBookingId);
          if (booking) {
            booking.status = BookingStatus.REFUND_REQUESTED;
            booking.refundReason = reason;
          }
          
          // Apply filters to update the filtered list
          this.applyFilters();
          
          // Close the modal
          this.closeRefundModal();
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          this.error = 'Failed to submit refund request. Please try again.';
          console.error('Error requesting refund:', error);
          
          // Clear error message after 3 seconds
          setTimeout(() => {
            this.error = '';
          }, 3000);
        }
      });
    }
  }
  
  openEmailModal(bookingId: number): void {
    this.selectedBookingId = bookingId;
    this.showEmailModal = true;
    
    // Pre-fill with user's email if available
    const booking = this.bookings.find(b => b.id === bookingId);
    if (booking && booking.customerEmail) {
      this.emailForm.patchValue({ email: booking.customerEmail });
    } else {
      this.emailForm.reset();
    }
  }
  
  closeEmailModal(): void {
    this.showEmailModal = false;
    this.selectedBookingId = null;
  }
  
  sendTicketByEmail(): void {
    if (this.emailForm.valid && this.selectedBookingId) {
      const email = this.emailForm.value.email;
      
      this.bookingService.sendTicketByEmail(this.selectedBookingId, email).subscribe({
        next: () => {
          this.successMessage = `Ticket sent to ${email} successfully!`;
          
          // Close the modal
          this.closeEmailModal();
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          this.error = 'Failed to send ticket by email. Please try again.';
          console.error('Error sending ticket by email:', error);
          
          // Clear error message after 3 seconds
          setTimeout(() => {
            this.error = '';
          }, 3000);
        }
      });
    }
  }


  
  canRequestRefund(booking: Booking): boolean {
    // A booking can have a refund requested if it's confirmed
    // and the show date is in the past
    if (booking.status !== BookingStatus.CONFIRMED) {
      return false;
    }
    
    if (!booking.showDate) {
      return false;
    }
    
    const showDate = new Date(booking.showDate);
    const now = new Date();
    
    // Can request refund if show date is in the past
    return showDate < now;
  }
  
  getFormattedDate(dateString: string | Date): string {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  getRelativeTime(dateString: string | Date): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    
    if (diffSec < 60) {
      return 'just now';
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
    } else if (diffDay < 7) {
      return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }
  
  ngOnDestroy(): void {
    // Clean up the refresh interval when the component is destroyed
    // @ts-ignore - Property might not exist on window
    if (window['bookingRefreshInterval']) {
      // @ts-ignore - Property might not exist on window
      clearInterval(window['bookingRefreshInterval']);
      console.log('Cleared booking refresh interval');
    }
  }
}
