package com.showvault.controller;

import com.showvault.model.ConsolidatedNotification;
import com.showvault.model.NotificationType;
import com.showvault.model.User;
import com.showvault.security.services.UserDetailsImpl;
import com.showvault.service.ConsolidatedNotificationService;
import com.showvault.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * REST controller for managing notifications
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/notifications")
public class ConsolidatedNotificationController {

    @Autowired
    private ConsolidatedNotificationService notificationService;

    @Autowired
    private UserService userService;

    /**
     * Get all notifications for the current user
     * @return ResponseEntity containing the list of notifications
     */
    @GetMapping
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<List<ConsolidatedNotification>> getUserNotifications() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        if (userOpt.isPresent()) {
            List<ConsolidatedNotification> notifications = notificationService.getUserNotifications(userOpt.get());
            return new ResponseEntity<>(notifications, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Get paginated notifications for the current user
     * @param page Page number (0-based)
     * @param size Page size
     * @return ResponseEntity containing the page of notifications and pagination metadata
     */
    @GetMapping("/paged")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getUserNotificationsPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        if (userOpt.isPresent()) {
            Pageable pageable = PageRequest.of(page, size);
            Page<ConsolidatedNotification> notificationsPage = notificationService.getUserNotificationsPaged(userOpt.get(), pageable);
            
            Map<String, Object> response = new HashMap<>();
            response.put("notifications", notificationsPage.getContent());
            response.put("currentPage", notificationsPage.getNumber());
            response.put("totalItems", notificationsPage.getTotalElements());
            response.put("totalPages", notificationsPage.getTotalPages());
            
            return new ResponseEntity<>(response, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Get unread notifications for the current user
     * @return ResponseEntity containing the list of unread notifications
     */
    @GetMapping("/unread")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<List<ConsolidatedNotification>> getUnreadNotifications() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        if (userOpt.isPresent()) {
            List<ConsolidatedNotification> notifications = notificationService.getUnreadNotifications(userOpt.get());
            return new ResponseEntity<>(notifications, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Get count of unread notifications for the current user
     * @return ResponseEntity containing the count of unread notifications
     */
    @GetMapping("/unread/count")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        if (userOpt.isPresent()) {
            long count = notificationService.getUnreadCount(userOpt.get());
            Map<String, Long> response = Map.of("count", count);
            return new ResponseEntity<>(response, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Mark a notification as read
     * @param id The notification ID
     * @return ResponseEntity with HTTP status
     */
    @PutMapping("/{id}/read")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<HttpStatus> markAsRead(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<ConsolidatedNotification> notificationOpt = notificationService.getNotificationById(id);
        if (notificationOpt.isPresent()) {
            ConsolidatedNotification notification = notificationOpt.get();
            
            // Check if the notification belongs to the current user
            if (notification.getUser().getId().equals(userDetails.getId())) {
                boolean marked = notificationService.markAsRead(id);
                if (marked) {
                    return new ResponseEntity<>(HttpStatus.OK);
                } else {
                    return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
                }
            } else {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Mark all notifications as read for the current user
     * @return ResponseEntity containing the number of notifications marked as read
     */
    @PostMapping("/read-all")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, Integer>> markAllAsRead() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        if (userOpt.isPresent()) {
            int count = notificationService.markAllAsRead(userOpt.get());
            Map<String, Integer> response = Map.of("markedCount", count);
            return new ResponseEntity<>(response, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Delete a notification
     * @param id The notification ID
     * @return ResponseEntity with HTTP status
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<HttpStatus> deleteNotification(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<ConsolidatedNotification> notificationOpt = notificationService.getNotificationById(id);
        if (notificationOpt.isPresent()) {
            ConsolidatedNotification notification = notificationOpt.get();
            
            // Check if the notification belongs to the current user
            if (notification.getUser().getId().equals(userDetails.getId())) {
                boolean deleted = notificationService.deleteNotification(id);
                if (deleted) {
                    return new ResponseEntity<>(HttpStatus.NO_CONTENT);
                } else {
                    return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
                }
            } else {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Delete all read notifications for the current user
     * @return ResponseEntity containing the number of notifications deleted
     */
    @DeleteMapping("/read")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, Integer>> deleteAllReadNotifications() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        if (userOpt.isPresent()) {
            int count = notificationService.deleteAllReadNotifications(userOpt.get());
            Map<String, Integer> response = Map.of("deletedCount", count);
            return new ResponseEntity<>(response, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    /**
     * Get notifications by type for the current user
     * @param type The notification type
     * @return ResponseEntity containing the list of notifications
     */
    @GetMapping("/type/{type}")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<List<ConsolidatedNotification>> getNotificationsByType(
            @PathVariable NotificationType type) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        if (userOpt.isPresent()) {
            List<ConsolidatedNotification> notifications = notificationService.getNotificationsByType(userOpt.get(), type);
            return new ResponseEntity<>(notifications, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }
    
    /**
     * Get notifications by type and read status for the current user
     * @param type The notification type
     * @param read The read status
     * @return ResponseEntity containing the list of notifications
     */
    @GetMapping("/type/{type}/read/{read}")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<List<ConsolidatedNotification>> getNotificationsByTypeAndReadStatus(
            @PathVariable NotificationType type,
            @PathVariable boolean read) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        if (userOpt.isPresent()) {
            List<ConsolidatedNotification> notifications = notificationService.getNotificationsByTypeAndReadStatus(
                userOpt.get(), type, read);
            return new ResponseEntity<>(notifications, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }
    
    /**
     * Get count of notifications by type and read status for the current user
     * @param type The notification type
     * @param read The read status
     * @return ResponseEntity containing the count of notifications
     */
    @GetMapping("/type/{type}/read/{read}/count")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, Long>> getNotificationCountByTypeAndReadStatus(
            @PathVariable NotificationType type,
            @PathVariable boolean read) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        if (userOpt.isPresent()) {
            long count = notificationService.countByTypeAndReadStatus(userOpt.get(), type, read);
            Map<String, Long> response = Map.of("count", count);
            return new ResponseEntity<>(response, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }
}