package com.showvault.controller;

import com.showvault.dto.BookingDTO;
import com.showvault.dto.BookingRequestDTO;
import com.showvault.model.Booking;
import com.showvault.model.BookingPayment;
import com.showvault.model.BookingStatus;
import com.showvault.model.PaymentMethod;
import com.showvault.model.PaymentStatus;
import com.showvault.model.Seat;
import com.showvault.model.SeatBooking;
import com.showvault.model.Show;
import com.showvault.model.ShowSchedule;
import com.showvault.model.User;
import com.showvault.repository.BookingPaymentRepository;
import com.showvault.repository.BookingRepository;
import com.showvault.security.services.UserDetailsImpl;
import com.showvault.service.BookingService;
import com.showvault.service.DTOConverterService;
import com.showvault.service.PaymentService;
import com.showvault.service.SeatReservationService;
import com.showvault.service.SeatService;
import com.showvault.service.ShowScheduleService;
import com.showvault.service.ShowService;
import com.showvault.service.TicketService;
import com.showvault.service.UserService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import jakarta.persistence.EntityManager;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private UserService userService;

    @Autowired
    private ShowScheduleService showScheduleService;

    @Autowired
    private ShowService showService;

    @Autowired
    private SeatService seatService;
    
    @Autowired
    private DTOConverterService dtoConverterService;
    
    @Autowired
    private ApplicationContext applicationContext;
    
    @Autowired
    private BookingRepository bookingRepository;
    
    @Autowired
    private SeatReservationService seatReservationService;
    
    @Autowired
    private TicketService ticketService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<BookingDTO>> getAllBookings() {
        List<Booking> bookings = bookingService.getAllBookings();
        List<BookingDTO> bookingDTOs = dtoConverterService.convertBookingsToDTO(bookings);
        return new ResponseEntity<>(bookingDTOs, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<BookingDTO> getBookingById(@PathVariable Long id) {
        Optional<Booking> bookingOpt = bookingService.getBookingById(id);
        
        if (bookingOpt.isPresent()) {
            Booking booking = bookingOpt.get();
            
            // Check if the user is authorized to view this booking
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            boolean isOrganizer = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ORGANIZER"));
            boolean isOwner = booking.getUser().getId().equals(userDetails.getId());
            boolean isShowCreator = isOrganizer && 
                    booking.getShowSchedule().getShow().getCreatedBy().getId().equals(userDetails.getId());
            
            if (isAdmin || isOwner || isShowCreator) {
                BookingDTO bookingDTO = dtoConverterService.convertToBookingDTO(booking);
                return new ResponseEntity<>(bookingDTO, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/number/{bookingNumber}")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<Booking> getBookingByNumber(@PathVariable String bookingNumber) {
        Optional<Booking> bookingOpt = bookingService.getBookingByNumber(bookingNumber);
        
        if (bookingOpt.isPresent()) {
            Booking booking = bookingOpt.get();
            
            // Check if the user is authorized to view this booking
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            boolean isOwner = booking.getUser().getId().equals(userDetails.getId());
            boolean isShowCreator = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ORGANIZER")) && 
                    booking.getShowSchedule().getShow().getCreatedBy().getId().equals(userDetails.getId());
            
            if (isAdmin || isOwner || isShowCreator) {
                return new ResponseEntity<>(booking, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/my-bookings")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<BookingDTO>> getMyBookings() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        System.out.println("Getting bookings for user ID: " + userDetails.getId());
        
        // Get the user from the database
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        if (!userOpt.isPresent()) {
            System.out.println("User not found with ID: " + userDetails.getId());
            return new ResponseEntity<>(new ArrayList<>(), HttpStatus.OK);
        }
        
        User user = userOpt.get();
        System.out.println("Found user: " + user.getUsername() + " (ID: " + user.getId() + ")");
        
        List<Booking> bookings = bookingService.getBookingsByUserId(user.getId());
        System.out.println("Found " + bookings.size() + " bookings for user");
        
        // Print details of each booking for debugging
        for (Booking booking : bookings) {
            System.out.println("Booking ID: " + booking.getId() + 
                               ", Number: " + booking.getBookingNumber() + 
                               ", Status: " + booking.getStatus() + 
                               ", User ID: " + (booking.getUser() != null ? booking.getUser().getId() : "null"));
        }
        
        // Convert to DTOs to avoid circular references
        List<BookingDTO> bookingDTOs = bookings.stream()
            .map(booking -> dtoConverterService.convertToBookingDTO(booking))
            .collect(java.util.stream.Collectors.toList());
        
        return new ResponseEntity<>(bookingDTOs, HttpStatus.OK);
    }

    @GetMapping("/recent")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<Booking>> getRecentBookings(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        List<Booking> bookings = bookingService.getRecentBookingsByUserId(userDetails.getId(), fromDate);
        return new ResponseEntity<>(bookings, HttpStatus.OK);
    }

    @GetMapping("/schedule/{scheduleId}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<List<Booking>> getBookingsBySchedule(@PathVariable Long scheduleId) {
        // Check if the user is authorized to view these bookings
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<ShowSchedule> scheduleOpt = showScheduleService.getShowScheduleById(scheduleId);
        if (!scheduleOpt.isPresent()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        
        ShowSchedule schedule = scheduleOpt.get();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isShowCreator = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ORGANIZER")) && 
                schedule.getShow().getCreatedBy().getId().equals(userDetails.getId());
        
        if (isAdmin || isShowCreator) {
            List<Booking> bookings = bookingService.getBookingsByShowScheduleId(scheduleId);
            return new ResponseEntity<>(bookings, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }
    }

    @GetMapping("/show/{showId}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<List<Booking>> getBookingsByShow(@PathVariable Long showId) {
        // Check if the user is authorized to view these bookings
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<Show> showOpt = showService.getShowById(showId);
        if (!showOpt.isPresent()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        
        Show show = showOpt.get();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isShowCreator = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ORGANIZER")) && 
                show.getCreatedBy().getId().equals(userDetails.getId());
        
        if (isAdmin || isShowCreator) {
            List<Booking> bookings = bookingService.getBookingsByShowId(showId);
            return new ResponseEntity<>(bookings, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }
    }

    @PostMapping("/schedule/{scheduleId}/seats")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> createBooking(
            @PathVariable Long scheduleId,
            @RequestBody BookingRequestDTO bookingRequest) {
        
        if (bookingRequest == null || bookingRequest.getSeatIds() == null || bookingRequest.getSeatIds().isEmpty()) {
            return new ResponseEntity<>("No seats selected", HttpStatus.BAD_REQUEST);
        }
        
        // Log the received booking request for debugging
        System.out.println("Received booking request: " + bookingRequest);
        
        // Check if a session ID was provided for seat reservations
        String sessionId = bookingRequest.getSessionId();
        if (sessionId != null && !sessionId.isEmpty()) {
            System.out.println("Session ID provided: " + sessionId + ". Will release reservations after booking.");
        }
        
        List<Long> seatIds = bookingRequest.getSeatIds();
        
        // Get the current user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        if (!userOpt.isPresent()) {
            return new ResponseEntity<>("User not found", HttpStatus.NOT_FOUND);
        }
        
        // Get the show schedule
        Optional<ShowSchedule> scheduleOpt = showScheduleService.getShowScheduleById(scheduleId);
        if (!scheduleOpt.isPresent()) {
            return new ResponseEntity<>("Show schedule not found", HttpStatus.NOT_FOUND);
        }
        
        ShowSchedule schedule = scheduleOpt.get();
        
        // Validate booking time based on show type and start time
        String timeValidationError = validateBookingTime(schedule);
        if (timeValidationError != null) {
            return new ResponseEntity<>(timeValidationError, HttpStatus.BAD_REQUEST);
        }
        
        // Get the seats
        List<Seat> seats = seatService.getSeatsByIds(seatIds);
        if (seats.size() != seatIds.size()) {
            return new ResponseEntity<>("One or more seats not found", HttpStatus.NOT_FOUND);
        }
        
        // Check if seats are available
        List<Seat> availableSeats = seatService.getAvailableSeatsByVenueAndShowSchedule(
                scheduleOpt.get().getVenue().getId(), scheduleId);
        
        if (!availableSeats.containsAll(seats)) {
            return new ResponseEntity<>("One or more seats are not available", HttpStatus.BAD_REQUEST);
        }
        
        // Create the booking
        try {
            Booking booking;
            
            // Check if promotion code is provided
            String promotionCode = bookingRequest.getPromotionCode();
            if (promotionCode != null && !promotionCode.trim().isEmpty()) {
                System.out.println("Creating booking with promotion code: " + promotionCode);
                // Use promotion-aware booking creation
                booking = bookingService.createBookingWithPromotion(
                    userOpt.get(), 
                    scheduleOpt.get(), 
                    seats, 
                    bookingRequest.getTotalAmount(),
                    promotionCode.trim()
                );
            } else {
                // Use regular booking creation
                booking = bookingRequest.getTotalAmount() != null 
                    ? bookingService.createBooking(userOpt.get(), scheduleOpt.get(), seats, bookingRequest.getTotalAmount())
                    : bookingService.createBooking(userOpt.get(), scheduleOpt.get(), seats);
            }
            
            System.out.println("Created booking with ID: " + booking.getId() + " for user ID: " + userOpt.get().getId());
            System.out.println("Booking number: " + booking.getBookingNumber());
            
            // If a session ID was provided, release the reservations
            if (bookingRequest.getSessionId() != null && !bookingRequest.getSessionId().isEmpty()) {
                try {
                    seatReservationService.releaseReservations(bookingRequest.getSessionId());
                    System.out.println("Released seat reservations for session ID: " + bookingRequest.getSessionId());
                } catch (Exception e) {
                    System.err.println("Error releasing seat reservations: " + e.getMessage());
                    // Don't fail the booking if reservation release fails
                }
            }
            
            // Verify the booking was saved correctly
            Optional<Booking> savedBooking = bookingService.getBookingById(booking.getId());
            if (savedBooking.isPresent()) {
                System.out.println("Successfully retrieved saved booking with ID: " + booking.getId());
                System.out.println("Verified booking number: " + savedBooking.get().getBookingNumber());
                
                // Ensure all relationships are loaded
                Booking fullBooking = savedBooking.get();
                
                // Force initialization of lazy-loaded collections
                if (fullBooking.getSeatBookings() != null) {
                    System.out.println("Booking has " + fullBooking.getSeatBookings().size() + " seat bookings");
                    
                    // Force initialization of each seat in seat bookings
                    for (SeatBooking sb : fullBooking.getSeatBookings()) {
                        if (sb.getSeat() != null) {
                            System.out.println("Seat booking has seat ID: " + sb.getSeat().getId());
                        }
                    }
                }
                
                // Convert to DTO to avoid circular references
                BookingDTO bookingDTO = dtoConverterService.convertToBookingDTO(fullBooking);
                
                // Ensure the booking number is properly set in the DTO
                if (bookingDTO.getBookingNumber() == null || bookingDTO.getBookingNumber().isEmpty()) {
                    bookingDTO.setBookingNumber(fullBooking.getBookingNumber());
                    System.out.println("Set booking number in DTO: " + bookingDTO.getBookingNumber());
                }
                
                // Log the final DTO that will be returned to the client
                System.out.println("Returning booking DTO with ID: " + bookingDTO.getId() + 
                                  ", Number: " + bookingDTO.getBookingNumber());
                
                return new ResponseEntity<>(bookingDTO, HttpStatus.CREATED);
            } else {
                System.out.println("WARNING: Could not retrieve saved booking with ID: " + booking.getId());
                
                // Create a DTO manually with the booking data we have
                BookingDTO bookingDTO = new BookingDTO();
                bookingDTO.setId(booking.getId());
                bookingDTO.setBookingNumber(booking.getBookingNumber());
                bookingDTO.setStatus(booking.getStatus());  // Pass the BookingStatus enum directly
                bookingDTO.setTotalAmount(booking.getTotalAmount());
                bookingDTO.setBookingDate(booking.getBookingDate());
                
                System.out.println("Returning manually created booking DTO with ID: " + bookingDTO.getId() + 
                                  ", Number: " + bookingDTO.getBookingNumber());
                
                return new ResponseEntity<>(bookingDTO, HttpStatus.CREATED);
            }
        } catch (Exception e) {
            System.err.println("Error creating booking: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("Failed to create booking: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Get available seats for a show schedule in seat map format
     * 
     * @param scheduleId The ID of the show schedule
     * @return The seat map with availability information
     */
    @GetMapping("/schedules/{scheduleId}/seats")
    public ResponseEntity<?> getAvailableSeatsForSchedule(@PathVariable Long scheduleId) {
        try {
            // Redirect to the seat map controller
            return ResponseEntity.status(HttpStatus.TEMPORARY_REDIRECT)
                    .header("Location", "/api/seat-maps/shows/0/schedules/" + scheduleId)
                    .build();
        } catch (Exception e) {
            return new ResponseEntity<>("Failed to get available seats: " + e.getMessage(), 
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<HttpStatus> updateBookingStatus(
            @PathVariable Long id, 
            @RequestParam BookingStatus status) {
        
        Optional<Booking> bookingOpt = bookingService.getBookingById(id);
        if (!bookingOpt.isPresent()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        
        Booking booking = bookingOpt.get();
        
        // Check if the user is authorized to update this booking
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isOwner = booking.getUser().getId().equals(userDetails.getId());
        
        // Users can only cancel their own bookings
        if (isOwner && status != BookingStatus.CANCELLED) {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }
        
        if (isAdmin || isOwner) {
            Optional<Booking> updatedBookingOpt = bookingService.updateBookingStatus(id, status);
            return updatedBookingOpt.isPresent() ? 
                    new ResponseEntity<>(HttpStatus.OK) : 
                    new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        } else {
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<HttpStatus> deleteBooking(@PathVariable Long id) {
        try {
            bookingService.deleteBooking(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Cancel a booking
     * 
     * @param id The booking ID
     * @return Response with status
     */
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> cancelBooking(@PathVariable Long id) {
        try {
            // Get the current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Long userId = userDetails.getId();
            
            // Check if the booking exists
            Optional<Booking> bookingOpt = bookingService.getBookingById(id);
            if (!bookingOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Booking not found with ID: " + id));
            }
            
            Booking booking = bookingOpt.get();
            
            // Check if the user owns the booking or is an admin
            boolean isOwner = booking.getUser() != null && booking.getUser().getId().equals(userId);
            boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
                
            if (!isOwner && !isAdmin) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "You are not authorized to cancel this booking"));
            }
            
            // Check if the booking can be cancelled
            if (booking.getStatus() == BookingStatus.CANCELLED) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Booking is already cancelled"));
            }
            
            if (booking.getStatus() == BookingStatus.REFUNDED) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Cannot cancel a refunded booking"));
            }
            
            // Update the booking status to CANCELLED
            Optional<Booking> updatedBookingOpt = bookingService.updateBookingStatus(id, BookingStatus.CANCELLED);
            
            if (updatedBookingOpt.isPresent()) {
                Map<String, Object> response = new HashMap<>();
                response.put("message", "Booking cancelled successfully");
                response.put("booking", updatedBookingOpt.get());
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to cancel booking"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Error cancelling booking: " + e.getMessage()));
        }
    }
    
    /**
     * Get saved payment methods for the current user
     * 
     * @return List of payment methods
     */
    @GetMapping("/payment-methods")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> getSavedPaymentMethods() {
        try {
            // Get the current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            // In a real implementation, this would fetch payment methods from a database
            // For now, return mock payment methods
            List<Map<String, Object>> paymentMethods = new ArrayList<>();
            
            // Add a mock credit card
            Map<String, Object> creditCard = new HashMap<>();
            creditCard.put("id", "pm_" + UUID.randomUUID().toString().substring(0, 8));
            creditCard.put("type", "CREDIT_CARD");
            creditCard.put("name", "Visa ending in 4242");
            creditCard.put("icon", "bi-credit-card");
            creditCard.put("lastFour", "4242");
            creditCard.put("expiryDate", "12/25");
            paymentMethods.add(creditCard);
            
            // Add a mock PayPal account
            Map<String, Object> paypal = new HashMap<>();
            paypal.put("id", "pm_" + UUID.randomUUID().toString().substring(0, 8));
            paypal.put("type", "PAYPAL");
            paypal.put("name", "PayPal Account");
            paypal.put("icon", "bi-paypal");
            paymentMethods.add(paypal);
            
            return new ResponseEntity<>(paymentMethods, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>("Error fetching payment methods: " + e.getMessage(), 
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Add a new payment method for the current user
     * 
     * @param paymentMethod The payment method to add
     * @return The added payment method with an ID
     */
    @PostMapping("/payment-methods")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> addPaymentMethod(@RequestBody Map<String, Object> paymentMethod) {
        try {
            // Get the current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            // In a real implementation, this would save the payment method to a database
            // For now, just add an ID and return it
            paymentMethod.put("id", "pm_" + UUID.randomUUID().toString().substring(0, 8));
            
            return new ResponseEntity<>(paymentMethod, HttpStatus.CREATED);
        } catch (Exception e) {
            return new ResponseEntity<>("Error adding payment method: " + e.getMessage(), 
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Process payment for a booking
     * 
     * @param bookingId The ID of the booking to process payment for
     * @param paymentRequest The payment request containing payment method ID
     * @return The payment intent
     */
    @PostMapping("/{bookingId}/payment")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> processPayment(
            @PathVariable Long bookingId,
            @RequestBody Map<String, Object> paymentRequest) {
        
        try {
            System.out.println("Processing payment for booking ID: " + bookingId);
            System.out.println("Payment request: " + paymentRequest);
            
            // Get the current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            // Get the booking
            Optional<Booking> bookingOpt = bookingService.getBookingById(bookingId);
            if (!bookingOpt.isPresent()) {
                System.out.println("Booking not found with ID: " + bookingId);
                return new ResponseEntity<>("Booking not found", HttpStatus.NOT_FOUND);
            }
            
            Booking booking = bookingOpt.get();
            System.out.println("Found booking: " + booking.getId() + ", Number: " + booking.getBookingNumber());
            
            // Check if the user is authorized to process this payment
            if (!booking.getUser().getId().equals(userDetails.getId())) {
                System.out.println("User " + userDetails.getId() + " is not authorized to process payment for booking " + bookingId);
                return new ResponseEntity<>("You are not authorized to process this payment", HttpStatus.FORBIDDEN);
            }
            
            // Get the payment method ID
            String paymentMethodId = (String) paymentRequest.get("paymentMethodId");
            if (paymentMethodId == null || paymentMethodId.isEmpty()) {
                System.out.println("Payment method ID is required");
                return new ResponseEntity<>("Payment method ID is required", HttpStatus.BAD_REQUEST);
            }
            
            // Get customer details if provided
            String customerName = (String) paymentRequest.get("customerName");
            String customerEmail = (String) paymentRequest.get("customerEmail");
            String customerPhone = (String) paymentRequest.get("customerPhone");
            
            // Update customer details in the booking if provided
            if (customerName != null || customerEmail != null || customerPhone != null) {
                System.out.println("Updating booking with customer details");
                
                // Get the user to update - make sure to get a fresh copy from the database
                Optional<User> userOpt = userService.getUserById(booking.getUser().getId());
                if (!userOpt.isPresent()) {
                    System.out.println("User not found with ID: " + booking.getUser().getId());
                    return new ResponseEntity<>("User not found", HttpStatus.NOT_FOUND);
                }
                
                User user = userOpt.get();
                boolean userUpdated = false;
                
                // Update user details if needed
                if (customerName != null && !customerName.isEmpty()) {
                    user.setFirstName(customerName);
                    System.out.println("Updated customer name: " + customerName);
                    userUpdated = true;
                }
                
                if (customerEmail != null && !customerEmail.isEmpty() && !customerEmail.equals(user.getEmail())) {
                    user.setEmail(customerEmail);
                    System.out.println("Updated customer email: " + customerEmail);
                    userUpdated = true;
                }
                
                if (customerPhone != null && !customerPhone.isEmpty()) {
                    user.setPhoneNumber(customerPhone);
                    System.out.println("Updated customer phone: " + customerPhone);
                    userUpdated = true;
                }
                
                // Save the updated user if changes were made
                if (userUpdated) {
                    User updatedUser = userService.updateUser(user);
                    System.out.println("User details updated in database: " + 
                                      "Name: " + updatedUser.getFirstName() + ", " +
                                      "Email: " + updatedUser.getEmail() + ", " +
                                      "Phone: " + updatedUser.getPhoneNumber());
                    
                    // Verify the user was updated correctly
                    Optional<User> verifiedUserOpt = userService.getUserById(updatedUser.getId());
                    if (verifiedUserOpt.isPresent()) {
                        User verifiedUser = verifiedUserOpt.get();
                        System.out.println("Verified user update: " + 
                                          "Name: " + verifiedUser.getFirstName() + ", " +
                                          "Email: " + verifiedUser.getEmail() + ", " +
                                          "Phone: " + verifiedUser.getPhoneNumber());
                    }
                    
                    // Update the user in the booking object to ensure consistency
                    booking.setUser(updatedUser);
                }
            }
            
            // Process the payment (in a real implementation, this would integrate with a payment gateway)
            // For now, create a mock payment intent
            String paymentIntentId = "pi_" + UUID.randomUUID().toString().substring(0, 8);
            Map<String, Object> paymentIntent = new HashMap<>();
            paymentIntent.put("id", paymentIntentId);
            paymentIntent.put("bookingId", bookingId);
            paymentIntent.put("amount", booking.getTotalAmount());
            paymentIntent.put("currency", "USD");
            paymentIntent.put("status", "COMPLETED");
            paymentIntent.put("paymentMethodId", paymentMethodId);
            paymentIntent.put("createdAt", LocalDateTime.now());
            
            // Create a payment record in the database
            try {
                // Get the PaymentService bean from the application context
                PaymentService paymentService = applicationContext.getBean(PaymentService.class);
                
                // Process the payment using the PaymentService
                PaymentMethod paymentMethod = PaymentMethod.CREDIT_CARD; // Default to credit card
                
                // Determine payment method based on paymentMethodId if possible
                if (paymentMethodId.toLowerCase().contains("paypal")) {
                    paymentMethod = PaymentMethod.PAYPAL;
                } else if (paymentMethodId.toLowerCase().contains("bank")) {
                    paymentMethod = PaymentMethod.BANK_TRANSFER;
                }
                
                // Create and save the payment record
                BookingPayment payment = new BookingPayment();
                payment.setBooking(booking);
                payment.setAmount(booking.getTotalAmount());
                payment.setMethod(paymentMethod);
                payment.setStatus(PaymentStatus.COMPLETED);
                payment.setTransactionId(paymentIntentId);
                payment.setPaymentDate(LocalDateTime.now());
                payment.setCreatedAt(LocalDateTime.now());
                payment.setUpdatedAt(LocalDateTime.now());
                
                // Save the payment using the repository
                BookingPaymentRepository paymentRepository = applicationContext.getBean(BookingPaymentRepository.class);
                BookingPayment savedPayment = paymentRepository.save(payment);
                
                System.out.println("Payment record created and saved with ID: " + savedPayment.getId() + 
                                  ", Transaction ID: " + savedPayment.getTransactionId());
                
                // Verify the payment was saved correctly
                Optional<BookingPayment> verifiedPayment = paymentRepository.findById(savedPayment.getId());
                if (verifiedPayment.isPresent()) {
                    System.out.println("Successfully verified payment record with ID: " + verifiedPayment.get().getId());
                    
                    // Add the payment to the booking's payment list to ensure bidirectional relationship
                    if (booking.getPayments() == null) {
                        booking.setPayments(new ArrayList<>());
                    }
                    booking.getPayments().add(savedPayment);
                    
                    // Save the updated booking to ensure the relationship is persisted
                    Booking updatedBooking = bookingRepository.save(booking);
                    System.out.println("Updated booking with payment relationship, booking ID: " + updatedBooking.getId());
                } else {
                    System.out.println("WARNING: Could not verify payment record with ID: " + savedPayment.getId());
                    
                    // Try to save again with a different approach
                    try {
                        System.out.println("Attempting to save payment record again with EntityManager...");
                        EntityManager entityManager = applicationContext.getBean(EntityManager.class);
                        entityManager.persist(payment);
                        entityManager.flush();
                        System.out.println("Payment record saved using EntityManager with ID: " + payment.getId());
                    } catch (Exception em_ex) {
                        System.out.println("Error saving payment with EntityManager: " + em_ex.getMessage());
                    }
                }
                
                // Add payment details to the response
                paymentIntent.put("paymentId", savedPayment.getId());
                paymentIntent.put("paymentMethod", savedPayment.getMethod().toString());
                paymentIntent.put("transactionId", savedPayment.getTransactionId());
                paymentIntent.put("paymentDate", savedPayment.getPaymentDate());
                
            } catch (Exception e) {
                System.out.println("Error creating payment record: " + e.getMessage());
                e.printStackTrace();
                // Continue processing even if payment record creation fails
            }
            
            // Update the booking status
            System.out.println("Updating booking status to CONFIRMED for booking ID: " + bookingId);
            
            // Get a fresh copy of the booking from the database
            Optional<Booking> freshBookingOpt = bookingService.getBookingById(bookingId);
            if (!freshBookingOpt.isPresent()) {
                System.out.println("ERROR: Could not find booking with ID: " + bookingId);
                return new ResponseEntity<>("Booking not found", HttpStatus.NOT_FOUND);
            }
            
            Booking freshBooking = freshBookingOpt.get();
            System.out.println("Current booking status: " + freshBooking.getStatus());
            
            // Update the booking status
            Optional<Booking> updatedBookingOpt = bookingService.updateBookingStatus(bookingId, BookingStatus.CONFIRMED);
            if (updatedBookingOpt.isPresent()) {
                Booking updatedBooking = updatedBookingOpt.get();
                System.out.println("Booking status updated to: " + updatedBooking.getStatus());
                
                // Verify the booking was updated correctly by fetching it again
                Optional<Booking> verifiedBookingOpt = bookingService.getBookingById(bookingId);
                if (verifiedBookingOpt.isPresent()) {
                    Booking verifiedBooking = verifiedBookingOpt.get();
                    System.out.println("Verified booking status: " + verifiedBooking.getStatus());
                    
                    if (verifiedBooking.getStatus() != BookingStatus.CONFIRMED) {
                        System.out.println("WARNING: Booking status verification failed. Expected CONFIRMED but got: " + verifiedBooking.getStatus());
                        
                        // Try to update the status again
                        System.out.println("Attempting to update booking status again...");
                        bookingService.updateBookingStatus(bookingId, BookingStatus.CONFIRMED);
                        
                        // Verify one more time
                        Optional<Booking> reVerifiedBookingOpt = bookingService.getBookingById(bookingId);
                        if (reVerifiedBookingOpt.isPresent()) {
                            System.out.println("Re-verified booking status: " + reVerifiedBookingOpt.get().getStatus());
                            verifiedBooking = reVerifiedBookingOpt.get();
                        }
                    }
                    
                    // Add the booking details to the payment intent response
                    paymentIntent.put("bookingNumber", verifiedBooking.getBookingNumber());
                    paymentIntent.put("bookingStatus", verifiedBooking.getStatus().toString());
                    
                    // Convert to DTO to avoid circular references
                    BookingDTO bookingDTO = dtoConverterService.convertToBookingDTO(verifiedBooking);
                    
                    // Ensure customer details are included in the DTO
                    if (verifiedBooking.getUser() != null) {
                        User user = verifiedBooking.getUser();
                        bookingDTO.setCustomerName(user.getFirstName() + " " + user.getLastName());
                        bookingDTO.setCustomerEmail(user.getEmail());
                        bookingDTO.setCustomerPhone(user.getPhoneNumber());
                    }
                    
                    paymentIntent.put("booking", bookingDTO);
                } else {
                    System.out.println("ERROR: Could not verify booking status update");
                }
            } else {
                System.out.println("ERROR: Failed to update booking status");
            }
            
            System.out.println("Payment processing completed successfully");
            return new ResponseEntity<>(paymentIntent, HttpStatus.OK);
        } catch (Exception e) {
            System.out.println("Error processing payment: " + e.getMessage());
            e.printStackTrace();
            return new ResponseEntity<>("Error processing payment: " + e.getMessage(), 
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Get booking notifications for the current user
     * 
     * @return List of notifications
     */
    @GetMapping("/notifications")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> getBookingNotifications() {
        try {
            // Get the current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            // In a real implementation, this would fetch notifications from a database
            // For now, return mock notifications with user-specific information
            List<Map<String, Object>> notifications = new ArrayList<>();
            
            // Add a mock notification with user information
            Map<String, Object> notification1 = new HashMap<>();
            notification1.put("id", 1);
            notification1.put("title", "Booking Confirmed");
            notification1.put("message", "Hello " + userDetails.getUsername() + ", your booking has been confirmed.");
            notification1.put("userId", userDetails.getId());
            notification1.put("date", LocalDateTime.now().minusHours(2));
            notification1.put("read", false);
            notification1.put("type", "BOOKING_CONFIRMED");
            notifications.add(notification1);
            
            // Add another mock notification
            Map<String, Object> notification2 = new HashMap<>();
            notification2.put("id", 2);
            notification2.put("title", "Show Reminder");
            notification2.put("message", "Your show is starting in 24 hours.");
            notification2.put("date", LocalDateTime.now().minusDays(1));
            notification2.put("read", true);
            notification2.put("type", "SHOW_REMINDER");
            notifications.add(notification2);
            
            return new ResponseEntity<>(notifications, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>("Error fetching notifications: " + e.getMessage(), 
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Mark a notification as read
     * 
     * @param notificationId The ID of the notification to mark as read
     * @return Success message
     */
    @PutMapping("/notifications/{notificationId}/read")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> markNotificationAsRead(@PathVariable Long notificationId) {
        try {
            // Get the current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            // In a real implementation, this would update the notification in a database
            // For now, just return success
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Notification marked as read");
            
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>("Error marking notification as read: " + e.getMessage(), 
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    @GetMapping("/{id}/qrcode")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> getBookingQRCode(@PathVariable Long id) {
        try {
            // Get the current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            // Get the booking
            Optional<Booking> bookingOpt = bookingService.getBookingById(id);
            if (!bookingOpt.isPresent()) {
                return new ResponseEntity<>("Booking not found", HttpStatus.NOT_FOUND);
            }
            
            Booking booking = bookingOpt.get();
            
            // Check if the user is authorized to view this booking
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            boolean isOwner = booking.getUser().getId().equals(userDetails.getId());
            
            if (!isAdmin && !isOwner) {
                return new ResponseEntity<>("You are not authorized to view this booking", HttpStatus.FORBIDDEN);
            }
            
            // Check if booking is confirmed
            if (booking.getStatus() != BookingStatus.CONFIRMED) {
                return new ResponseEntity<>("QR code is only available for confirmed bookings", HttpStatus.BAD_REQUEST);
            }
            
            // Get or generate QR code data
            String qrCodeData = booking.getQrCodeData();
            if (qrCodeData == null || qrCodeData.isEmpty()) {
                // Generate QR code data
                qrCodeData = String.format("BOOKING:%s,USER:%d,SCHEDULE:%d,DATE:%s",
                        booking.getBookingNumber(),
                        booking.getUser().getId(),
                        booking.getShowSchedule().getId(),
                        booking.getBookingDate().toString());
                
                // Save the QR code data to the booking
                booking.setQrCodeData(qrCodeData);
                bookingService.updateBookingStatus(booking.getId(), booking.getStatus());
            }
            
            // Generate QR code image
            byte[] qrCodeImageBytes = ticketService.generateQRCode(booking);
            String qrCodeImageBase64 = java.util.Base64.getEncoder().encodeToString(qrCodeImageBytes);
            
            // Return the QR code data and image
            Map<String, Object> response = new HashMap<>();
            response.put("qrCodeData", qrCodeData);
            response.put("qrCodeImage", qrCodeImageBase64);
            response.put("bookingNumber", booking.getBookingNumber());
            response.put("bookingId", booking.getId());
            
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>("Error getting QR code: " + e.getMessage(), 
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Validates if booking is allowed based on show type and timing
     * 
     * @param schedule The show schedule to validate
     * @return Error message if booking is not allowed, null if allowed
     */
    private String validateBookingTime(ShowSchedule schedule) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime showDateTime = LocalDateTime.of(schedule.getShowDate(), schedule.getStartTime());
        
        // Check if show has already started
        if (now.isAfter(showDateTime)) {
            String showType = schedule.getShow().getType();
            
            // For movies, allow booking up to 15 minutes after start time
            if ("Movie".equalsIgnoreCase(showType)) {
                LocalDateTime cutoffTime = showDateTime.plusMinutes(15);
                
                if (now.isAfter(cutoffTime)) {
                    long minutesAfterStart = java.time.Duration.between(showDateTime, now).toMinutes();
                    return String.format("Booking not allowed. The movie started %d minutes ago. " +
                            "Bookings are only allowed up to 15 minutes after the movie starts.", 
                            minutesAfterStart);
                }
                
                // Show warning but allow booking
                long minutesAfterStart = java.time.Duration.between(showDateTime, now).toMinutes();
                System.out.println(String.format("Warning: Movie started %d minutes ago, but booking is still allowed " +
                        "(within 15-minute grace period)", minutesAfterStart));
                
                return null; // Allow booking
            } else {
                // For all other show types (Theater, Concert, Event, Other), don't allow booking after start
                long minutesAfterStart = java.time.Duration.between(showDateTime, now).toMinutes();
                return String.format("Booking not allowed. The %s started %d minutes ago. " +
                        "Bookings are not allowed after %s events have started.", 
                        showType.toLowerCase(), minutesAfterStart, showType.toLowerCase());
            }
        }
        
        return null; // Booking is allowed
    }
}