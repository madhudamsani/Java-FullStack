package com.showvault.controller;

import com.showvault.model.Booking;
import com.showvault.model.BookingStatus;
import com.showvault.security.services.UserDetailsImpl;
import com.showvault.service.BookingService;
import com.showvault.service.TicketService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    @Autowired
    private TicketService ticketService;
    
    @Autowired
    private BookingService bookingService;
    
    /**
     * Download ticket PDF for a booking
     * @param bookingId The ID of the booking
     * @return PDF file as response
     */
    @GetMapping("/download/{bookingId}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<byte[]> downloadTicket(@PathVariable Long bookingId) {
        System.out.println("Downloading ticket by booking ID: " + bookingId);
        
        // Check if the user is authorized to download this ticket
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        System.out.println("User ID: " + userDetails.getId() + ", Username: " + userDetails.getUsername());
        
        Optional<Booking> bookingOpt = bookingService.getBookingById(bookingId);
        
        if (bookingOpt.isEmpty()) {
            System.out.println("Booking not found with ID: " + bookingId);
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        
        Booking booking = bookingOpt.get();
        System.out.println("Found booking: ID=" + booking.getId() + ", Number=" + booking.getBookingNumber() + ", Status=" + booking.getStatus());
        
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isOwner = booking.getUser() != null && booking.getUser().getId().equals(userDetails.getId());
        
        System.out.println("User is admin: " + isAdmin + ", User is owner: " + isOwner);
        
        if (!isAdmin && !isOwner) {
            System.out.println("User is not authorized to download this ticket");
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }
        
        // Check if booking is confirmed
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            System.out.println("Cannot generate ticket for booking with status: " + booking.getStatus());
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        
        try {
            System.out.println("Generating PDF ticket for booking ID: " + bookingId);
            byte[] pdfBytes = ticketService.generateTicketPdf(bookingId);
            
            if (pdfBytes == null || pdfBytes.length == 0) {
                System.out.println("Generated PDF is empty");
                return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
            }
            
            System.out.println("PDF generated successfully, size: " + pdfBytes.length + " bytes");
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("filename", "ticket-" + booking.getBookingNumber() + ".pdf");
            
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            System.err.println("Error generating PDF ticket: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Download ticket PDF by booking number
     * @param bookingNumber The booking number
     * @return PDF file as response
     */
    @GetMapping("/download/number/{bookingNumber}")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<byte[]> downloadTicketByNumber(@PathVariable String bookingNumber) {
        System.out.println("Downloading ticket by booking number: " + bookingNumber);
        
        // Check if the user is authorized to download this ticket
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        System.out.println("User ID: " + userDetails.getId() + ", Username: " + userDetails.getUsername());
        
        Optional<Booking> bookingOpt = bookingService.getBookingByNumber(bookingNumber);
        
        if (bookingOpt.isEmpty()) {
            System.out.println("Booking not found with number: " + bookingNumber);
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        
        Booking booking = bookingOpt.get();
        System.out.println("Found booking: ID=" + booking.getId() + ", Number=" + booking.getBookingNumber() + ", Status=" + booking.getStatus());
        
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isOwner = booking.getUser() != null && booking.getUser().getId().equals(userDetails.getId());
        
        System.out.println("User is admin: " + isAdmin + ", User is owner: " + isOwner);
        
        if (!isAdmin && !isOwner) {
            System.out.println("User is not authorized to download this ticket");
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }
        
        // Check if booking is confirmed
        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            System.out.println("Cannot generate ticket for booking with status: " + booking.getStatus());
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        
        try {
            System.out.println("Generating PDF ticket for booking number: " + bookingNumber);
            byte[] pdfBytes = ticketService.generateTicketPdfByBookingNumber(bookingNumber);
            
            if (pdfBytes == null || pdfBytes.length == 0) {
                System.out.println("Generated PDF is empty");
                return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
            }
            
            System.out.println("PDF generated successfully, size: " + pdfBytes.length + " bytes");
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("filename", "ticket-" + booking.getBookingNumber() + ".pdf");
            
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            System.err.println("Error generating PDF ticket: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}