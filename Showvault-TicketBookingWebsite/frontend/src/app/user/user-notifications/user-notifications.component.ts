import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { NotificationType, NOTIFICATION_TYPE_METADATA } from '../../models/notification.model';
import * as EnumUtils from '../../utils/enum-utils';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionText?: string;
}

@Component({
  selector: 'app-user-notifications',
  templateUrl: './user-notifications.component.html',
  styleUrls: ['./user-notifications.component.css']
})
export class UserNotificationsComponent implements OnInit {
  notifications: Notification[] = [];
  isLoading = true;
  error = '';
  successMessage = '';
  
  // For filtering
  showUnreadOnly = false;
  typeFilter = 'all';
  
  // For pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.notificationService.getUserNotifications().subscribe({
      next: (notifications) => {
        // Map the API notifications to the component's Notification interface
        this.notifications = notifications.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: this.mapNotificationType(n.type),
          timestamp: n.createdAt || new Date(),
          read: n.read,
          actionUrl: n.relatedId ? this.getActionUrl(n.relatedType, n.relatedId) : undefined,
          actionText: 'View Details'
        }));
        this.totalItems = notifications.length;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load notifications. Please try again.';
        this.isLoading = false;
        console.error('Error loading notifications:', error);
      }
    });
  }

  markAsRead(notification: Notification): void {
    if (notification.read) return;
    
    this.notificationService.markNotificationAsRead(notification.id).subscribe({
      next: () => {
        notification.read = true;
      },
      error: (error) => {
        console.error('Error marking notification as read:', error);
      }
    });
  }

  markAllAsRead(): void {
    const unreadNotifications = this.notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;
    
    this.notificationService.markAllNotificationsAsRead().subscribe({
      next: () => {
        this.notifications.forEach(notification => {
          notification.read = true;
        });
        this.successMessage = 'All notifications marked as read.';
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.error = 'Failed to mark all notifications as read. Please try again.';
        console.error('Error marking all notifications as read:', error);
        
        // Clear error message after 3 seconds
        setTimeout(() => {
          this.error = '';
        }, 3000);
      }
    });
  }

  deleteNotification(notificationId: number): void {
    this.notificationService.deleteNotification(notificationId).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.totalItems = this.notifications.length;
        this.successMessage = 'Notification deleted.';
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.error = 'Failed to delete notification. Please try again.';
        console.error('Error deleting notification:', error);
        
        // Clear error message after 3 seconds
        setTimeout(() => {
          this.error = '';
        }, 3000);
      }
    });
  }

  deleteAllNotifications(): void {
    if (confirm('Are you sure you want to delete all notifications? This action cannot be undone.')) {
      this.notificationService.deleteAllNotifications().subscribe({
        next: () => {
          this.notifications = [];
          this.totalItems = 0;
          this.successMessage = 'All notifications deleted.';
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          this.error = 'Failed to delete all notifications. Please try again.';
          console.error('Error deleting all notifications:', error);
          
          // Clear error message after 3 seconds
          setTimeout(() => {
            this.error = '';
          }, 3000);
        }
      });
    }
  }

  navigateToAction(notification: Notification): void {
    if (notification.actionUrl) {
      this.markAsRead(notification);
      this.router.navigateByUrl(notification.actionUrl);
    }
  }

  clearSuccessMessage(): void {
    this.successMessage = '';
  }

  clearError(): void {
    this.error = '';
  }

  updateUnreadFilter(): void {
    this.showUnreadOnly = !this.showUnreadOnly;
    this.applyFilters();
  }

  updateTypeFilter(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.typeFilter = select.value;
    this.applyFilters();
  }

  applyFilters(): void {
    // Reset to first page when filters change
    this.currentPage = 1;
  }

  hasUnreadNotifications(): boolean {
    return this.notifications.some(notification => !notification.read);
  }

  get filteredNotifications(): Notification[] {
    let filtered = [...this.notifications];
    
    // Apply unread filter
    if (this.showUnreadOnly) {
      filtered = filtered.filter(notification => !notification.read);
    }
    
    // Apply type filter
    if (this.typeFilter !== 'all') {
      filtered = filtered.filter(notification => notification.type === this.typeFilter);
    }
    
    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return filtered;
  }

  get paginatedNotifications(): Notification[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredNotifications.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredNotifications.length / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
  
  getPageArray(): number[] {
    return Array(this.totalPages).fill(0).map((_, i) => i);
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

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'info':
        return 'bi-info-circle-fill';
      case 'success':
        return 'bi-check-circle-fill';
      case 'warning':
        return 'bi-exclamation-triangle-fill';
      case 'danger':
        return 'bi-x-circle-fill';
      default:
        return 'bi-bell-fill';
    }
  }
  
  getIconBackgroundClass(type: string): string {
    return 'bg-' + type;
  }
  
  handleActionClick(event: Event, notification: Notification): void {
    event.stopPropagation();
    this.navigateToAction(notification);
  }
  
  handleDeleteClick(event: Event, notification: Notification): void {
    event.stopPropagation();
    if (notification.id) {
      this.deleteNotification(notification.id);
    }
  }
  
  handlePrevPage(): void {
    this.changePage(this.currentPage - 1);
  }
  
  handleNextPage(): void {
    this.changePage(this.currentPage + 1);
  }
  
  handlePageClick(page: number): void {
    this.changePage(page);
  }
  
  /**
   * Map NotificationType to Bootstrap color classes
   * @param type The notification type
   * @returns Bootstrap color class
   */
  private mapNotificationType(type: string): 'info' | 'success' | 'warning' | 'danger' {
    // Convert string to enum value
    const notificationType = this.getNotificationType(type);
    
    // Use the metadata color to determine the Bootstrap class
    const metadata = NOTIFICATION_TYPE_METADATA[notificationType];
    switch (metadata.color) {
      case 'primary':
      case 'secondary':
      case 'info':
        return 'info';
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'danger':
        return 'danger';
      default:
        return 'info';
    }
  }
  
  /**
   * Convert string to NotificationType enum
   * @param type The string type
   * @returns NotificationType enum value
   */
  private getNotificationType(type: string): NotificationType {
    return EnumUtils.fromString(NotificationType, type, NotificationType.SYSTEM);
  }
  
  private getActionUrl(type?: string, id?: number): string | undefined {
    if (!type || !id) return undefined;
    
    switch (type) {
      case 'SHOW':
        return `/shows/${id}`;
      case 'BOOKING':
        return `/bookings/${id}`;
      case 'PAYMENT':
        return `/payments/${id}`;
      default:
        return undefined;
    }
  }
}