package com.showvault.controller;

import com.showvault.model.CustomerMessage;
import com.showvault.model.Show;
import com.showvault.model.User;
import com.showvault.security.services.UserDetailsImpl;
import com.showvault.service.CustomerMessageService;
import com.showvault.service.ShowService;
import com.showvault.service.UserService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/messages")
public class CustomerMessageController {

    @Autowired
    private CustomerMessageService customerMessageService;

    @Autowired
    private UserService userService;

    @Autowired
    private ShowService showService;

    @GetMapping
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<List<CustomerMessage>> getAllMessages() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // If admin, return all messages
        if (authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            List<CustomerMessage> messages = customerMessageService.getAllMessages();
            return new ResponseEntity<>(messages, HttpStatus.OK);
        } 
        // If organizer, return only their messages
        else {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Optional<User> userOpt = userService.getUserById(userDetails.getId());
            
            if (userOpt.isPresent()) {
                List<CustomerMessage> messages = customerMessageService.getMessagesByUser(userOpt.get());
                return new ResponseEntity<>(messages, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<CustomerMessage> getMessageById(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<CustomerMessage> messageOpt = customerMessageService.getMessageById(id);
        
        if (messageOpt.isPresent()) {
            CustomerMessage message = messageOpt.get();
            
            // Check if the message belongs to the current user or if the user is an admin
            if (message.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                return new ResponseEntity<>(message, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/show/{showId}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<List<CustomerMessage>> getMessagesByShow(@PathVariable Long showId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<Show> showOpt = showService.getShowById(showId);
        
        if (showOpt.isPresent()) {
            Show show = showOpt.get();
            
            // Check if the show belongs to the current user or if the user is an admin
            if (show.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                List<CustomerMessage> messages = customerMessageService.getMessagesByShow(show);
                return new ResponseEntity<>(messages, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<List<CustomerMessage>> getMessagesByStatus(
            @PathVariable CustomerMessage.Status status) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // If admin, return all messages with the given status
        if (authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            List<CustomerMessage> messages = customerMessageService.getMessagesByStatus(status);
            return new ResponseEntity<>(messages, HttpStatus.OK);
        } 
        // If organizer, filter by user and status
        else {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Optional<User> userOpt = userService.getUserById(userDetails.getId());
            
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                List<CustomerMessage> messages = customerMessageService.getMessagesByUser(user);
                
                // Filter by status
                messages = messages.stream()
                        .filter(m -> m.getStatus() == status)
                        .toList();
                
                return new ResponseEntity<>(messages, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> createMessage(@RequestBody CustomerMessage message) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            // Set the creator
            message.setCreatedBy(user);
            
            // If show ID is provided, validate and set the show
            if (message.getShow() != null && message.getShow().getId() != null) {
                Optional<Show> showOpt = showService.getShowById(message.getShow().getId());
                
                if (showOpt.isPresent()) {
                    Show show = showOpt.get();
                    
                    // Check if the show belongs to the current user or if the user is an admin
                    if (show.getCreatedBy().getId().equals(userDetails.getId()) || 
                            authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                        message.setShow(show);
                    } else {
                        return new ResponseEntity<>("You don't have permission to create messages for this show", HttpStatus.FORBIDDEN);
                    }
                } else {
                    return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
                }
            }
            
            // Calculate recipient count
            int recipientCount = customerMessageService.getRecipientCount(message);
            message.setRecipientCount(recipientCount);
            
            CustomerMessage newMessage = customerMessageService.createMessage(message);
            return new ResponseEntity<>(newMessage, HttpStatus.CREATED);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> updateMessage(@PathVariable Long id, @RequestBody CustomerMessage message) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<CustomerMessage> messageOpt = customerMessageService.getMessageById(id);
        
        if (messageOpt.isPresent()) {
            CustomerMessage existingMessage = messageOpt.get();
            
            // Check if the message belongs to the current user or if the user is an admin
            if (existingMessage.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                // Check if the message can be updated (not sent)
                if (existingMessage.getStatus() == CustomerMessage.Status.SENT) {
                    return new ResponseEntity<>("Cannot update a sent message", HttpStatus.BAD_REQUEST);
                }
                
                // Set the ID and creator
                message.setId(id);
                message.setCreatedBy(existingMessage.getCreatedBy());
                message.setCreatedAt(existingMessage.getCreatedAt());
                
                // If show ID is provided, validate and set the show
                if (message.getShow() != null && message.getShow().getId() != null) {
                    Optional<Show> showOpt = showService.getShowById(message.getShow().getId());
                    
                    if (showOpt.isPresent()) {
                        Show show = showOpt.get();
                        
                        // Check if the show belongs to the current user or if the user is an admin
                        if (show.getCreatedBy().getId().equals(userDetails.getId()) || 
                                authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                            message.setShow(show);
                        } else {
                            return new ResponseEntity<>("You don't have permission to create messages for this show", HttpStatus.FORBIDDEN);
                        }
                    } else {
                        return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
                    }
                }
                
                // Calculate recipient count
                int recipientCount = customerMessageService.getRecipientCount(message);
                message.setRecipientCount(recipientCount);
                
                CustomerMessage updatedMessage = customerMessageService.updateMessage(message);
                return new ResponseEntity<>(updatedMessage, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> deleteMessage(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<CustomerMessage> messageOpt = customerMessageService.getMessageById(id);
        
        if (messageOpt.isPresent()) {
            CustomerMessage message = messageOpt.get();
            
            // Check if the message belongs to the current user or if the user is an admin
            if (message.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                boolean deleted = customerMessageService.deleteMessage(id);
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

    @PostMapping("/{id}/send")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> sendMessage(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<CustomerMessage> messageOpt = customerMessageService.getMessageById(id);
        
        if (messageOpt.isPresent()) {
            CustomerMessage message = messageOpt.get();
            
            // Check if the message belongs to the current user or if the user is an admin
            if (message.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                // Check if the message can be sent (not already sent)
                if (message.getStatus() == CustomerMessage.Status.SENT) {
                    return new ResponseEntity<>("Message has already been sent", HttpStatus.BAD_REQUEST);
                }
                
                boolean sent = customerMessageService.sendMessage(id);
                if (sent) {
                    return new ResponseEntity<>(HttpStatus.OK);
                } else {
                    return new ResponseEntity<>("Failed to send message", HttpStatus.INTERNAL_SERVER_ERROR);
                }
            } else {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping("/{id}/schedule")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> scheduleMessage(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<CustomerMessage> messageOpt = customerMessageService.getMessageById(id);
        
        if (messageOpt.isPresent()) {
            CustomerMessage message = messageOpt.get();
            
            // Check if the message belongs to the current user or if the user is an admin
            if (message.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                // Check if the message can be scheduled (not already sent)
                if (message.getStatus() == CustomerMessage.Status.SENT) {
                    return new ResponseEntity<>("Message has already been sent", HttpStatus.BAD_REQUEST);
                }
                
                // Check if scheduled date is provided
                if (message.getScheduledFor() == null) {
                    return new ResponseEntity<>("Scheduled date is required", HttpStatus.BAD_REQUEST);
                }
                
                boolean scheduled = customerMessageService.scheduleMessage(id);
                if (scheduled) {
                    return new ResponseEntity<>(HttpStatus.OK);
                } else {
                    return new ResponseEntity<>("Failed to schedule message", HttpStatus.INTERNAL_SERVER_ERROR);
                }
            } else {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }
}