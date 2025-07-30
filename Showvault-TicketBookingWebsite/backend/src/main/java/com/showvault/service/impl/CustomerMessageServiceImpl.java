package com.showvault.service.impl;

import com.showvault.model.CustomerMessage;
import com.showvault.model.Show;
import com.showvault.model.User;
import com.showvault.repository.CustomerMessageRepository;
import com.showvault.repository.UserRepository;
import com.showvault.service.CustomerMessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class CustomerMessageServiceImpl implements CustomerMessageService {

    @Autowired
    private CustomerMessageRepository customerMessageRepository;
    
    @Autowired
    private UserRepository userRepository;

    @Override
    public List<CustomerMessage> getAllMessages() {
        return customerMessageRepository.findAll();
    }

    @Override
    public Optional<CustomerMessage> getMessageById(Long id) {
        return customerMessageRepository.findById(id);
    }

    @Override
    public List<CustomerMessage> getMessagesByUser(User user) {
        return customerMessageRepository.findByCreatedBy(user);
    }
    
    @Override
    public List<CustomerMessage> getMessagesByShow(Show show) {
        return customerMessageRepository.findByShow(show);
    }

    @Override
    public List<CustomerMessage> getMessagesByStatus(CustomerMessage.Status status) {
        return customerMessageRepository.findByStatus(status);
    }

    @Override
    @Transactional
    public CustomerMessage createMessage(CustomerMessage message) {
        // Set creation timestamp if not set
        if (message.getCreatedAt() == null) {
            message.setCreatedAt(LocalDateTime.now());
        }
        
        // Set default status if not set
        if (message.getStatus() == null) {
            message.setStatus(CustomerMessage.Status.DRAFT);
        }
        
        return customerMessageRepository.save(message);
    }

    @Override
    @Transactional
    public CustomerMessage updateMessage(CustomerMessage messageDetails) {
        if (messageDetails.getId() == null) {
            return null;
        }
        
        Optional<CustomerMessage> messageOpt = customerMessageRepository.findById(messageDetails.getId());
        
        if (messageOpt.isPresent()) {
            CustomerMessage message = messageOpt.get();
            
            // Update fields
            message.setSubject(messageDetails.getSubject());
            message.setContent(messageDetails.getContent());
            message.setRecipientType(messageDetails.getRecipientType());
            message.setRecipientFilter(messageDetails.getRecipientFilter());
            message.setStatus(messageDetails.getStatus());
            message.setScheduledFor(messageDetails.getScheduledFor());
            
            // Don't update createdAt, sentAt, or show
            
            return customerMessageRepository.save(message);
        }
        
        return null;
    }

    @Override
    @Transactional
    public boolean deleteMessage(Long id) {
        if (customerMessageRepository.existsById(id)) {
            customerMessageRepository.deleteById(id);
            return true;
        }
        return false;
    }

    @Override
    @Transactional
    public boolean sendMessage(Long id) {
        Optional<CustomerMessage> messageOpt = customerMessageRepository.findById(id);
        
        if (messageOpt.isPresent()) {
            CustomerMessage message = messageOpt.get();
            
            // Only send if in DRAFT or SCHEDULED status
            if (message.getStatus() == CustomerMessage.Status.DRAFT || 
                    message.getStatus() == CustomerMessage.Status.SCHEDULED) {
                
                // In a real implementation, this would send the message via email, SMS, etc.
                // For now, we'll just update the status
                
                message.setStatus(CustomerMessage.Status.SENT);
                message.setSentAt(LocalDateTime.now());
                
                customerMessageRepository.save(message);
                return true;
            }
        }
        
        return false;
    }

    @Override
    @Transactional
    public boolean scheduleMessage(Long id) {
        Optional<CustomerMessage> messageOpt = customerMessageRepository.findById(id);
        
        if (messageOpt.isPresent()) {
            CustomerMessage message = messageOpt.get();
            
            // Only schedule if in DRAFT status and has a scheduled time
            if (message.getStatus() == CustomerMessage.Status.DRAFT && message.getScheduledFor() != null) {
                message.setStatus(CustomerMessage.Status.SCHEDULED);
                
                customerMessageRepository.save(message);
                return true;
            }
        }
        
        return false;
    }

    public List<CustomerMessage> getScheduledMessages() {
        return customerMessageRepository.findByStatus(CustomerMessage.Status.SCHEDULED);
    }

    public List<CustomerMessage> getMessagesToSend() {
        LocalDateTime now = LocalDateTime.now();
        return customerMessageRepository.findMessagesReadyToSend(now);
    }

    @Override
    @Transactional
    public void processScheduledMessages() {
        List<CustomerMessage> messagesToSend = getMessagesToSend();
        
        for (CustomerMessage message : messagesToSend) {
            sendMessage(message.getId());
        }
    }
    
    @Override
    public int getRecipientCount(CustomerMessage message) {
        if (message == null) {
            return 0;
        }
        
        switch (message.getRecipientType()) {
            case ALL:
                return (int) userRepository.count();
                
            case TICKET_HOLDERS:
                if (message.getShow() != null) {
                    // In a real implementation, this would count users who have booked tickets for the show
                    // For now, we'll return a mock value
                    return 50;
                }
                return 0;
                
            case SPECIFIC:
                // In a real implementation, this would parse the recipient filter
                // For now, we'll return a mock value
                return 10;
                
            default:
                return 0;
        }
    }
}