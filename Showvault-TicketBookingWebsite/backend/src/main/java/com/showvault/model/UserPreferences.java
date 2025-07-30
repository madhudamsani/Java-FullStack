package com.showvault.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@Entity
@Table(name = "user_preferences")
public class UserPreferences {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "email_notifications")
    private boolean emailNotifications = true;
    
    @Column(name = "sms_notifications")
    private boolean smsNotifications = false;
    
    @Column(name = "language")
    private String language = "en";
    
    @Column(name = "currency")
    private String currency = "USD";
    
    @ElementCollection
    @CollectionTable(name = "user_favorite_categories", 
                    joinColumns = @JoinColumn(name = "user_preferences_id"))
    @Column(name = "category")
    private List<String> favoriteCategories = new ArrayList<>();
    
    @OneToOne
    @JoinColumn(name = "user_id")
    private com.showvault.model.User user;
}