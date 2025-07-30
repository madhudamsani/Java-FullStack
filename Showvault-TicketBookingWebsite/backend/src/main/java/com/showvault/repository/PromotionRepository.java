package com.showvault.repository;

import com.showvault.model.Promotion;
import com.showvault.model.Show;
import com.showvault.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, Long> {
    
    List<Promotion> findByCreatedBy(User user);
    
    List<Promotion> findByShow(Show show);
    
    List<Promotion> findByStatus(Promotion.Status status);
    
    Optional<Promotion> findByCode(String code);
    
    boolean existsByCode(String code);
    
    @Query("SELECT p FROM Promotion p WHERE p.status = 'ACTIVE' AND p.startDate <= ?1 AND p.endDate >= ?1 AND p.currentUses < p.maxUses")
    List<Promotion> findActivePromotions(LocalDate date);
    
    @Query("SELECT p FROM Promotion p WHERE p.show = ?1 AND p.status = 'ACTIVE' AND p.startDate <= ?2 AND p.endDate >= ?2 AND p.currentUses < p.maxUses")
    List<Promotion> findActivePromotionsForShow(Show show, LocalDate date);
}