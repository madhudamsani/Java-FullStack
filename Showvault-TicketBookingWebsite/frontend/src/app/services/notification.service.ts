import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Notification, NotificationPage, NotificationCount, NotificationActionResponse, NotificationType } from '../models/notification.model';

/**
 * Service for managing user notifications
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:8080/api/notifications';

  constructor(private http: HttpClient) { }

  /**
   * Get all notifications for the current user
   * @returns Observable of notifications array
   */
  getUserNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl).pipe(
      catchError(error => {
        console.error('Error fetching notifications:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch notifications'));
      })
    );
  }

  /**
   * Get paginated notifications for the current user
   * @param page Page number (0-based)
   * @param size Page size
   * @returns Observable of notification page
   */
  getUserNotificationsPaged(page: number = 0, size: number = 10): Observable<NotificationPage> {
    return this.http.get<NotificationPage>(`${this.apiUrl}/paged?page=${page}&size=${size}`).pipe(
      catchError(error => {
        console.error('Error fetching paginated notifications:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch paginated notifications'));
      })
    );
  }

  /**
   * Get unread notifications for the current user
   * @returns Observable of unread notifications array
   */
  getUnreadNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/unread`).pipe(
      catchError(error => {
        console.error('Error fetching unread notifications:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch unread notifications'));
      })
    );
  }

  /**
   * Get count of unread notifications for the current user
   * @returns Observable of notification count
   */
  getUnreadCount(): Observable<NotificationCount> {
    return this.http.get<NotificationCount>(`${this.apiUrl}/unread/count`).pipe(
      catchError(error => {
        console.error('Error fetching unread notification count:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch unread notification count'));
      })
    );
  }

  /**
   * Mark a notification as read
   * @param notificationId The notification ID
   * @returns Observable of void
   */
  markNotificationAsRead(notificationId: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${notificationId}/read`, {}).pipe(
      catchError(error => {
        console.error(`Error marking notification ${notificationId} as read:`, error);
        return throwError(() => new Error(error.message || 'Failed to mark notification as read'));
      })
    );
  }

  /**
   * Mark all notifications as read for the current user
   * @returns Observable of notification action response
   */
  markAllNotificationsAsRead(): Observable<NotificationActionResponse> {
    return this.http.post<NotificationActionResponse>(`${this.apiUrl}/read-all`, {}).pipe(
      catchError(error => {
        console.error('Error marking all notifications as read:', error);
        return throwError(() => new Error(error.message || 'Failed to mark all notifications as read'));
      })
    );
  }

  /**
   * Delete a notification
   * @param notificationId The notification ID
   * @returns Observable of void
   */
  deleteNotification(notificationId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${notificationId}`).pipe(
      catchError(error => {
        console.error(`Error deleting notification ${notificationId}:`, error);
        return throwError(() => new Error(error.message || 'Failed to delete notification'));
      })
    );
  }

  /**
   * Delete all read notifications for the current user
   * @returns Observable of notification action response
   */
  deleteAllReadNotifications(): Observable<NotificationActionResponse> {
    return this.http.delete<NotificationActionResponse>(`${this.apiUrl}/read`).pipe(
      catchError(error => {
        console.error('Error deleting read notifications:', error);
        return throwError(() => new Error(error.message || 'Failed to delete read notifications'));
      })
    );
  }

  /**
   * Get notifications by type for the current user
   * @param type The notification type
   * @returns Observable of notifications array
   */
  getNotificationsByType(type: NotificationType): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/type/${type}`).pipe(
      catchError(error => {
        console.error(`Error fetching notifications of type ${type}:`, error);
        return throwError(() => new Error(error.message || 'Failed to fetch notifications by type'));
      })
    );
  }
  
  /**
   * Get notifications by type and read status for the current user
   * @param type The notification type
   * @param read The read status
   * @returns Observable of notifications array
   */
  getNotificationsByTypeAndReadStatus(type: NotificationType, read: boolean): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/type/${type}/read/${read}`).pipe(
      catchError(error => {
        console.error(`Error fetching notifications of type ${type} and read status ${read}:`, error);
        return throwError(() => new Error(error.message || 'Failed to fetch notifications by type and read status'));
      })
    );
  }
  
  /**
   * Get count of notifications by type and read status for the current user
   * @param type The notification type
   * @param read The read status
   * @returns Observable of notification count
   */
  getNotificationCountByTypeAndReadStatus(type: NotificationType, read: boolean): Observable<NotificationCount> {
    return this.http.get<NotificationCount>(`${this.apiUrl}/type/${type}/read/${read}/count`).pipe(
      catchError(error => {
        console.error(`Error fetching notification count of type ${type} and read status ${read}:`, error);
        return throwError(() => new Error(error.message || 'Failed to fetch notification count by type and read status'));
      })
    );
  }

  /**
   * @deprecated Use deleteAllReadNotifications instead
   * @returns Observable of void
   */
  deleteAllNotifications(): Observable<void> {
    console.warn('deleteAllNotifications is deprecated. Use deleteAllReadNotifications instead.');
    // Call the new method instead to ensure consistent behavior
    return this.deleteAllReadNotifications().pipe(
      map(() => undefined)
    );
  }
}