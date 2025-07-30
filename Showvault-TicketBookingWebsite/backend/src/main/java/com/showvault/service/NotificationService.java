package com.showvault.service;

import com.showvault.model.Booking;
import com.showvault.model.Show;
import com.showvault.model.ShowSchedule;
import com.showvault.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

/**
 * Service for sending notifications to users about bookings and shows
 */
@Service
public class NotificationService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    
    /**
     * Send booking confirmation notification
     * @param booking The booking that was confirmed
     */
    public void sendBookingConfirmationNotification(Booking booking) {
        User user = booking.getUser();
        ShowSchedule schedule = booking.getShowSchedule();
        Show show = schedule.getShow();
        
        String subject = "Booking Confirmation: " + show.getTitle();
        
        StringBuilder message = new StringBuilder();
        message.append("Dear ").append(user.getFirstName()).append(",\n\n");
        message.append("Your booking has been confirmed!\n\n");
        message.append("Booking Details:\n");
        message.append("Booking Number: ").append(booking.getBookingNumber()).append("\n");
        message.append("Show: ").append(show.getTitle()).append("\n");
        message.append("Venue: ").append(schedule.getVenue().getName()).append("\n");
        message.append("Date: ").append(schedule.getShowDate().format(DATE_FORMATTER)).append("\n");
        message.append("Time: ").append(schedule.getStartTime().format(TIME_FORMATTER)).append("\n");
        message.append("Total Amount: $").append(booking.getTotalAmount()).append("\n\n");
        message.append("You can download your tickets from your account dashboard.\n\n");
        message.append("Thank you for using ShowVault!\n");
        message.append("The ShowVault Team");
        
        // In a real implementation, this would send an email or push notification
        // For now, we'll just log the notification
        System.out.println("Sending notification to " + user.getEmail());
        System.out.println("Subject: " + subject);
        System.out.println("Message: " + message.toString());
    }
    
    /**
     * Send booking cancellation notification
     * @param booking The booking that was cancelled
     */
    public void sendBookingCancellationNotification(Booking booking) {
        User user = booking.getUser();
        ShowSchedule schedule = booking.getShowSchedule();
        Show show = schedule.getShow();
        
        String subject = "Booking Cancellation: " + show.getTitle();
        
        StringBuilder message = new StringBuilder();
        message.append("Dear ").append(user.getFirstName()).append(",\n\n");
        message.append("Your booking has been cancelled.\n\n");
        message.append("Booking Details:\n");
        message.append("Booking Number: ").append(booking.getBookingNumber()).append("\n");
        message.append("Show: ").append(show.getTitle()).append("\n");
        message.append("Venue: ").append(schedule.getVenue().getName()).append("\n");
        message.append("Date: ").append(schedule.getShowDate().format(DATE_FORMATTER)).append("\n");
        message.append("Time: ").append(schedule.getStartTime().format(TIME_FORMATTER)).append("\n\n");
        message.append("If you have any questions, please contact our support team.\n\n");
        message.append("Thank you for using ShowVault!\n");
        message.append("The ShowVault Team");
        
        // In a real implementation, this would send an email or push notification
        // For now, we'll just log the notification
        System.out.println("Sending notification to " + user.getEmail());
        System.out.println("Subject: " + subject);
        System.out.println("Message: " + message.toString());
    }
    
    /**
     * Send refund notification
     * @param booking The booking that was refunded
     * @param amount The refund amount
     */
    public void sendRefundNotification(Booking booking, String amount) {
        User user = booking.getUser();
        ShowSchedule schedule = booking.getShowSchedule();
        Show show = schedule.getShow();
        
        String subject = "Refund Processed: " + show.getTitle();
        
        StringBuilder message = new StringBuilder();
        message.append("Dear ").append(user.getFirstName()).append(",\n\n");
        message.append("Your refund has been processed.\n\n");
        message.append("Booking Details:\n");
        message.append("Booking Number: ").append(booking.getBookingNumber()).append("\n");
        message.append("Show: ").append(show.getTitle()).append("\n");
        message.append("Refund Amount: $").append(amount).append("\n\n");
        message.append("The refund should appear in your account within 5-7 business days.\n\n");
        message.append("Thank you for using ShowVault!\n");
        message.append("The ShowVault Team");
        
        // In a real implementation, this would send an email or push notification
        // For now, we'll just log the notification
        System.out.println("Sending notification to " + user.getEmail());
        System.out.println("Subject: " + subject);
        System.out.println("Message: " + message.toString());
    }
    
    /**
     * Send show schedule change notification
     * @param schedule The show schedule that was changed
     * @param oldDate The old date
     * @param oldTime The old time
     */
    public void sendShowScheduleChangeNotification(ShowSchedule schedule, String oldDate, String oldTime) {
        Show show = schedule.getShow();
        
        // In a real implementation, this would query all users with bookings for this schedule
        // and send them individual notifications
        String subject = "Schedule Change: " + show.getTitle();
        
        StringBuilder message = new StringBuilder();
        message.append("Dear Customer,\n\n");
        message.append("There has been a change to the schedule for a show you have booked.\n\n");
        message.append("Show: ").append(show.getTitle()).append("\n");
        message.append("Venue: ").append(schedule.getVenue().getName()).append("\n");
        message.append("Original Date: ").append(oldDate).append("\n");
        message.append("Original Time: ").append(oldTime).append("\n");
        message.append("New Date: ").append(schedule.getShowDate().format(DATE_FORMATTER)).append("\n");
        message.append("New Time: ").append(schedule.getStartTime().format(TIME_FORMATTER)).append("\n\n");
        message.append("If you cannot attend at the new time, please contact us to arrange a refund.\n\n");
        message.append("Thank you for your understanding.\n");
        message.append("The ShowVault Team");
        
        // In a real implementation, this would send an email or push notification to all affected users
        System.out.println("Sending schedule change notification to all affected users");
        System.out.println("Subject: " + subject);
        System.out.println("Message: " + message.toString());
    }
    
    /**
     * Send show cancellation notification
     * @param schedule The show schedule that was cancelled
     */
    public void sendShowCancellationNotification(ShowSchedule schedule) {
        Show show = schedule.getShow();
        
        // In a real implementation, this would query all users with bookings for this schedule
        // and send them individual notifications
        String subject = "Show Cancellation: " + show.getTitle();
        
        StringBuilder message = new StringBuilder();
        message.append("Dear Customer,\n\n");
        message.append("We regret to inform you that the following show has been cancelled:\n\n");
        message.append("Show: ").append(show.getTitle()).append("\n");
        message.append("Venue: ").append(schedule.getVenue().getName()).append("\n");
        message.append("Date: ").append(schedule.getShowDate().format(DATE_FORMATTER)).append("\n");
        message.append("Time: ").append(schedule.getStartTime().format(TIME_FORMATTER)).append("\n\n");
        message.append("A full refund will be processed automatically to your original payment method.\n");
        message.append("The refund should appear in your account within 5-7 business days.\n\n");
        message.append("We apologize for any inconvenience caused.\n");
        message.append("The ShowVault Team");
        
        // In a real implementation, this would send an email or push notification to all affected users
        System.out.println("Sending show cancellation notification to all affected users");
        System.out.println("Subject: " + subject);
        System.out.println("Message: " + message.toString());
    }
}