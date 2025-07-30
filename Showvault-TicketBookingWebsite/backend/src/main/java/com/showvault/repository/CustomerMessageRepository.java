package com.showvault.repository;

import com.showvault.model.CustomerMessage;
import com.showvault.model.Show;
import com.showvault.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CustomerMessageRepository extends JpaRepository<CustomerMessage, Long> {
    
    List<CustomerMessage> findByCreatedBy(User user);
    
    List<CustomerMessage> findByCreatedByOrderByCreatedAtDesc(User user);
    
    List<CustomerMessage> findByShow(Show show);
    
    List<CustomerMessage> findByStatus(CustomerMessage.Status status);
    
    @Query("SELECT m FROM CustomerMessage m WHERE m.status = 'SCHEDULED' AND m.scheduledFor <= ?1")
    List<CustomerMessage> findMessagesReadyToSend(LocalDateTime now);
    
    @Query("SELECT m FROM CustomerMessage m WHERE m.createdBy = ?1 AND m.status = ?2")
    List<CustomerMessage> findByCreatedByAndStatus(User user, CustomerMessage.Status status);
    
    @Query("SELECT m FROM CustomerMessage m WHERE m.show = ?1 AND m.status = ?2")
    List<CustomerMessage> findByShowAndStatus(Show show, CustomerMessage.Status status);
}