package com.showvault.repository;

import com.showvault.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    
    /**
     * Find all notifications for a user
     * @param userId The user ID
     * @return List of notifications
     */
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    /**
     * Find unread notifications for a user
     * @param userId The user ID
     * @return List of unread notifications
     */
    List<Notification> findByUserIdAndReadFalseOrderByCreatedAtDesc(Long userId);
    
    /**
     * Count unread notifications for a user
     * @param userId The user ID
     * @return Count of unread notifications
     */
    long countByUserIdAndReadFalse(Long userId);
    
    /**
     * Mark all notifications as read for a user
     * @param userId The user ID
     * @return Number of notifications updated
     */
    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.user.id = ?1 AND n.read = false")
    int markAllAsRead(Long userId);
    
    /**
     * Find notifications related to a specific entity
     * @param relatedId The related entity ID
     * @param type The notification type
     * @return List of notifications
     */
    List<Notification> findByRelatedIdAndType(Long relatedId, Notification.NotificationType type);
}