package com.showvault.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Consolidated notification model that combines features from both Notification and UserNotification
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "notification")
public class ConsolidatedNotification {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @NotBlank
    @Size(max = 200)
    @Column(nullable = false)
    private String title;
    
    @NotBlank
    @Size(max = 1000)
    @Column(nullable = false, length = 1000)
    private String message;
    
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private NotificationType type;
    
    @Column(name = "related_id")
    private Long relatedId;
    
    @Column(name = "related_type", length = 50)
    private String relatedType;
    
    @Column(name = "is_read", nullable = false)
    private boolean read = false;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "read_at")
    private LocalDateTime readAt;
    
    /**
     * Default constructor with current timestamp
     */
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
    
    /**
     * Constructor with basic notification information
     */
    public ConsolidatedNotification(User user, String title, String message, NotificationType type) {
        this.user = user;
        this.title = title;
        this.message = message;
        this.type = type;
        this.createdAt = LocalDateTime.now();
    }
    
    /**
     * Constructor with related entity information
     */
    public ConsolidatedNotification(User user, String title, String message, NotificationType type, 
                                   Long relatedId, String relatedType) {
        this(user, title, message, type);
        this.relatedId = relatedId;
        this.relatedType = relatedType;
    }
    
    /**
     * Mark the notification as read
     */
    public void markAsRead() {
        this.read = true;
        this.readAt = LocalDateTime.now();
    }
    
    /**
     * Check if the notification is recent (within the last 7 days)
     */
    public boolean isRecent() {
        return this.createdAt.isAfter(LocalDateTime.now().minusDays(7));
    }
}