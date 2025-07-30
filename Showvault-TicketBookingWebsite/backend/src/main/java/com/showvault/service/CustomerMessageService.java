package com.showvault.service;

import com.showvault.model.CustomerMessage;
import com.showvault.model.Show;
import com.showvault.model.User;

import java.util.List;
import java.util.Optional;

public interface CustomerMessageService {
    
    List<CustomerMessage> getAllMessages();
    
    List<CustomerMessage> getMessagesByUser(User user);
    
    List<CustomerMessage> getMessagesByShow(Show show);
    
    List<CustomerMessage> getMessagesByStatus(CustomerMessage.Status status);
    
    Optional<CustomerMessage> getMessageById(Long id);
    
    CustomerMessage createMessage(CustomerMessage message);
    
    CustomerMessage updateMessage(CustomerMessage message);
    
    boolean deleteMessage(Long id);
    
    boolean sendMessage(Long id);
    
    boolean scheduleMessage(Long id);
    
    void processScheduledMessages();
    
    int getRecipientCount(CustomerMessage message);
}