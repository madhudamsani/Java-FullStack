package com.showvault.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonManagedReference;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "seat", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"venue_id", "row_name", "seat_number"})
})
public class Seat {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id", nullable = false)
    @JsonIgnoreProperties({"seats", "hibernateLazyInitializer", "handler"})
    private Venue venue;
    
    @Column(name = "row_name", nullable = false, length = 5)
    private String rowName;
    
    @Column(name = "seat_number", nullable = false)
    private Integer seatNumber;
    
    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private SeatCategory category;
    
    @Column(name = "price_multiplier", precision = 3, scale = 2)
    private BigDecimal priceMultiplier = BigDecimal.ONE;
    
    @OneToMany(mappedBy = "seat", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<SeatBooking> seatBookings = new ArrayList<>();
    
    public enum SeatCategory {
        STANDARD, PREMIUM, VIP
    }
    
    public SeatCategory getSeatType() {
        return this.category;
    }
}