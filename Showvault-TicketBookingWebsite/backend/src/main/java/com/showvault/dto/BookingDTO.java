package com.showvault.dto;

import com.showvault.model.Booking;
import com.showvault.model.BookingStatus;
import com.showvault.model.PaymentStatus;
import com.showvault.model.User;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
public class BookingDTO {
    private Long id;
    private String bookingNumber;
    private Long userId;
    private String userName;
    private String userEmail;
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private Long showScheduleId;
    private String showName;
    private String venueName;
    private LocalDateTime showDate;
    private LocalDateTime bookingDate;
    private BigDecimal totalAmount;
    private BookingStatus status;
    private PaymentStatus paymentStatus;
    private String paymentMethod;
    private String paymentId;
    private List<SeatBookingDTO> seats = new ArrayList<>();
    private String refundReason;
    private String qrCodeData;
    private Boolean ticketGenerated;
    private Boolean ticketSent;
    
    public BookingDTO(Booking booking) {
        this.id = booking.getId();
        this.bookingNumber = booking.getBookingNumber();
        this.userId = booking.getUser() != null ? booking.getUser().getId() : null;
        this.userName = booking.getUser() != null ? booking.getUser().getUsername() : null;
        this.userEmail = booking.getUser() != null ? booking.getUser().getEmail() : null;
        
        // Set customer details from user
        if (booking.getUser() != null) {
            User user = booking.getUser();
            this.customerName = (user.getFirstName() != null ? user.getFirstName() : "") + 
                               (user.getLastName() != null ? " " + user.getLastName() : "");
            this.customerName = this.customerName.trim();
            this.customerEmail = user.getEmail();
            this.customerPhone = user.getPhoneNumber();
            
            System.out.println("Setting customer details in DTO - Name: " + this.customerName + 
                              ", Email: " + this.customerEmail + 
                              ", Phone: " + this.customerPhone);
        }
        this.showScheduleId = booking.getShowSchedule() != null ? booking.getShowSchedule().getId() : null;
        this.showName = booking.getShowSchedule() != null && booking.getShowSchedule().getShow() != null ? 
                booking.getShowSchedule().getShow().getTitle() : null;
        this.venueName = booking.getShowSchedule() != null && booking.getShowSchedule().getVenue() != null ? 
                booking.getShowSchedule().getVenue().getName() : null;
        try {
            this.showDate = booking.getShowSchedule() != null && booking.getShowSchedule().getShowDate() != null ? 
                    booking.getShowSchedule().getShowDate().atTime(booking.getShowSchedule().getStartTime()) : null;
        } catch (Exception e) {
            System.out.println("Error getting show date: " + e.getMessage());
            this.showDate = null;
        }
        this.bookingDate = booking.getBookingDate();
        this.totalAmount = booking.getTotalAmount();
        this.status = booking.getStatus();
        
        // Get payment status and method from the most recent payment
        try {
            if (booking.getPayments() != null && !booking.getPayments().isEmpty()) {
                this.paymentStatus = booking.getPayments().get(0).getStatus();
                this.paymentMethod = booking.getPayments().get(0).getMethod().toString();
                this.paymentId = booking.getPayments().get(0).getTransactionId();
            } else {
                // Default payment status for demo purposes
                this.paymentStatus = PaymentStatus.COMPLETED;
                this.paymentMethod = "CREDIT_CARD";
                this.paymentId = "DEMO-" + System.currentTimeMillis();
            }
        } catch (Exception e) {
            // If there's any error, use default values
            System.out.println("Error getting payment details: " + e.getMessage());
            this.paymentStatus = PaymentStatus.COMPLETED;
            this.paymentMethod = "CREDIT_CARD";
            this.paymentId = "DEMO-" + System.currentTimeMillis();
        }
        
        // Convert seat bookings to DTOs
        if (booking.getSeatBookings() != null) {
            this.seats = booking.getSeatBookings().stream()
                    .map(SeatBookingDTO::new)
                    .collect(Collectors.toList());
        }
        
        // Set QR code and ticket status
        this.qrCodeData = booking.getQrCodeData();
        this.ticketGenerated = booking.getTicketGenerated();
        this.ticketSent = booking.getTicketSent();
    }
}