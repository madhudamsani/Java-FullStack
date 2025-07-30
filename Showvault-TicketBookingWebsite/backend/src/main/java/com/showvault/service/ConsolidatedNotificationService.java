package com.showvault.service;

import com.showvault.model.ConsolidatedNotification;
import com.showvault.model.NotificationType;
import com.showvault.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

/**
 * Service interface for managing notifications
 */
public interface ConsolidatedNotificationService {
    
    /**
     * Get all notifications for a user
     * @param user The user
     * @return List of notifications
     */
    List<ConsolidatedNotification> getUserNotifications(User user);
    
    /**
     * Get paginated notifications for a user
     * @param user The user
     * @param pageable Pagination information
     * @return Page of notifications
     */
    Page<ConsolidatedNotification> getUserNotificationsPaged(User user, Pageable pageable);
    
    /**
     * Get unread notifications for a user
     * @param user The user
     * @return List of unread notifications
     */
    List<ConsolidatedNotification> getUnreadNotifications(User user);
    
    /**
     * Get count of unread notifications for a user
     * @param user The user
     * @return Count of unread notifications
     */
    long getUnreadCount(User user);
    
    /**
     * Get a notification by ID
     * @param id The notification ID
     * @return Optional containing the notification if found
     */
    Optional<ConsolidatedNotification> getNotificationById(Long id);
    
    /**
     * Create a notification
     * @param notification The notification to create
     * @return The created notification
     */
    ConsolidatedNotification createNotification(ConsolidatedNotification notification);
    
    /**
     * Create a notification with basic information
     * @param user The user
     * @param title The notification title
     * @param message The notification message
     * @param type The notification type
     * @return The created notification
     */
    ConsolidatedNotification createNotification(User user, String title, String message, 
                                              NotificationType type);
    
    /**
     * Create a notification with related entity information
     * @param user The user
     * @param title The notification title
     * @param message The notification message
     * @param type The notification type
     * @param relatedId The ID of the related entity
     * @param relatedType The type of the related entity
     * @return The created notification
     */
    ConsolidatedNotification createNotification(User user, String title, String message, 
                                              NotificationType type, 
                                              Long relatedId, String relatedType);
    
    /**
     * Mark a notification as read
     * @param id The notification ID
     * @return true if successful, false otherwise
     */
    boolean markAsRead(Long id);
    
    /**
     * Mark all notifications as read for a user
     * @param user The user
     * @return Number of notifications marked as read
     */
    int markAllAsRead(User user);
    
    /**
     * Delete a notification
     * @param id The notification ID
     * @return true if successful, false otherwise
     */
    boolean deleteNotification(Long id);
    
    /**
     * Delete all read notifications for a user
     * @param user The user
     * @return Number of notifications deleted
     */
    int deleteAllReadNotifications(User user);
    
    /**
     * Get notifications by type for a user
     * @param user The user
     * @param type The notification type
     * @return List of notifications
     */
    List<ConsolidatedNotification> getNotificationsByType(User user, NotificationType type);
    
    /**
     * Get notifications by related entity
     * @param relatedId The ID of the related entity
     * @param relatedType The type of the related entity
     * @return List of notifications
     */
    List<ConsolidatedNotification> getNotificationsByRelatedEntity(Long relatedId, String relatedType);
    
    /**
     * Get notifications by type and read status for a user
     * @param user The user
     * @param type The notification type
     * @param read The read status
     * @return List of notifications
     */
    List<ConsolidatedNotification> getNotificationsByTypeAndReadStatus(User user, NotificationType type, boolean read);
    
    /**
     * Count notifications by type and read status for a user
     * @param user The user
     * @param type The notification type
     * @param read The read status
     * @return Count of notifications
     */
    long countByTypeAndReadStatus(User user, NotificationType type, boolean read);
    
    /**
     * Send a booking confirmation notification
     * @param bookingId The booking ID
     */
    void sendBookingConfirmationNotification(Long bookingId);
    
    /**
     * Send a booking cancellation notification
     * @param bookingId The booking ID
     */
    void sendBookingCancellationNotification(Long bookingId);
    
    /**
     * Send a refund notification
     * @param bookingId The booking ID
     * @param amount The refund amount
     */
    void sendRefundNotification(Long bookingId, String amount);
    
    /**
     * Send a show schedule change notification
     * @param scheduleId The schedule ID
     * @param oldDate The old date
     * @param oldTime The old time
     */
    void sendShowScheduleChangeNotification(Long scheduleId, String oldDate, String oldTime);
    
    /**
     * Send a show cancellation notification
     * @param scheduleId The schedule ID
     */
    void sendShowCancellationNotification(Long scheduleId);
}