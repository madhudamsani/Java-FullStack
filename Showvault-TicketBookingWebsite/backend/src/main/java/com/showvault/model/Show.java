package com.showvault.model;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.EqualsAndHashCode;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "`show`")
public class Show {
    
    public enum ShowStatus {
        UPCOMING, ONGOING, COMPLETED, CANCELLED
    }
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 100)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(nullable = false, length = 20)
    private String type; // Movie, Theater, Concert, Event, Other
    
    @Column(nullable = false)
    private Integer duration; // Duration in minutes
    
    @Column(length = 50)
    private String genre;
    
    @Column(length = 50)
    private String language;
    
    @Column(name = "poster_url")
    private String posterUrl;
    
    @Column(name = "trailer_url")
    private String trailerUrl;
    
    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ShowStatus status;
    
    @Column(name = "view_count")
    private Integer viewCount = 0;
    
    @Column(name = "image")
    private String image;
    
    @Column(name = "image_url")
    private String imageUrl;
    
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;
    
    @Column(name = "deletion_reason")
    private String deletionReason;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by")
    @JsonIgnoreProperties({"password", "roles", "createdAt", "updatedAt", "hibernateLazyInitializer", "handler"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User createdBy;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "show", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"show", "bookings", "hibernateLazyInitializer", "handler"})
    private List<ShowSchedule> schedules = new ArrayList<>();
    
    @OneToMany(mappedBy = "showId", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<ShowReview> reviews = new ArrayList<>();
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    public List<ShowReview> getReviews() {
        return reviews;
    }
    
    public void setReviews(List<ShowReview> reviews) {
        this.reviews = reviews;
    }
}