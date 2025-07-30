package com.showvault.service;

import com.showvault.exception.PaymentProcessingException;
import com.showvault.model.Booking;
import com.showvault.model.BookingPayment;
import com.showvault.model.BookingStatus;
import com.showvault.model.PaymentStatus;
import com.showvault.model.ShowSchedule;
import com.showvault.repository.BookingPaymentRepository;
import com.showvault.repository.BookingRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

/**
 * Service for processing refunds for cancelled bookings
 */
@Service
public class RefundService {

    private final BookingRepository bookingRepository;
    private final BookingPaymentRepository paymentRepository;
    private final BookingService bookingService;
    private final ConsolidatedNotificationService notificationService;
    
    @Autowired
    public RefundService(BookingRepository bookingRepository, 
                         BookingPaymentRepository paymentRepository,
                         BookingService bookingService,
                         ConsolidatedNotificationService notificationService) {
        this.bookingRepository = bookingRepository;
        this.paymentRepository = paymentRepository;
        this.bookingService = bookingService;
        this.notificationService = notificationService;
    }
    
    /**
     * Process a refund for a booking
     * @param bookingId The ID of the booking to refund
     * @return The refunded payment
     */
    @Transactional
    public BookingPayment processRefund(Long bookingId) {
        Optional<Booking> bookingOpt = bookingRepository.findById(bookingId);
        
        if (bookingOpt.isEmpty()) {
            throw new IllegalArgumentException("Booking not found with ID: " + bookingId);
        }
        
        Booking booking = bookingOpt.get();
        
        // Check if booking is eligible for refund
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalStateException("Booking is already cancelled");
        }
        
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalStateException("Only confirmed bookings can be refunded");
        }
        
        // Find the original payment
        Optional<BookingPayment> originalPaymentOpt = paymentRepository.findByBookingIdAndStatus(
                bookingId, PaymentStatus.COMPLETED);
        
        if (originalPaymentOpt.isEmpty()) {
            throw new IllegalStateException("No completed payment found for this booking");
        }
        
        BookingPayment originalPayment = originalPaymentOpt.get();
        
        // Calculate refund amount based on cancellation policy
        BigDecimal refundAmount = calculateRefundAmount(booking, originalPayment.getAmount());
        
        // Create refund payment record
        BookingPayment refundPayment = new BookingPayment();
        refundPayment.setBooking(booking);
        refundPayment.setAmount(refundAmount.negate()); // Negative amount for refund
        refundPayment.setMethod(originalPayment.getMethod());
        refundPayment.setStatus(PaymentStatus.PENDING);
        refundPayment.setNotes("Refund for cancelled booking: " + booking.getBookingNumber());
        
        // Process the refund with payment gateway
        boolean refundProcessed = processRefundWithPaymentGateway(refundPayment, originalPayment);
        
        if (refundProcessed) {
            refundPayment.setStatus(PaymentStatus.COMPLETED);
            refundPayment.setTransactionId("REF-" + System.currentTimeMillis()); // Generate a transaction ID
            
            // Update booking status
            bookingService.updateBookingStatus(bookingId, BookingStatus.CANCELLED);
            
            // Send notification
            notificationService.sendRefundNotification(booking.getId(), refundAmount.toString());
        } else {
            refundPayment.setStatus(PaymentStatus.FAILED);
            throw new PaymentProcessingException("Failed to process refund");
        }
        
        return paymentRepository.save(refundPayment);
    }
    
    /**
     * Process a refund for a booking by booking number
     * @param bookingNumber The booking number
     * @return The refunded payment
     */
    @Transactional
    public BookingPayment processRefundByBookingNumber(String bookingNumber) {
        Optional<Booking> bookingOpt = bookingRepository.findByBookingNumber(bookingNumber);
        
        if (bookingOpt.isEmpty()) {
            throw new IllegalArgumentException("Booking not found with number: " + bookingNumber);
        }
        
        return processRefund(bookingOpt.get().getId());
    }
    
    /**
     * Calculate refund amount based on cancellation policy
     * @param booking The booking
     * @param originalAmount The original payment amount
     * @return The refund amount
     */
    private BigDecimal calculateRefundAmount(Booking booking, BigDecimal originalAmount) {
        // Get the show schedule
        ShowSchedule schedule = booking.getShowSchedule();
        
        // Calculate days until show
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime showDateTime = LocalDateTime.of(schedule.getShowDate(), schedule.getStartTime());
        long daysUntilShow = ChronoUnit.DAYS.between(now, showDateTime);
        
        // Apply refund policy based on days until show
        if (daysUntilShow >= 7) {
            // Full refund if cancelled 7 or more days before show
            return originalAmount;
        } else if (daysUntilShow >= 3) {
            // 75% refund if cancelled 3-6 days before show
            return originalAmount.multiply(new BigDecimal("0.75"));
        } else if (daysUntilShow >= 1) {
            // 50% refund if cancelled 1-2 days before show
            return originalAmount.multiply(new BigDecimal("0.50"));
        } else {
            // No refund if cancelled on the day of the show
            return BigDecimal.ZERO;
        }
    }
    
    /**
     * Process refund with payment gateway
     * @param refundPayment The refund payment
     * @param originalPayment The original payment
     * @return True if refund was processed successfully
     */
    private boolean processRefundWithPaymentGateway(BookingPayment refundPayment, BookingPayment originalPayment) {
        // In a real implementation, this would integrate with a payment gateway API
        // For now, we'll simulate a successful refund
        try {
            // Simulate processing delay
            Thread.sleep(1000);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }
}