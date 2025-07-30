package com.showvault.service;

import com.showvault.model.*;
import com.showvault.repository.BookingRepository;
import com.showvault.repository.NotificationRepository;
import com.showvault.repository.UserNotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Service for handling show cancellations, including notifications and refunds
 */
@Service
public class ShowCancellationService {

    private final BookingRepository bookingRepository;
    private final NotificationRepository notificationRepository;
    private final UserNotificationRepository userNotificationRepository;
    private final EmailService emailService;

    @Autowired
    public ShowCancellationService(
            BookingRepository bookingRepository,
            NotificationRepository notificationRepository,
            UserNotificationRepository userNotificationRepository,
            EmailService emailService) {
        this.bookingRepository = bookingRepository;
        this.notificationRepository = notificationRepository;
        this.userNotificationRepository = userNotificationRepository;
        this.emailService = emailService;
    }

    /**
     * Process show cancellation - handle notifications and refunds
     * @param show The cancelled show
     * @param reason The reason for cancellation
     * @param cancelledById The ID of the user who cancelled the show
     * @return The number of bookings processed
     */
    @Transactional
    public int processShowCancellation(Show show, String reason, Long cancelledById) {
        if (show == null || show.getId() == null) {
            throw new IllegalArgumentException("Invalid show provided");
        }

        List<Booking> affectedBookings = findAffectedBookings(show);
        if (affectedBookings.isEmpty()) {
            return 0;
        }

        // Process each booking
        for (Booking booking : affectedBookings) {
            // 1. Update booking status
            booking.setStatus(BookingStatus.CANCELLED);
            bookingRepository.save(booking);

            // 2. Create notification for the user
            createUserNotification(booking, show, reason);

            // 3. Send email notification
            sendCancellationEmail(booking, show, reason);

            // 4. Process refund
            processRefund(booking);
        }

        return affectedBookings.size();
    }

    /**
     * Find all active bookings affected by a show cancellation
     * @param show The cancelled show
     * @return List of affected bookings
     */
    private List<Booking> findAffectedBookings(Show show) {
        List<Booking> affectedBookings = new ArrayList<>();

        if (show.getSchedules() != null) {
            for (ShowSchedule schedule : show.getSchedules()) {
                if (schedule.getBookings() != null) {
                    for (Booking booking : schedule.getBookings()) {
                        // Only include active bookings
                        if (booking.getStatus() == BookingStatus.CONFIRMED || 
                            booking.getStatus() == BookingStatus.PENDING) {
                            affectedBookings.add(booking);
                        }
                    }
                }
            }
        }

        return affectedBookings;
    }

    /**
     * Create a notification for the user about the show cancellation
     * @param booking The affected booking
     * @param show The cancelled show
     * @param reason The reason for cancellation
     */
    private void createUserNotification(Booking booking, Show show, String reason) {
        try {
            // Create notification
            Notification notification = new Notification();
            notification.setUser(booking.getUser());
            notification.setTitle("Show Cancelled: " + show.getTitle());
            notification.setMessage("We regret to inform you that the show '" + show.getTitle() + 
                                   "' has been cancelled. Reason: " + reason + 
                                   ". Your booking has been cancelled and a refund will be processed.");
            notification.setType(Notification.NotificationType.CANCELLATION);
            notification.setRelatedId(show.getId());
            notification.setRead(false);
            notification.setCreatedAt(LocalDateTime.now());
            
            notificationRepository.save(notification);
            
            // Also create a user notification for in-app display
            UserNotification userNotification = new UserNotification();
            userNotification.setUserId(booking.getUser().getId());
            userNotification.setTitle("Show Cancelled: " + show.getTitle());
            userNotification.setMessage("We regret to inform you that the show '" + show.getTitle() + 
                                      "' has been cancelled. Your booking has been cancelled and a refund will be processed.");
            userNotification.setType("CANCELLATION");
            userNotification.setIsRead(false);
            userNotification.setCreatedAt(LocalDateTime.now());
            
            userNotificationRepository.save(userNotification);
        } catch (Exception e) {
            // Log error but continue processing
            System.err.println("Error creating notification for booking " + booking.getId() + ": " + e.getMessage());
        }
    }

    /**
     * Send an email notification about the show cancellation
     * @param booking The affected booking
     * @param show The cancelled show
     * @param reason The reason for cancellation
     */
    private void sendCancellationEmail(Booking booking, Show show, String reason) {
        try {
            String subject = "Show Cancelled: " + show.getTitle();
            String content = "Dear " + booking.getUser().getFirstName() + ",\n\n" +
                            "We regret to inform you that the show '" + show.getTitle() + "' has been cancelled.\n\n" +
                            "Reason: " + reason + "\n\n" +
                            "Your booking (Booking #: " + booking.getBookingNumber() + ") has been cancelled and a refund of " +
                            booking.getTotalAmount() + " will be processed to your original payment method.\n\n" +
                            "We apologize for any inconvenience this may have caused.\n\n" +
                            "If you have any questions, please contact our customer support.\n\n" +
                            "Thank you for your understanding.\n\n" +
                            "Regards,\n" +
                            "ShowVault Team";
            
            emailService.sendEmail(booking.getUser().getEmail(), subject, content);
        } catch (Exception e) {
            // Log error but continue processing
            System.err.println("Error sending email for booking " + booking.getId() + ": " + e.getMessage());
        }
    }

    /**
     * Process refund for a cancelled booking
     * @param booking The booking to refund
     */
    private void processRefund(Booking booking) {
        try {
            // Create a refund payment record
            BookingPayment refundPayment = new BookingPayment();
            refundPayment.setBooking(booking);
            refundPayment.setAmount(booking.getTotalAmount().negate()); // Negative amount for refund
            refundPayment.setPaymentDate(LocalDateTime.now());
            refundPayment.setStatus(PaymentStatus.COMPLETED);
            refundPayment.setMethod(PaymentMethod.REFUND);
            refundPayment.setTransactionId("REF-" + System.currentTimeMillis());
            refundPayment.setNotes("Automatic refund for cancelled show");
            refundPayment.setCreatedAt(LocalDateTime.now());
            
            // Add to booking's payments
            if (booking.getPayments() == null) {
                booking.setPayments(new ArrayList<>());
            }
            booking.getPayments().add(refundPayment);
            
            // Update booking status
            booking.setStatus(BookingStatus.REFUNDED);
            
            // Save the booking with the new payment
            bookingRepository.save(booking);
            
            // In a real system, you would integrate with a payment gateway here
            // to process the actual refund to the customer's payment method
            System.out.println("Processed refund for booking " + booking.getId() + 
                              " amount: " + booking.getTotalAmount());
        } catch (Exception e) {
            // Log error but continue processing
            System.err.println("Error processing refund for booking " + booking.getId() + ": " + e.getMessage());
        }
    }
}