package com.showvault.repository;

import com.showvault.model.ConsolidatedNotification;
import com.showvault.model.NotificationType;
import com.showvault.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for ConsolidatedNotification entity
 */
@Repository
public interface ConsolidatedNotificationRepository extends JpaRepository<ConsolidatedNotification, Long> {
    
    /**
     * Find notifications for a user, ordered by creation date descending
     * @param user The user
     * @return List of notifications
     */
    List<ConsolidatedNotification> findByUserOrderByCreatedAtDesc(User user);
    
    /**
     * Find paginated notifications for a user, ordered by creation date descending
     * @param user The user
     * @param pageable Pagination information
     * @return Page of notifications
     */
    Page<ConsolidatedNotification> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);
    
    /**
     * Find notifications for a user by read status, ordered by creation date descending
     * @param user The user
     * @param read The read status
     * @return List of notifications
     */
    List<ConsolidatedNotification> findByUserAndReadOrderByCreatedAtDesc(User user, boolean read);
    
    /**
     * Count notifications for a user by read status
     * @param user The user
     * @param read The read status
     * @return Count of notifications
     */
    long countByUserAndRead(User user, boolean read);
    
    /**
     * Mark all unread notifications as read for a user
     * @param user The user
     * @return Number of notifications marked as read
     */
    @Modifying
    @Query("UPDATE ConsolidatedNotification n SET n.read = true, n.readAt = CURRENT_TIMESTAMP WHERE n.user = ?1 AND n.read = false")
    int markAllAsRead(User user);
    
    /**
     * Delete all read notifications for a user
     * @param user The user
     * @return Number of notifications deleted
     */
    @Modifying
    @Query("DELETE FROM ConsolidatedNotification n WHERE n.user = ?1 AND n.read = true")
    int deleteAllReadNotifications(User user);
    
    /**
     * Find notifications for a user by type, ordered by creation date descending
     * @param user The user
     * @param type The notification type
     * @return List of notifications
     */
    List<ConsolidatedNotification> findByUserAndTypeOrderByCreatedAtDesc(User user, NotificationType type);
    
    /**
     * Find notifications by related entity
     * @param relatedId The ID of the related entity
     * @param relatedType The type of the related entity
     * @return List of notifications
     */
    List<ConsolidatedNotification> findByRelatedIdAndRelatedType(Long relatedId, String relatedType);
    
    /**
     * Find notifications for a user by type and read status, ordered by creation date descending
     * @param user The user
     * @param type The notification type
     * @param read The read status
     * @return List of notifications
     */
    List<ConsolidatedNotification> findByUserAndTypeAndReadOrderByCreatedAtDesc(User user, NotificationType type, boolean read);
    
    /**
     * Count notifications for a user by type and read status
     * @param user The user
     * @param type The notification type
     * @param read The read status
     * @return Count of notifications
     */
    long countByUserAndTypeAndRead(User user, NotificationType type, boolean read);
}