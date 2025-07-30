package com.showvault.controller;

import com.showvault.model.BookingPayment;
import com.showvault.model.BookingStatus;
import com.showvault.model.PaymentMethod;
import com.showvault.model.PaymentStatus;
import com.showvault.security.services.UserDetailsImpl;
import com.showvault.service.BookingService;
import com.showvault.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private BookingService bookingService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<BookingPayment>> getAllPayments() {
        List<BookingPayment> payments = paymentService.getAllPayments();
        return new ResponseEntity<>(payments, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<BookingPayment> getPaymentById(@PathVariable Long id) {
        Optional<BookingPayment> paymentOpt = paymentService.getPaymentById(id);
        
        if (paymentOpt.isPresent()) {
            BookingPayment payment = paymentOpt.get();
            
            // Check if the user is authorized to view this payment
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            boolean isOwner = payment.getBooking().getUser().getId().equals(userDetails.getId());
            boolean isShowCreator = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ORGANIZER")) && 
                    payment.getBooking().getShowSchedule().getShow().getCreatedBy().getId().equals(userDetails.getId());
            
            if (isAdmin || isOwner || isShowCreator) {
                return new ResponseEntity<>(payment, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/booking/{bookingId}")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<List<BookingPayment>> getPaymentsByBookingId(@PathVariable Long bookingId) {
        // Check if the user is authorized to view these payments
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        return bookingService.getBookingById(bookingId)
                .map(booking -> {
                    boolean isAdmin = authentication.getAuthorities().stream()
                            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
                    boolean isOwner = booking.getUser().getId().equals(userDetails.getId());
                    boolean isShowCreator = authentication.getAuthorities().stream()
                            .anyMatch(a -> a.getAuthority().equals("ROLE_ORGANIZER")) && 
                            booking.getShowSchedule().getShow().getCreatedBy().getId().equals(userDetails.getId());
                    
                    if (isAdmin || isOwner || isShowCreator) {
                        List<BookingPayment> payments = paymentService.getPaymentsByBookingId(bookingId);
                        return new ResponseEntity<>(payments, HttpStatus.OK);
                    } else {
                        return new ResponseEntity<List<BookingPayment>>(HttpStatus.FORBIDDEN);
                    }
                })
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping("/my-payments")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<BookingPayment>> getMyPayments() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        List<BookingPayment> payments = paymentService.getPaymentsByUserId(userDetails.getId());
        return new ResponseEntity<>(payments, HttpStatus.OK);
    }

    @GetMapping("/revenue")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Double>> getRevenueForPeriod(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        Double revenue = paymentService.getTotalRevenueForPeriod(startDate, endDate);
        return new ResponseEntity<>(Map.of("revenue", revenue != null ? revenue : 0.0), HttpStatus.OK);
    }

    @PostMapping("/process/{bookingId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> processPayment(
            @PathVariable Long bookingId,
            @RequestParam PaymentMethod paymentMethod,
            @RequestParam BigDecimal amount) {
        
        try {
            // Check if the user is authorized to process this payment
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            return bookingService.getBookingById(bookingId)
                    .map(booking -> {
                        if (!booking.getUser().getId().equals(userDetails.getId())) {
                            return new ResponseEntity<>("You are not authorized to process this payment", HttpStatus.FORBIDDEN);
                        }
                        
                        if (booking.getStatus() != BookingStatus.PENDING) {
                            return new ResponseEntity<>("This booking is not in a valid state for payment", HttpStatus.BAD_REQUEST);
                        }
                        
                        BookingPayment payment = paymentService.processPayment(bookingId, paymentMethod, amount);
                        
                        if (payment.getStatus() == PaymentStatus.COMPLETED) {
                            return new ResponseEntity<>(payment, HttpStatus.OK);
                        } else {
                            return new ResponseEntity<>("Payment processing failed", HttpStatus.INTERNAL_SERVER_ERROR);
                        }
                    })
                    .orElse(new ResponseEntity<>("Booking not found", HttpStatus.NOT_FOUND));
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return new ResponseEntity<>("An error occurred while processing the payment: " + e.getMessage(), 
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/refund/{paymentId}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> processRefund(@PathVariable Long paymentId) {
        try {
            // Check if the user is authorized to process this refund
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            
            return paymentService.getPaymentById(paymentId)
                    .map(payment -> {
                        if (!isAdmin && !payment.getBooking().getUser().getId().equals(userDetails.getId())) {
                            return new ResponseEntity<>("You are not authorized to process this refund", HttpStatus.FORBIDDEN);
                        }
                        
                        BookingPayment refundedPayment = paymentService.processRefund(paymentId);
                        return new ResponseEntity<>(refundedPayment, HttpStatus.OK);
                    })
                    .orElse(new ResponseEntity<>("Payment not found", HttpStatus.NOT_FOUND));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return new ResponseEntity<>("An error occurred while processing the refund: " + e.getMessage(), 
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}