package com.showvault.service;

import com.showvault.model.Booking;
import com.showvault.model.BookingPayment;
import com.showvault.model.BookingStatus;
import com.showvault.model.PaymentMethod;
import com.showvault.model.PaymentStatus;
import com.showvault.repository.BookingPaymentRepository;
import com.showvault.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PaymentService {

    private final BookingPaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final BookingService bookingService;

    @Autowired
    public PaymentService(BookingPaymentRepository paymentRepository, 
                          BookingRepository bookingRepository,
                          BookingService bookingService) {
        this.paymentRepository = paymentRepository;
        this.bookingRepository = bookingRepository;
        this.bookingService = bookingService;
    }

    public List<BookingPayment> getAllPayments() {
        return paymentRepository.findAll();
    }

    public Optional<BookingPayment> getPaymentById(Long id) {
        return paymentRepository.findById(id);
    }

    public List<BookingPayment> getPaymentsByBookingId(Long bookingId) {
        return paymentRepository.findByBookingId(bookingId);
    }

    public List<BookingPayment> getPaymentsByUserId(Long userId) {
        return paymentRepository.findByUserId(userId);
    }

    public List<BookingPayment> getPaymentsByStatus(PaymentStatus status) {
        return paymentRepository.findByStatus(status);
    }

    public List<BookingPayment> getPaymentsByMethod(PaymentMethod method) {
        return paymentRepository.findByMethod(method);
    }

    public List<BookingPayment> getPaymentsByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return paymentRepository.findByPaymentDateBetween(startDate, endDate);
    }

    public Double getTotalRevenueForPeriod(LocalDateTime startDate, LocalDateTime endDate) {
        return paymentRepository.getTotalRevenueForPeriod(startDate, endDate);
    }

    @Transactional
    public BookingPayment processPayment(Long bookingId, PaymentMethod method, BigDecimal amount) {
        Optional<Booking> bookingOpt = bookingRepository.findById(bookingId);
        
        if (bookingOpt.isEmpty()) {
            throw new IllegalArgumentException("Booking not found with ID: " + bookingId);
        }
        
        Booking booking = bookingOpt.get();
        
        // Validate payment amount matches booking total
        if (amount.compareTo(booking.getTotalAmount()) != 0) {
            throw new IllegalArgumentException("Payment amount does not match booking total");
        }
        
        // Create payment record
        BookingPayment payment = new BookingPayment();
        payment.setBooking(booking);
        payment.setAmount(amount);
        payment.setMethod(method);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setTransactionId(generateTransactionId());
        
        // Save payment
        BookingPayment savedPayment = paymentRepository.save(payment);
        
        // Process payment with mock payment gateway
        boolean paymentSuccessful = processWithPaymentGateway(savedPayment);
        
        if (paymentSuccessful) {
            // Update payment status
            savedPayment.setStatus(PaymentStatus.COMPLETED);
            paymentRepository.save(savedPayment);
            
            // Get the booking again to ensure we have the latest version
            Booking updatedBooking = bookingRepository.findById(bookingId).orElseThrow();
            
            // Generate QR code data
            String qrCodeData = generateQRCodeData(updatedBooking);
            updatedBooking.setQrCodeData(qrCodeData);
            updatedBooking.setTicketGenerated(true);
            
            // Update booking status
            bookingRepository.save(updatedBooking);
            bookingService.updateBookingStatus(bookingId, BookingStatus.CONFIRMED);
        } else {
            // Update payment status to failed
            savedPayment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(savedPayment);
        }
        
        return savedPayment;
    }

    @Transactional
    public BookingPayment processRefund(Long paymentId) {
        Optional<BookingPayment> paymentOpt = paymentRepository.findById(paymentId);
        
        if (paymentOpt.isEmpty()) {
            throw new IllegalArgumentException("Payment not found with ID: " + paymentId);
        }
        
        BookingPayment payment = paymentOpt.get();
        
        // Check if payment is eligible for refund
        if (payment.getStatus() != PaymentStatus.COMPLETED) {
            throw new IllegalStateException("Only completed payments can be refunded");
        }
        
        // Process refund with mock payment gateway
        boolean refundSuccessful = processRefundWithPaymentGateway(payment);
        
        if (refundSuccessful) {
            // Update payment status
            payment.setStatus(PaymentStatus.REFUNDED);
            paymentRepository.save(payment);
            
            // Update booking status
            bookingService.updateBookingStatus(payment.getBooking().getId(), BookingStatus.CANCELLED);
        }
        
        return payment;
    }

    // Mock payment gateway integration
    private boolean processWithPaymentGateway(BookingPayment payment) {
        // In a real application, this would integrate with a payment gateway API
        // For now, we'll simulate a successful payment most of the time
        return Math.random() > 0.1; // 90% success rate
    }

    // Mock refund processing
    private boolean processRefundWithPaymentGateway(BookingPayment payment) {
        // In a real application, this would integrate with a payment gateway API
        // For now, we'll simulate a successful refund most of the time
        return Math.random() > 0.1; // 90% success rate
    }

    private String generateTransactionId() {
        // Generate a unique transaction ID
        return "TXN-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
    }
    
    private String generateQRCodeData(Booking booking) {
        // Create QR code content with booking details
        return String.format("BOOKING:%s,USER:%d,SCHEDULE:%d,DATE:%s",
                booking.getBookingNumber(),
                booking.getUser().getId(),
                booking.getShowSchedule().getId(),
                booking.getBookingDate().toString());
    }
}