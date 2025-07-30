package com.showvault.service.impl;

import com.showvault.model.Booking;
import com.showvault.model.BookingStatus;
import com.showvault.model.Seat;
import com.showvault.model.SeatBooking;
import com.showvault.model.ShowSchedule;
import com.showvault.model.User;
import com.showvault.model.NotificationType;
import com.showvault.repository.BookingRepository;
import com.showvault.repository.SeatBookingRepository;
import com.showvault.repository.SeatRepository;
import com.showvault.repository.ShowScheduleRepository;
import com.showvault.repository.UserRepository;
import com.showvault.service.BookingService;
import com.showvault.service.ConsolidatedNotificationService;
import com.showvault.service.SeatConsistencyService;
import com.showvault.service.SeatReservationService;
import com.showvault.service.SeatMapService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final SeatBookingRepository seatBookingRepository;
    private final UserRepository userRepository;
    private final ShowScheduleRepository showScheduleRepository;
    private final SeatRepository seatRepository;
    private final SeatReservationService seatReservationService;
    private final ConsolidatedNotificationService notificationService;
    private final SeatMapService seatMapService;
    private final SeatConsistencyService seatConsistencyService;
    private final com.showvault.service.PromotionService promotionService;

    @Autowired
    public BookingServiceImpl(
            BookingRepository bookingRepository, 
            SeatBookingRepository seatBookingRepository,
            UserRepository userRepository,
            ShowScheduleRepository showScheduleRepository,
            SeatRepository seatRepository,
            SeatReservationService seatReservationService,
            ConsolidatedNotificationService notificationService,
            SeatMapService seatMapService,
            SeatConsistencyService seatConsistencyService,
            com.showvault.service.PromotionService promotionService) {
        this.bookingRepository = bookingRepository;
        this.seatBookingRepository = seatBookingRepository;
        this.userRepository = userRepository;
        this.showScheduleRepository = showScheduleRepository;
        this.seatRepository = seatRepository;
        this.seatReservationService = seatReservationService;
        this.notificationService = notificationService;
        this.seatMapService = seatMapService;
        this.seatConsistencyService = seatConsistencyService;
        this.promotionService = promotionService;
    }

    @Override
    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    @Override
    public Optional<Booking> getBookingById(Long id) {
        System.out.println("Getting booking by ID: " + id);
        
        // Try to get the booking with all details
        Optional<Booking> bookingOpt = bookingRepository.findBookingWithDetailsById(id);
        
        // If not found with details, try the standard findById
        if (!bookingOpt.isPresent()) {
            System.out.println("Booking not found with details, trying standard findById");
            bookingOpt = bookingRepository.findById(id);
        }
        
        if (bookingOpt.isPresent()) {
            Booking booking = bookingOpt.get();
            
            // Force initialization of lazy-loaded collections
            if (booking.getSeatBookings() != null) {
                System.out.println("Booking has " + booking.getSeatBookings().size() + " seat bookings");
            }
            
            if (booking.getUser() != null) {
                System.out.println("Booking has user ID: " + booking.getUser().getId());
            }
            
            if (booking.getShowSchedule() != null) {
                System.out.println("Booking has show schedule ID: " + booking.getShowSchedule().getId());
                
                if (booking.getShowSchedule().getShow() != null) {
                    System.out.println("Show schedule has show ID: " + booking.getShowSchedule().getShow().getId());
                }
            }
        } else {
            System.out.println("Booking not found with ID: " + id);
        }
        
        return bookingOpt;
    }

    @Override
    public Optional<Booking> getBookingByNumber(String bookingNumber) {
        System.out.println("Getting booking by number: " + bookingNumber);
        
        // Try to get the booking with all details
        Optional<Booking> bookingOpt = bookingRepository.findByBookingNumberWithDetails(bookingNumber);
        
        // If not found with details, try the standard findByBookingNumber
        if (!bookingOpt.isPresent()) {
            System.out.println("Booking not found with details, trying standard findByBookingNumber");
            bookingOpt = bookingRepository.findByBookingNumber(bookingNumber);
        }
        
        if (bookingOpt.isPresent()) {
            System.out.println("Found booking with number: " + bookingNumber);
        } else {
            System.out.println("Booking not found with number: " + bookingNumber);
        }
        
        return bookingOpt;
    }

    @Override
    public List<Booking> getBookingsByUserId(Long userId) {
        System.out.println("BookingServiceImpl: Getting bookings for user ID: " + userId);
        List<Booking> bookings = bookingRepository.findByUserId(userId);
        System.out.println("BookingServiceImpl: Found " + bookings.size() + " bookings");
        return bookings;
    }

    @Override
    public List<Booking> getBookingsByShowScheduleId(Long showScheduleId) {
        return bookingRepository.findByShowScheduleId(showScheduleId);
    }

    @Override
    public List<Booking> getBookingsByStatus(BookingStatus status) {
        return bookingRepository.findByStatus(status);
    }

    @Override
    public List<Booking> getRecentBookingsByUserId(Long userId, LocalDateTime fromDate) {
        return bookingRepository.findRecentBookingsByUserId(userId, fromDate);
    }

    @Override
    public List<Booking> getBookingsByShowId(Long showId) {
        return bookingRepository.findBookingsByShowId(showId);
    }

    @Override
    public Long countConfirmedBookingsByShowScheduleId(Long showScheduleId) {
        return bookingRepository.countConfirmedBookingsByShowScheduleId(showScheduleId);
    }

    @Override
    @Transactional
    public Booking createBooking(User user, ShowSchedule showSchedule, List<Seat> seats) {
        // Call the overloaded method with null totalAmount to calculate it
        return createBooking(user, showSchedule, seats, null);
    }
    
    @Override
    @Transactional
    public Booking createBooking(User user, ShowSchedule showSchedule, List<Seat> seats, BigDecimal totalAmount) {
        System.out.println("Creating booking for user ID: " + user.getId() + ", schedule ID: " + showSchedule.getId());
        
        // Ensure we have fresh entities from the database
        User freshUser = userRepository.findById(user.getId())
            .orElseThrow(() -> new RuntimeException("User not found with ID: " + user.getId()));
        
        ShowSchedule freshSchedule = showScheduleRepository.findById(showSchedule.getId())
            .orElseThrow(() -> new RuntimeException("Show schedule not found with ID: " + showSchedule.getId()));
        
        // Create a new booking
        Booking booking = new Booking();
        booking.setUser(freshUser);
        booking.setShowSchedule(freshSchedule);
        booking.setBookingNumber(generateBookingNumber());
        booking.setStatus(BookingStatus.CONFIRMED); // Set status to CONFIRMED (changed from PENDING)
        booking.setBookingDate(LocalDateTime.now());
        booking.setCreatedAt(LocalDateTime.now());
        booking.setUpdatedAt(LocalDateTime.now());
        booking.setSeatBookings(new ArrayList<>());
        booking.setPayments(new ArrayList<>());
        
        // If totalAmount was provided, use it; otherwise calculate it
        if (totalAmount != null && totalAmount.compareTo(BigDecimal.ZERO) > 0) {
            System.out.println("Using provided totalAmount: " + totalAmount);
            booking.setTotalAmount(totalAmount);
        } else {
            // Calculate total amount
            BigDecimal calculatedTotalAmount = BigDecimal.ZERO;
            booking.setTotalAmount(calculatedTotalAmount);
            System.out.println("Using calculated totalAmount: " + calculatedTotalAmount);
        }
        
        // Save the booking first to get an ID
        Booking savedBooking = bookingRepository.save(booking);
        bookingRepository.flush(); // Ensure it's persisted immediately
        System.out.println("Saved booking with ID: " + savedBooking.getId() + ", Number: " + savedBooking.getBookingNumber());
        
        // Calculate total amount if not provided
        BigDecimal calculatedTotalAmount = BigDecimal.ZERO;
        
        // Create seat bookings and add them directly to the booking's collection
        for (Seat seat : seats) {
            // Get a fresh copy of the seat from the database
            Seat freshSeat = seatRepository.findById(seat.getId())
                .orElseThrow(() -> new RuntimeException("Seat not found with ID: " + seat.getId()));
            
            SeatBooking seatBooking = new SeatBooking();
            seatBooking.setBooking(savedBooking);
            seatBooking.setSeat(freshSeat);
            
            // Calculate seat price based on base price and seat category multiplier
            BigDecimal seatPrice = freshSchedule.getBasePrice().multiply(freshSeat.getPriceMultiplier());
            seatBooking.setPrice(seatPrice);
            
            // Add to calculated total amount
            calculatedTotalAmount = calculatedTotalAmount.add(seatPrice);
            
            // Add to the booking's collection (this is important for Hibernate's cascade)
            savedBooking.getSeatBookings().add(seatBooking);
            
            // Save seat booking
            seatBookingRepository.save(seatBooking);
            System.out.println("Saved seat booking for seat ID: " + freshSeat.getId() + " with price: " + seatPrice);
        }
        
        // If totalAmount wasn't provided, use the calculated one
        if (totalAmount == null || totalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            totalAmount = calculatedTotalAmount;
        }
        
        // Update total amount
        savedBooking.setTotalAmount(totalAmount);
        
        // Save the updated booking
        bookingRepository.save(savedBooking); // No need for saveAndFlush here
        System.out.println("Updated booking with total amount: " + totalAmount);
        
        // Verify the booking was saved correctly - use the detailed query to ensure all relationships are loaded
        Optional<Booking> verifiedBooking = bookingRepository.findBookingWithDetailsById(savedBooking.getId());
        
        // If not found with details, try the standard findById
        if (!verifiedBooking.isPresent()) {
            System.out.println("Booking not found with details, trying standard findById");
            verifiedBooking = bookingRepository.findById(savedBooking.getId());
        }
        
        if (verifiedBooking.isPresent()) {
            System.out.println("Successfully verified booking with ID: " + savedBooking.getId());
            
            // Verify the user relationship
            User bookingUser = verifiedBooking.get().getUser();
            if (bookingUser != null) {
                System.out.println("Booking has user ID: " + bookingUser.getId());
                System.out.println("User details: " + bookingUser.getUsername() + ", " + bookingUser.getEmail());
            } else {
                System.out.println("WARNING: Booking has no user associated with it!");
                
                // Try to fix the missing user relationship
                try {
                    Booking bookingToFix = verifiedBooking.get();
                    bookingToFix.setUser(freshUser);
                    bookingRepository.saveAndFlush(bookingToFix);
                    System.out.println("Fixed missing user relationship for booking ID: " + bookingToFix.getId());
                } catch (Exception e) {
                    System.out.println("Error fixing missing user relationship: " + e.getMessage());
                }
            }
            
            // Verify the show schedule relationship
            ShowSchedule bookingSchedule = verifiedBooking.get().getShowSchedule();
            if (bookingSchedule != null) {
                System.out.println("Booking has show schedule ID: " + bookingSchedule.getId());
                if (bookingSchedule.getShow() != null) {
                    System.out.println("Show details: " + bookingSchedule.getShow().getTitle());
                }
                if (bookingSchedule.getVenue() != null) {
                    System.out.println("Venue details: " + bookingSchedule.getVenue().getName());
                }
            } else {
                System.out.println("WARNING: Booking has no show schedule associated with it!");
                
                // Try to fix the missing show schedule relationship
                try {
                    Booking bookingToFix = verifiedBooking.get();
                    bookingToFix.setShowSchedule(freshSchedule);
                    bookingRepository.saveAndFlush(bookingToFix);
                    System.out.println("Fixed missing show schedule relationship for booking ID: " + bookingToFix.getId());
                } catch (Exception e) {
                    System.out.println("Error fixing missing show schedule relationship: " + e.getMessage());
                }
            }
            
            // Verify the seat bookings
            List<SeatBooking> verifiedSeatBookings = verifiedBooking.get().getSeatBookings();
            if (verifiedSeatBookings != null && !verifiedSeatBookings.isEmpty()) {
                System.out.println("Booking has " + verifiedSeatBookings.size() + " seat bookings");
                for (SeatBooking sb : verifiedSeatBookings) {
                    System.out.println("Seat booking ID: " + sb.getId() + ", Seat ID: " + 
                                      (sb.getSeat() != null ? sb.getSeat().getId() : "null") + 
                                      ", Price: " + sb.getPrice());
                }
                
                // Verify all seat bookings have the correct booking reference
                boolean allSeatBookingsValid = true;
                for (SeatBooking sb : verifiedSeatBookings) {
                    if (sb.getBooking() == null || !sb.getBooking().getId().equals(savedBooking.getId())) {
                        allSeatBookingsValid = false;
                        System.out.println("WARNING: Seat booking ID " + sb.getId() + " has invalid booking reference");
                        
                        // Try to fix the invalid booking reference
                        try {
                            sb.setBooking(savedBooking);
                            seatBookingRepository.saveAndFlush(sb);
                            System.out.println("Fixed invalid booking reference for seat booking ID: " + sb.getId());
                        } catch (Exception e) {
                            System.out.println("Error fixing invalid booking reference: " + e.getMessage());
                        }
                    }
                }
                
                if (allSeatBookingsValid) {
                    System.out.println("All seat bookings have valid booking references");
                }
            } else {
                System.out.println("WARNING: Booking has no seat bookings associated with it!");
                
                // Try to fix the missing seat bookings
                try {
                    Booking bookingToFix = verifiedBooking.get();
                    // Initialize with a new empty ArrayList if seat bookings are missing
                    bookingToFix.setSeatBookings(new ArrayList<>());
                    bookingRepository.saveAndFlush(bookingToFix);
                    System.out.println("Fixed missing seat bookings for booking ID: " + bookingToFix.getId());
                } catch (Exception e) {
                    System.out.println("Error fixing missing seat bookings: " + e.getMessage());
                }
            }
            
            // Verify we can find the booking by user ID
            List<Booking> userBookings = bookingRepository.findByUserId(freshUser.getId());
            System.out.println("Found " + userBookings.size() + " bookings for user ID: " + freshUser.getId());
            
            // Verify we can find the booking by booking number
            Optional<Booking> bookingByNumber = bookingRepository.findByBookingNumber(savedBooking.getBookingNumber());
            if (bookingByNumber.isPresent()) {
                System.out.println("Successfully found booking by number: " + savedBooking.getBookingNumber());
            } else {
                System.out.println("WARNING: Could not find booking by number: " + savedBooking.getBookingNumber());
                
                // Try to fix the missing booking number
                try {
                    Booking bookingToFix = verifiedBooking.get();
                    bookingToFix.setBookingNumber(savedBooking.getBookingNumber());
                    bookingRepository.saveAndFlush(bookingToFix);
                    System.out.println("Fixed missing booking number for booking ID: " + bookingToFix.getId());
                } catch (Exception e) {
                    System.out.println("Error fixing missing booking number: " + e.getMessage());
                }
            }
            
            // Create a booking confirmation notification
            try {
                Booking confirmedBooking = verifiedBooking.get();
                String showTitle = confirmedBooking.getShowSchedule().getShow().getTitle();
                String venueName = confirmedBooking.getShowSchedule().getVenue().getName();
                String showDate = confirmedBooking.getShowSchedule().getShowDate().toString();
                String showTime = confirmedBooking.getShowSchedule().getStartTime().toString();
                
                // Create notification title
                String notificationTitle = "Booking Confirmed: " + showTitle;
                
                // Create notification message
                StringBuilder message = new StringBuilder();
                message.append("Your booking for ").append(showTitle)
                      .append(" at ").append(venueName)
                      .append(" on ").append(showDate)
                      .append(" at ").append(showTime)
                      .append(" has been confirmed.");
                
                message.append("\n\nBooking Number: ").append(confirmedBooking.getBookingNumber());
                message.append("\nTotal Amount: ₹").append(confirmedBooking.getTotalAmount());
                message.append("\nSeats: ");
                
                // Add seat details
                for (SeatBooking sb : confirmedBooking.getSeatBookings()) {
                    if (sb.getSeat() != null) {
                        message.append(sb.getSeat().getRowName())
                              .append(sb.getSeat().getSeatNumber())
                              .append(" (").append(sb.getSeat().getCategory()).append("), ");
                    }
                }
                
                // Remove trailing comma and space
                if (message.toString().endsWith(", ")) {
                    message.setLength(message.length() - 2);
                }
                
                // Create the notification
                notificationService.createNotification(
                    confirmedBooking.getUser(),
                    notificationTitle,
                    message.toString(),
                    NotificationType.BOOKING,
                    confirmedBooking.getId(),
                    "BOOKING"
                );
                
                System.out.println("Created booking confirmation notification for user ID: " + confirmedBooking.getUser().getId());
            } catch (Exception e) {
                System.out.println("Error creating booking confirmation notification: " + e.getMessage());
                e.printStackTrace();
            }
            
            // Synchronize seat counts to ensure consistency
            try {
                Long scheduleId = freshSchedule.getId();
                System.out.println("Synchronizing seat counts after booking creation for schedule ID: " + scheduleId);
                seatConsistencyService.synchronizeSeatsForSchedule(scheduleId);
                
                // Invalidate the seat map cache for this show schedule
                Long showId = freshSchedule.getShow().getId();
                seatMapService.invalidateSeatMapCache(showId, scheduleId);
                System.out.println("Invalidated seat map cache for show ID: " + showId + ", schedule ID: " + scheduleId);
            } catch (Exception e) {
                System.out.println("Error during post-booking synchronization: " + e.getMessage());
                e.printStackTrace();
            }
            
            // Return the verified booking to ensure we have the most up-to-date version
            return verifiedBooking.get();
        } else {
            System.out.println("WARNING: Could not verify booking with ID: " + savedBooking.getId());
            
            // Try to retrieve the booking one more time after a short delay
            try {
                Thread.sleep(500); // Wait for 500ms to allow any pending transactions to complete
                Optional<Booking> retryBooking = bookingRepository.findById(savedBooking.getId());
                if (retryBooking.isPresent()) {
                    System.out.println("Successfully retrieved booking after retry with ID: " + savedBooking.getId());
                    return retryBooking.get();
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                System.out.println("Interrupted while waiting to retry booking retrieval");
            }
        }
        
        return savedBooking;
    }

    @Override
    @Transactional
    public Booking createBookingWithPromotion(User user, ShowSchedule showSchedule, List<Seat> seats, 
                                            BigDecimal totalAmount, String promotionCode) {
        System.out.println("Creating booking with promotion for user: " + user.getUsername() + 
                          ", schedule: " + showSchedule.getId() + ", promotion: " + promotionCode);
        
        // First create the booking without promotion
        Booking booking = createBooking(user, showSchedule, seats, totalAmount);
        
        // Apply promotion if provided
        if (promotionCode != null && !promotionCode.trim().isEmpty()) {
            try {
                // Validate and get promotion
                Optional<com.showvault.model.Promotion> promotionOpt = 
                    promotionService.getPromotionByCode(promotionCode);
                
                if (promotionOpt.isPresent() && promotionService.validatePromotion(promotionCode)) {
                    com.showvault.model.Promotion promotion = promotionOpt.get();
                    
                    // Calculate discount
                    double discountAmount = promotionService.calculateDiscountAmount(
                        promotionCode, booking.getTotalAmount().doubleValue());
                    
                    if (discountAmount > 0) {
                        // Store original amount
                        booking.setOriginalAmount(booking.getTotalAmount());
                        
                        // Apply discount
                        BigDecimal discount = BigDecimal.valueOf(discountAmount);
                        BigDecimal newTotal = booking.getTotalAmount().subtract(discount);
                        
                        // Ensure total doesn't go below zero
                        if (newTotal.compareTo(BigDecimal.ZERO) < 0) {
                            newTotal = BigDecimal.ZERO;
                            discount = booking.getTotalAmount();
                        }
                        
                        booking.setTotalAmount(newTotal);
                        booking.setDiscountAmount(discount);
                        booking.setPromotionCode(promotionCode);
                        booking.setPromotion(promotion);
                        
                        // Use the promotion
                        promotionService.usePromotion(promotionCode);
                        
                        // Save updated booking
                        booking = bookingRepository.save(booking);
                        
                        System.out.println("Applied promotion " + promotionCode + 
                                         " with discount: " + discount + 
                                         ", new total: " + newTotal);
                    }
                } else {
                    System.out.println("Invalid or expired promotion code: " + promotionCode);
                }
            } catch (Exception e) {
                System.out.println("Error applying promotion: " + e.getMessage());
                e.printStackTrace();
                // Continue without promotion if there's an error
            }
        }
        
        return booking;
    }

    @Override
    @Transactional
    public Optional<Booking> updateBookingStatus(Long bookingId, BookingStatus newStatus) {
        System.out.println("Updating booking status for booking ID: " + bookingId + " to " + newStatus);
        
        // Use the repository method that fetches all details
        Optional<Booking> bookingOpt = bookingRepository.findBookingWithDetailsById(bookingId);
        
        // If not found with details, try the standard findById
        if (!bookingOpt.isPresent()) {
            System.out.println("Booking not found with details, trying standard findById");
            bookingOpt = bookingRepository.findById(bookingId);
        }
        
        if (bookingOpt.isPresent()) {
            Booking booking = bookingOpt.get();
            System.out.println("Current booking status: " + booking.getStatus());
            
            // Only update if the status is different
            if (booking.getStatus() != newStatus) {
                booking.setStatus(newStatus);
                System.out.println("Setting booking status to: " + newStatus);
                
                // Update the updated_at timestamp
                booking.setUpdatedAt(LocalDateTime.now());
                System.out.println("Updated timestamp: " + booking.getUpdatedAt());
                
                // Update the booking date if it's null
                if (booking.getBookingDate() == null) {
                    booking.setBookingDate(LocalDateTime.now());
                    System.out.println("Set booking date to: " + booking.getBookingDate());
                }
                
                // Save the booking with flush to ensure immediate persistence
                Booking savedBooking = bookingRepository.saveAndFlush(booking);
                System.out.println("Booking status updated successfully to: " + savedBooking.getStatus());
                
                // Clear the persistence context to ensure fresh data
                bookingRepository.flush();
                
                // Verify the booking was saved correctly with a fresh query
                Optional<Booking> verifiedBooking = bookingRepository.findById(bookingId);
                if (verifiedBooking.isPresent()) {
                    Booking verifiedBookingEntity = verifiedBooking.get();
                    System.out.println("Successfully verified booking status update: " + verifiedBookingEntity.getStatus());
                    
                    if (verifiedBookingEntity.getStatus() != newStatus) {
                        System.out.println("WARNING: Booking status verification failed. Expected " + newStatus + 
                                          " but got: " + verifiedBookingEntity.getStatus());
                        
                        // Try one more direct update using a native query if needed
                        try {
                            // This would be implemented in a real application with a native query
                            System.out.println("Attempting direct database update as fallback");
                            
                            // For now, just try saving again
                            verifiedBookingEntity.setStatus(newStatus);
                            verifiedBookingEntity.setUpdatedAt(LocalDateTime.now());
                            Booking reSavedBooking = bookingRepository.save(verifiedBookingEntity);
                            System.out.println("Re-saved booking with status: " + reSavedBooking.getStatus());
                            
                            // Return the re-saved booking
                            return Optional.of(reSavedBooking);
                        } catch (Exception e) {
                            System.out.println("Error in fallback update: " + e.getMessage());
                            // Continue with the original saved booking
                        }
                    }
                    
                    // Force initialization of lazy-loaded collections for debugging
                    if (verifiedBookingEntity.getSeatBookings() != null) {
                        System.out.println("Booking has " + verifiedBookingEntity.getSeatBookings().size() + " seat bookings");
                    }
                    
                    if (verifiedBookingEntity.getUser() != null) {
                        System.out.println("Booking has user ID: " + verifiedBookingEntity.getUser().getId());
                    }
                    
                    if (verifiedBookingEntity.getShowSchedule() != null) {
                        System.out.println("Booking has show schedule ID: " + verifiedBookingEntity.getShowSchedule().getId());
                        
                        // Invalidate the seat map cache for this show schedule
                        try {
                            Long showId = verifiedBookingEntity.getShowSchedule().getShow().getId();
                            Long scheduleId = verifiedBookingEntity.getShowSchedule().getId();
                            
                            // Synchronize seat counts to ensure consistency
                            System.out.println("Synchronizing seat counts after booking status update for schedule ID: " + scheduleId);
                            seatConsistencyService.synchronizeSeatsForSchedule(scheduleId);
                            
                            // Invalidate the seat map cache
                            seatMapService.invalidateSeatMapCache(showId, scheduleId);
                            System.out.println("Invalidated seat map cache for show ID: " + showId + ", schedule ID: " + scheduleId);
                        } catch (Exception e) {
                            System.out.println("Error during post-status-update synchronization: " + e.getMessage());
                            e.printStackTrace();
                        }
                    }
                } else {
                    System.out.println("WARNING: Could not verify booking status update for ID: " + bookingId);
                }
                
                return Optional.of(savedBooking);
            } else {
                System.out.println("Booking already has status " + newStatus + ", no update needed");
                return Optional.of(booking);
            }
        } else {
            System.out.println("Booking not found with ID: " + bookingId);
            return Optional.empty();
        }
    }

    @Override
    @Transactional
    public void deleteBooking(Long id) {
        bookingRepository.deleteById(id);
    }

    @Override
    public List<Booking> getBookingsWithFilters(int offset, int limit, String status, LocalDate date) {
        System.out.println("BookingServiceImpl: Getting bookings with filters:");
        System.out.println("Offset: " + offset);
        System.out.println("Limit: " + limit);
        System.out.println("Status: " + status);
        System.out.println("Date: " + date);
        
        // Fetch all bookings with eager loading of related entities
        List<Booking> allBookings = bookingRepository.findAll();
        System.out.println("Total bookings before filtering: " + allBookings.size());
        
        List<Booking> filteredBookings = new ArrayList<>();
        
        for (Booking booking : allBookings) {
            // Check if status matches (if provided)
            boolean statusMatch = true;
            if (status != null && !status.isEmpty()) {
                try {
                    BookingStatus requestedStatus = BookingStatus.valueOf(status);
                    statusMatch = booking.getStatus() == requestedStatus;
                    if (!statusMatch) {
                        System.out.println("Booking ID " + booking.getId() + " status " + booking.getStatus() + " doesn't match requested status " + requestedStatus);
                    }
                } catch (IllegalArgumentException e) {
                    // Invalid status provided, ignore this filter
                    statusMatch = true;
                    System.out.println("Invalid status provided: " + status + ", ignoring this filter");
                }
            }
            
            // Check if date matches (if provided)
            boolean dateMatch = true;
            if (date != null) {
                System.out.println("Checking date match for booking ID " + booking.getId());
                boolean createdAtMatch = false;
                boolean showDateMatch = false;
                
                // Check booking date (created_at)
                if (booking.getCreatedAt() != null) {
                    createdAtMatch = booking.getCreatedAt().toLocalDate().equals(date);
                    System.out.println("Booking created at: " + booking.getCreatedAt().toLocalDate() + ", requested date: " + date + ", match: " + createdAtMatch);
                } else {
                    System.out.println("Booking has no creation date");
                }
                
                // Check show date
                if (booking.getShowSchedule() != null && booking.getShowSchedule().getShowDate() != null) {
                    showDateMatch = booking.getShowSchedule().getShowDate().equals(date);
                    System.out.println("Show date: " + booking.getShowSchedule().getShowDate() + ", requested date: " + date + ", match: " + showDateMatch);
                } else {
                    System.out.println("Booking has no show date");
                }
                
                // Match if either date matches
                dateMatch = createdAtMatch || showDateMatch;
                System.out.println("Final date match for booking ID " + booking.getId() + ": " + dateMatch);
            }
            
            if (statusMatch && dateMatch) {
                // Ensure all necessary data is loaded
                enrichBookingData(booking);
                filteredBookings.add(booking);
            }
        }
        
        // Sort bookings by creation date (newest first)
        filteredBookings.sort((b1, b2) -> {
            if (b1.getCreatedAt() == null) return 1;
            if (b2.getCreatedAt() == null) return -1;
            return b2.getCreatedAt().compareTo(b1.getCreatedAt());
        });
        
        // Apply pagination
        int end = Math.min(offset + limit, filteredBookings.size());
        if (offset >= filteredBookings.size()) {
            return new ArrayList<>();
        }
        
        return filteredBookings.subList(offset, end);
    }
    
    /**
     * Enriches a booking with all necessary data for display
     */
    private void enrichBookingData(Booking booking) {
        // Ensure user data is loaded
        if (booking.getUser() != null && booking.getUser().getId() != null) {
            User user = userRepository.findById(booking.getUser().getId()).orElse(null);
            if (user != null) {
                booking.setUser(user);
            }
        }
        
        // Ensure show schedule data is loaded
        if (booking.getShowSchedule() != null && booking.getShowSchedule().getId() != null) {
            ShowSchedule schedule = showScheduleRepository.findById(booking.getShowSchedule().getId()).orElse(null);
            if (schedule != null) {
                booking.setShowSchedule(schedule);
            }
        }
        
        // Ensure seat bookings are loaded
        if (booking.getId() != null) {
            List<SeatBooking> seatBookings = seatBookingRepository.findByBookingId(booking.getId());
            if (seatBookings != null && !seatBookings.isEmpty()) {
                booking.setSeatBookings(seatBookings);
                
                // Ensure each seat in the seat bookings is fully loaded
                for (SeatBooking seatBooking : seatBookings) {
                    if (seatBooking.getSeat() != null && seatBooking.getSeat().getId() != null) {
                        Seat seat = seatRepository.findById(seatBooking.getSeat().getId()).orElse(null);
                        if (seat != null) {
                            seatBooking.setSeat(seat);
                        }
                    }
                }
            }
        }
    }

    @Override
    public long countBookingsWithFilters(String status, LocalDate date) {
        System.out.println("BookingServiceImpl: Counting bookings with filters:");
        System.out.println("Status: " + status);
        System.out.println("Date: " + date);
        
        List<Booking> allBookings = bookingRepository.findAll();
        System.out.println("Total bookings before filtering: " + allBookings.size());
        
        long count = 0;
        
        for (Booking booking : allBookings) {
            // Check if status matches (if provided)
            boolean statusMatch = true;
            if (status != null && !status.isEmpty()) {
                try {
                    BookingStatus requestedStatus = BookingStatus.valueOf(status);
                    statusMatch = booking.getStatus() == requestedStatus;
                } catch (IllegalArgumentException e) {
                    // Invalid status provided, ignore this filter
                    statusMatch = true;
                    System.out.println("Invalid status provided: " + status + ", ignoring this filter");
                }
            }
            
            // Check if date matches (if provided)
            boolean dateMatch = true;
            if (date != null) {
                System.out.println("Checking date match for booking ID " + booking.getId() + " in count method");
                boolean createdAtMatch = false;
                boolean showDateMatch = false;
                
                // Check booking date (created_at)
                if (booking.getCreatedAt() != null) {
                    createdAtMatch = booking.getCreatedAt().toLocalDate().equals(date);
                    System.out.println("Booking created at: " + booking.getCreatedAt().toLocalDate() + ", requested date: " + date + ", match: " + createdAtMatch);
                } else {
                    System.out.println("Booking has no creation date");
                }
                
                // Check show date
                if (booking.getShowSchedule() != null && booking.getShowSchedule().getShowDate() != null) {
                    showDateMatch = booking.getShowSchedule().getShowDate().equals(date);
                    System.out.println("Show date: " + booking.getShowSchedule().getShowDate() + ", requested date: " + date + ", match: " + showDateMatch);
                } else {
                    System.out.println("Booking has no show date");
                }
                
                // Match if either date matches
                dateMatch = createdAtMatch || showDateMatch;
                System.out.println("Final date match for booking ID " + booking.getId() + ": " + dateMatch);
            }
            
            if (statusMatch && dateMatch) {
                count++;
            }
        }
        
        return count;
    }

    @Override
    @Transactional
    public Optional<Booking> processRefund(Long bookingId) {
        Optional<Booking> bookingOpt = bookingRepository.findById(bookingId);
        
        if (bookingOpt.isPresent()) {
            Booking booking = bookingOpt.get();
            
            // Check if booking is eligible for refund
            if (booking.getStatus() == BookingStatus.CONFIRMED || booking.getStatus() == BookingStatus.PENDING) {
                // In a real implementation, this would process the refund through a payment gateway
                
                // Update booking status
                booking.setStatus(BookingStatus.REFUNDED);
                
                // Save updated booking
                return Optional.of(bookingRepository.save(booking));
            }
        }
        
        return Optional.empty();
    }
    
    private String generateBookingNumber() {
        // Generate a unique booking number in the format BK00001, BK00002, etc.
        // First, get the count of existing bookings
        long bookingCount = bookingRepository.count();
        // Add 1 to get the next number
        long nextNumber = bookingCount + 1;
        // Format as BK00001, BK00002, etc.
        return String.format("BK%05d", nextNumber);
    }
}