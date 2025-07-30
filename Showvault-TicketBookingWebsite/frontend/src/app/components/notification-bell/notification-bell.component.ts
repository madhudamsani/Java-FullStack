import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { Subscription, interval, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { NotificationCount } from '../../models/notification.model';

@Component({
  selector: 'app-notification-bell',
  templateUrl: './notification-bell.component.html',
  styleUrls: ['./notification-bell.component.scss']
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  unreadCount = 0;
  loading = false;
  error = '';
  private refreshSubscription?: Subscription;

  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Initial load
    this.loadUnreadCount();
    
    // Refresh count every minute
    this.refreshSubscription = interval(60000).pipe(
      switchMap(() => {
        // Only refresh if the component is still in the DOM
        if (document.contains(document.querySelector('app-notification-bell'))) {
          return this.notificationService.getUnreadCount();
        }
        // Return an Observable with the current count
        return of({ count: this.unreadCount });
      })
    ).subscribe({
      next: (response) => {
        this.unreadCount = response.count;
      },
      error: (err) => {
        console.error('Error refreshing notification count:', err);
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up subscription when component is destroyed
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  /**
   * Load unread notification count
   */
  loadUnreadCount(): void {
    this.loading = true;
    this.error = '';
    
    this.notificationService.getUnreadCount().subscribe({
      next: (response) => {
        this.unreadCount = response.count;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load notifications';
        this.loading = false;
        console.error('Error loading notification count:', err);
      }
    });
  }

  /**
   * Navigate to notifications page
   */
  goToNotifications(): void {
    this.router.navigate(['/user/notifications']);
  }
}