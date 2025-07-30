package com.showvault.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "notification")
public class Notification {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false, length = 100)
    private String title;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;
    
    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private NotificationType type;
    
    @Column(name = "related_id")
    private Long relatedId;
    
    @Column(name = "is_read", nullable = false)
    private boolean read;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        read = false;
    }
    
    /**
     * Enum representing different types of notifications
     */
    public enum NotificationType {
        COMMENT,
        LIKE,
        FOLLOW,
        MENTION,
        SYSTEM,
        CANCELLATION
    }
}