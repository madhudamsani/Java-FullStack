package com.showvault.controller;

import com.showvault.model.Booking;
import com.showvault.model.BookingPayment;
import com.showvault.security.services.UserDetailsImpl;
import com.showvault.service.BookingService;
import com.showvault.service.RefundService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/refunds")
public class RefundController {

    @Autowired
    private RefundService refundService;
    
    @Autowired
    private BookingService bookingService;
    
    /**
     * Process a refund for a booking
     * @param bookingId The ID of the booking to refund
     * @return The refund details
     */
    @PostMapping("/booking/{bookingId}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> processRefund(@PathVariable Long bookingId) {
        // Check if the user is authorized to request this refund
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<Booking> bookingOpt = bookingService.getBookingById(bookingId);
        
        if (bookingOpt.isEmpty()) {
            return new ResponseEntity<>("Booking not found", HttpStatus.NOT_FOUND);
        }
        
        Booking booking = bookingOpt.get();
        
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isOwner = booking.getUser().getId().equals(userDetails.getId());
        
        if (!isAdmin && !isOwner) {
            return new ResponseEntity<>("Not authorized to request refund for this booking", HttpStatus.FORBIDDEN);
        }
        
        try {
            BookingPayment refundPayment = refundService.processRefund(bookingId);
            return new ResponseEntity<>(refundPayment, HttpStatus.OK);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return new ResponseEntity<>("Error processing refund: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Process a refund for a booking by booking number
     * @param bookingNumber The booking number
     * @return The refund details
     */
    @PostMapping("/booking/number/{bookingNumber}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> processRefundByBookingNumber(@PathVariable String bookingNumber) {
        // Check if the user is authorized to request this refund
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<Booking> bookingOpt = bookingService.getBookingByNumber(bookingNumber);
        
        if (bookingOpt.isEmpty()) {
            return new ResponseEntity<>("Booking not found", HttpStatus.NOT_FOUND);
        }
        
        Booking booking = bookingOpt.get();
        
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isOwner = booking.getUser().getId().equals(userDetails.getId());
        
        if (!isAdmin && !isOwner) {
            return new ResponseEntity<>("Not authorized to request refund for this booking", HttpStatus.FORBIDDEN);
        }
        
        try {
            BookingPayment refundPayment = refundService.processRefundByBookingNumber(bookingNumber);
            return new ResponseEntity<>(refundPayment, HttpStatus.OK);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return new ResponseEntity<>("Error processing refund: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Admin endpoint to process a refund for any booking
     * @param bookingId The ID of the booking to refund
     * @return The refund details
     */
    @PostMapping("/admin/booking/{bookingId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> adminProcessRefund(@PathVariable Long bookingId) {
        try {
            BookingPayment refundPayment = refundService.processRefund(bookingId);
            return new ResponseEntity<>(refundPayment, HttpStatus.OK);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return new ResponseEntity<>("Error processing refund: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}