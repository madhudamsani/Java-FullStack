package com.showvault.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.EqualsAndHashCode;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "show_schedule")
public class ShowSchedule {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "show_id", nullable = false)
    @JsonIgnoreProperties({"schedules", "createdAt", "updatedAt"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Show show;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "venue_id", nullable = false)
    @JsonIgnoreProperties({"createdAt", "updatedAt"})
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Venue venue;
    
    @Column(name = "show_date", nullable = false)
    private LocalDate showDate;
    
    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;
    
    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;
    
    @Column(name = "base_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal basePrice;
    
    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ScheduleStatus status;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "total_seats")
    private Integer totalSeats;
    
    @Column(name = "seats_available")
    private Integer seatsAvailable;
    
    @OneToMany(mappedBy = "showSchedule", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    private List<Booking> bookings = new ArrayList<>();
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        
        // Initialize totalSeats and seatsAvailable if they are null
        if (totalSeats == null) {
            totalSeats = venue != null ? venue.getCapacity() : 0;
        }
        
        if (seatsAvailable == null) {
            seatsAvailable = totalSeats;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    public enum ScheduleStatus {
        SCHEDULED, CANCELLED, COMPLETED
    }
    
    /**
     * Updates the available seats count based on bookings
     * 
     * Note: This method only uses in-memory bookings and is not recommended for production use.
     * Use SeatConsistencyService.synchronizeSeatsForSchedule() instead for accurate counts.
     * 
     * @deprecated Use SeatConsistencyService.synchronizeSeatsForSchedule() for accurate seat counts
     */
    @Deprecated
    public void updateSeatsAvailable() {
        int bookedSeats = 0;
        if (bookings != null) {
            for (Booking booking : bookings) {
                if (booking.getStatus() != BookingStatus.CANCELLED && 
                    booking.getStatus() != BookingStatus.EXPIRED && 
                    booking.getStatus() != BookingStatus.REFUNDED) {
                    bookedSeats += booking.getSeatBookings().size();
                }
            }
        }
        this.seatsAvailable = this.totalSeats - bookedSeats;
        
        // Log a warning that this method is not accurate
        System.out.println("WARNING: Using deprecated updateSeatsAvailable() method for schedule ID: " + this.id);
        System.out.println("This method only counts in-memory bookings and may not be accurate.");
        System.out.println("Consider using SeatConsistencyService.synchronizeSeatsForSchedule() instead.");
    }
    
    /**
     * Gets the show time as a string for frontend compatibility
     * 
     * @return The start time as a string
     */
    public String getShowTime() {
        return startTime != null ? startTime.toString() : null;
    }
}