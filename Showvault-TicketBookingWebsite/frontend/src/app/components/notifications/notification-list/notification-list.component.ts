import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationService } from '../../../services/notification.service';
import { 
  Notification, 
  NotificationType, 
  NOTIFICATION_TYPE_METADATA,
  NotificationPage
} from '../../../models/notification.model';

@Component({
  selector: 'app-notification-list',
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.scss']
})
export class NotificationListComponent implements OnInit {
  // Notifications data
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  loading = true;
  error = '';
  
  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  
  // Filtering
  selectedType: NotificationType | null = null;
  searchTerm = '';
  searchControl = new FormControl('');
  
  // Make enums and metadata available to the template
  NotificationType = NotificationType;
  NOTIFICATION_TYPE_METADATA = NOTIFICATION_TYPE_METADATA;
  
  // Counts for each notification type
  typeCounts: { [key in NotificationType]?: number } = {};
  
  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadNotifications();
    this.searchControl.valueChanges.subscribe(value => {
      this.searchTerm = value || '';
      this.applyFilters();
    });
  }

  /**
   * Load notifications from the server
   * @param page Page number (0-based)
   */
  loadNotifications(page: number = 0): void {
    this.loading = true;
    this.error = '';
    
    this.notificationService.getUserNotificationsPaged(page, this.pageSize).subscribe({
      next: (response: NotificationPage) => {
        // Normalize notifications to handle both camelCase and snake_case properties
        this.notifications = response.notifications.map(notification => 
          this.normalizeNotification(notification)
        );
        
        this.currentPage = response.currentPage;
        this.totalItems = response.totalItems;
        this.totalPages = response.totalPages;
        this.calculateTypeCounts();
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load notifications. Please try again later.';
        this.loading = false;
        console.error('Error loading notifications:', err);
      }
    });
  }

  /**
   * Calculate counts for each notification type
   */
  calculateTypeCounts(): void {
    // Reset counts
    this.typeCounts = {};
    
    // Count notifications by type
    this.notifications.forEach(notification => {
      if (!this.typeCounts[notification.type]) {
        this.typeCounts[notification.type] = 0;
      }
      this.typeCounts[notification.type]!++;
    });
  }

  /**
   * Apply filters to notifications
   */
  applyFilters(): void {
    this.filteredNotifications = this.notifications.filter(notification => {
      // Apply type filter if selected
      if (this.selectedType && notification.type !== this.selectedType) {
        return false;
      }
      
      // Apply search filter if provided
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        return (
          notification.title.toLowerCase().includes(searchLower) ||
          notification.message.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  }

  /**
   * Handle notification type filter change
   */
  onTypeFilterChange(type: NotificationType | null): void {
    this.selectedType = type;
    this.applyFilters();
  }

  /**
   * Mark a notification as read
   */
  markAsRead(notification: Notification): void {
    if (notification.read) {
      return;
    }
    
    this.notificationService.markNotificationAsRead(notification.id).subscribe({
      next: () => {
        notification.read = true;
        notification.readAt = new Date();
      },
      error: (err) => {
        console.error('Error marking notification as read:', err);
      }
    });
  }
  
  /**
   * View notification details
   */
  viewDetails(notification: Notification, event: Event): void {
    // Prevent the click from triggering markAsRead
    event.stopPropagation();
    
    // Mark as read if not already read
    if (!notification.read) {
      this.markAsRead(notification);
    }
    
    // Always navigate to mybookings page as requested
    this.router.navigateByUrl('/mybookings');
    
    // The code below is kept but disabled for reference
    /*
    // Navigate to related content if available
    if (notification.relatedId && notification.relatedType) {
      let url = '';
      
      switch (notification.relatedType) {
        case 'BOOKING':
          url = `/bookings/${notification.relatedId}`;
          break;
        case 'SHOW':
          url = `/shows/${notification.relatedId}`;
          break;
        case 'SCHEDULE':
          url = `/shows/schedule/${notification.relatedId}`;
          break;
        default:
          console.warn(`Unknown related type: ${notification.relatedType}`);
          return;
      }
      
      // Use Angular Router to navigate - this prevents full page reload
      this.router.navigateByUrl(url);
    }
    */
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    // Show loading indicator
    this.loading = true;
    
    this.notificationService.markAllNotificationsAsRead().subscribe({
      next: (response) => {
        console.log('Marked all notifications as read:', response);
        
        // Update local notifications
        this.notifications.forEach(notification => {
          notification.read = true;
          notification.readAt = new Date();
        });
        
        // Apply filters to update the view
        this.applyFilters();
        
        // Refresh the notification list to ensure we have the latest data
        this.loadNotifications(this.currentPage);
      },
      error: (err) => {
        console.error('Error marking all notifications as read:', err);
        this.error = 'Failed to mark all notifications as read. Please try again.';
        this.loading = false;
      }
    });
  }

  /**
   * Delete a notification
   */
  deleteNotification(notification: Notification): void {
    this.notificationService.deleteNotification(notification.id).subscribe({
      next: () => {
        // Remove from arrays
        this.notifications = this.notifications.filter(n => n.id !== notification.id);
        this.filteredNotifications = this.filteredNotifications.filter(n => n.id !== notification.id);
        
        // Recalculate counts
        this.calculateTypeCounts();
      },
      error: (err) => {
        console.error('Error deleting notification:', err);
      }
    });
  }

  /**
   * Delete all read notifications
   */
  deleteAllRead(): void {
    // Show loading indicator
    this.loading = true;
    
    this.notificationService.deleteAllReadNotifications().subscribe({
      next: (response) => {
        console.log('Deleted read notifications:', response);
        
        // Remove read notifications from arrays
        this.notifications = this.notifications.filter(n => !n.read);
        this.filteredNotifications = this.filteredNotifications.filter(n => !n.read);
        
        // Recalculate counts
        this.calculateTypeCounts();
        
        // Refresh the notification list to ensure we have the latest data
        this.loadNotifications(this.currentPage);
      },
      error: (err) => {
        console.error('Error deleting read notifications:', err);
        this.error = 'Failed to delete read notifications. Please try again.';
        this.loading = false;
      }
    });
  }

  /**
   * Navigate to a different page
   */
  goToPage(page: number): void {
    if (page < 0 || page >= this.totalPages) {
      return;
    }
    
    this.loadNotifications(page);
  }

  /**
   * Format date for display
   * @param date The date to format
   * @returns Formatted date string
   */
  formatDate(date: Date | string): string {
    if (!date) return '';
    
    // Handle both Date objects and string dates
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check for invalid date
    if (isNaN(dateObj.getTime())) return '';
    
    return dateObj.toLocaleString();
  }

  /**
   * Get time elapsed since notification was created
   * @param date The date to calculate elapsed time from
   * @returns Human-readable elapsed time
   */
  getTimeElapsed(date: Date | string): string {
    if (!date) return '';
    
    // Handle both Date objects and string dates
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check for invalid date
    if (isNaN(dateObj.getTime())) return '';
    
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }
  
  /**
   * Normalize notification data to handle both camelCase and snake_case properties
   * @param notification The notification to normalize
   * @returns Normalized notification with consistent property access
   */
  private normalizeNotification(notification: Notification): Notification {
    // Handle legacy fields if present
    if (notification.is_read !== undefined && notification.read === undefined) {
      notification.read = notification.is_read;
    }
    
    if (notification.created_at !== undefined && notification.createdAt === undefined) {
      notification.createdAt = notification.created_at;
    }
    
    if (notification.read_at !== undefined && notification.readAt === undefined) {
      notification.readAt = notification.read_at;
    }
    
    if (notification.related_id !== undefined && notification.relatedId === undefined) {
      notification.relatedId = notification.related_id;
    }
    
    if (notification.related_type !== undefined && notification.relatedType === undefined) {
      notification.relatedType = notification.related_type;
    }
    
    return notification;
  }
}