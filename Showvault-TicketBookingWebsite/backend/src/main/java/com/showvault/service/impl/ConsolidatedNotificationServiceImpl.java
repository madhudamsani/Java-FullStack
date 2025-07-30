package com.showvault.service.impl;

import com.showvault.model.Booking;
import com.showvault.model.ConsolidatedNotification;
import com.showvault.model.NotificationType;
import com.showvault.model.Show;
import com.showvault.model.ShowSchedule;
import com.showvault.model.User;
import com.showvault.repository.BookingRepository;
import com.showvault.repository.ConsolidatedNotificationRepository;
import com.showvault.repository.ShowScheduleRepository;
import com.showvault.service.ConsolidatedNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

/**
 * Implementation of the ConsolidatedNotificationService interface
 */
@Service
public class ConsolidatedNotificationServiceImpl implements ConsolidatedNotificationService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    @Autowired
    private ConsolidatedNotificationRepository notificationRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private ShowScheduleRepository showScheduleRepository;

    @Override
    public List<ConsolidatedNotification> getUserNotifications(User user) {
        return notificationRepository.findByUserOrderByCreatedAtDesc(user);
    }

    @Override
    public Page<ConsolidatedNotification> getUserNotificationsPaged(User user, Pageable pageable) {
        return notificationRepository.findByUserOrderByCreatedAtDesc(user, pageable);
    }

    @Override
    public List<ConsolidatedNotification> getUnreadNotifications(User user) {
        return notificationRepository.findByUserAndReadOrderByCreatedAtDesc(user, false);
    }

    @Override
    public long getUnreadCount(User user) {
        return notificationRepository.countByUserAndRead(user, false);
    }

    @Override
    public Optional<ConsolidatedNotification> getNotificationById(Long id) {
        return notificationRepository.findById(id);
    }

    @Override
    @Transactional
    public ConsolidatedNotification createNotification(ConsolidatedNotification notification) {
        return notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public ConsolidatedNotification createNotification(User user, String title, String message, 
                                                     NotificationType type) {
        ConsolidatedNotification notification = new ConsolidatedNotification(user, title, message, type);
        return notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public ConsolidatedNotification createNotification(User user, String title, String message, 
                                                     NotificationType type, 
                                                     Long relatedId, String relatedType) {
        ConsolidatedNotification notification = new ConsolidatedNotification(user, title, message, type);
        notification.setRelatedId(relatedId);
        notification.setRelatedType(relatedType);
        return notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public boolean markAsRead(Long id) {
        Optional<ConsolidatedNotification> notificationOpt = notificationRepository.findById(id);
        if (notificationOpt.isPresent()) {
            ConsolidatedNotification notification = notificationOpt.get();
            notification.markAsRead();
            notificationRepository.save(notification);
            return true;
        }
        return false;
    }

    @Override
    @Transactional
    public int markAllAsRead(User user) {
        return notificationRepository.markAllAsRead(user);
    }

    @Override
    @Transactional
    public boolean deleteNotification(Long id) {
        if (notificationRepository.existsById(id)) {
            notificationRepository.deleteById(id);
            return true;
        }
        return false;
    }

    @Override
    @Transactional
    public int deleteAllReadNotifications(User user) {
        return notificationRepository.deleteAllReadNotifications(user);
    }

    @Override
    public List<ConsolidatedNotification> getNotificationsByType(User user, NotificationType type) {
        return notificationRepository.findByUserAndTypeOrderByCreatedAtDesc(user, type);
    }

    @Override
    public List<ConsolidatedNotification> getNotificationsByRelatedEntity(Long relatedId, String relatedType) {
        return notificationRepository.findByRelatedIdAndRelatedType(relatedId, relatedType);
    }
    
    @Override
    public List<ConsolidatedNotification> getNotificationsByTypeAndReadStatus(User user, NotificationType type, boolean read) {
        return notificationRepository.findByUserAndTypeAndReadOrderByCreatedAtDesc(user, type, read);
    }
    
    @Override
    public long countByTypeAndReadStatus(User user, NotificationType type, boolean read) {
        return notificationRepository.countByUserAndTypeAndRead(user, type, read);
    }

    @Override
    @Transactional
    public void sendBookingConfirmationNotification(Long bookingId) {
        Optional<Booking> bookingOpt = bookingRepository.findById(bookingId);
        if (bookingOpt.isPresent()) {
            Booking booking = bookingOpt.get();
            User user = booking.getUser();
            ShowSchedule schedule = booking.getShowSchedule();
            Show show = schedule.getShow();
            
            String title = "Booking Confirmation: " + show.getTitle();
            
            StringBuilder message = new StringBuilder();
            message.append("Your booking has been confirmed!\n\n");
            message.append("Booking Details:\n");
            message.append("Booking Number: ").append(booking.getBookingNumber()).append("\n");
            message.append("Show: ").append(show.getTitle()).append("\n");
            message.append("Venue: ").append(schedule.getVenue().getName()).append("\n");
            message.append("Date: ").append(schedule.getShowDate().format(DATE_FORMATTER)).append("\n");
            message.append("Time: ").append(schedule.getStartTime().format(TIME_FORMATTER)).append("\n");
            message.append("Total Amount: $").append(booking.getTotalAmount()).append("\n\n");
            message.append("You can download your tickets from your account dashboard.");
            
            createNotification(user, title, message.toString(), 
                             NotificationType.BOOKING, 
                             booking.getId(), "BOOKING");
        }
    }

    @Override
    @Transactional
    public void sendBookingCancellationNotification(Long bookingId) {
        Optional<Booking> bookingOpt = bookingRepository.findById(bookingId);
        if (bookingOpt.isPresent()) {
            Booking booking = bookingOpt.get();
            User user = booking.getUser();
            ShowSchedule schedule = booking.getShowSchedule();
            Show show = schedule.getShow();
            
            String title = "Booking Cancellation: " + show.getTitle();
            
            StringBuilder message = new StringBuilder();
            message.append("Your booking has been cancelled.\n\n");
            message.append("Booking Details:\n");
            message.append("Booking Number: ").append(booking.getBookingNumber()).append("\n");
            message.append("Show: ").append(show.getTitle()).append("\n");
            message.append("Venue: ").append(schedule.getVenue().getName()).append("\n");
            message.append("Date: ").append(schedule.getShowDate().format(DATE_FORMATTER)).append("\n");
            message.append("Time: ").append(schedule.getStartTime().format(TIME_FORMATTER)).append("\n\n");
            message.append("If you have any questions, please contact our support team.");
            
            createNotification(user, title, message.toString(), 
                             NotificationType.CANCELLATION, 
                             booking.getId(), "BOOKING");
        }
    }

    @Override
    @Transactional
    public void sendRefundNotification(Long bookingId, String amount) {
        Optional<Booking> bookingOpt = bookingRepository.findById(bookingId);
        if (bookingOpt.isPresent()) {
            Booking booking = bookingOpt.get();
            User user = booking.getUser();
            ShowSchedule schedule = booking.getShowSchedule();
            Show show = schedule.getShow();
            
            String title = "Refund Processed: " + show.getTitle();
            
            StringBuilder message = new StringBuilder();
            message.append("Your refund has been processed.\n\n");
            message.append("Booking Details:\n");
            message.append("Booking Number: ").append(booking.getBookingNumber()).append("\n");
            message.append("Show: ").append(show.getTitle()).append("\n");
            message.append("Refund Amount: $").append(amount).append("\n\n");
            message.append("The refund should appear in your account within 5-7 business days.");
            
            createNotification(user, title, message.toString(), 
                             NotificationType.REFUND, 
                             booking.getId(), "BOOKING");
        }
    }

    @Override
    @Transactional
    public void sendShowScheduleChangeNotification(Long scheduleId, String oldDate, String oldTime) {
        Optional<ShowSchedule> scheduleOpt = showScheduleRepository.findById(scheduleId);
        if (scheduleOpt.isPresent()) {
            ShowSchedule schedule = scheduleOpt.get();
            Show show = schedule.getShow();
            
            // In a real implementation, this would query all users with bookings for this schedule
            // and send them individual notifications
            List<Booking> bookings = bookingRepository.findByShowSchedule(schedule);
            
            for (Booking booking : bookings) {
                User user = booking.getUser();
                
                String title = "Schedule Change: " + show.getTitle();
                
                StringBuilder message = new StringBuilder();
                message.append("There has been a change to the schedule for a show you have booked.\n\n");
                message.append("Show: ").append(show.getTitle()).append("\n");
                message.append("Venue: ").append(schedule.getVenue().getName()).append("\n");
                message.append("Original Date: ").append(oldDate).append("\n");
                message.append("Original Time: ").append(oldTime).append("\n");
                message.append("New Date: ").append(schedule.getShowDate().format(DATE_FORMATTER)).append("\n");
                message.append("New Time: ").append(schedule.getStartTime().format(TIME_FORMATTER)).append("\n\n");
                message.append("If you cannot attend at the new time, please contact us to arrange a refund.");
                
                createNotification(user, title, message.toString(), 
                                 NotificationType.SHOW_UPDATE, 
                                 schedule.getId(), "SCHEDULE");
            }
        }
    }

    @Override
    @Transactional
    public void sendShowCancellationNotification(Long scheduleId) {
        Optional<ShowSchedule> scheduleOpt = showScheduleRepository.findById(scheduleId);
        if (scheduleOpt.isPresent()) {
            ShowSchedule schedule = scheduleOpt.get();
            Show show = schedule.getShow();
            
            // In a real implementation, this would query all users with bookings for this schedule
            // and send them individual notifications
            List<Booking> bookings = bookingRepository.findByShowSchedule(schedule);
            
            for (Booking booking : bookings) {
                User user = booking.getUser();
                
                String title = "Show Cancellation: " + show.getTitle();
                
                StringBuilder message = new StringBuilder();
                message.append("We regret to inform you that the following show has been cancelled:\n\n");
                message.append("Show: ").append(show.getTitle()).append("\n");
                message.append("Venue: ").append(schedule.getVenue().getName()).append("\n");
                message.append("Date: ").append(schedule.getShowDate().format(DATE_FORMATTER)).append("\n");
                message.append("Time: ").append(schedule.getStartTime().format(TIME_FORMATTER)).append("\n\n");
                message.append("A full refund will be processed automatically to your original payment method.\n");
                message.append("The refund should appear in your account within 5-7 business days.");
                
                createNotification(user, title, message.toString(), 
                                 NotificationType.CANCELLATION, 
                                 schedule.getId(), "SCHEDULE");
            }
        }
    }
}