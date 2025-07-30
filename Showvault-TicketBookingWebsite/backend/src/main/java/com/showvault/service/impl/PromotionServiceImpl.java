package com.showvault.service.impl;

import com.showvault.model.Booking;
import com.showvault.model.Promotion;
import com.showvault.model.Show;
import com.showvault.model.User;
import com.showvault.repository.BookingRepository;
import com.showvault.repository.PromotionRepository;
import com.showvault.service.PromotionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class PromotionServiceImpl implements PromotionService {

    @Autowired
    private PromotionRepository promotionRepository;
    
    @Autowired
    private BookingRepository bookingRepository;

    @Override
    public List<Promotion> getAllPromotions() {
        return promotionRepository.findAll();
    }

    @Override
    public List<Promotion> getPromotionsByUser(User user) {
        return promotionRepository.findByCreatedBy(user);
    }

    @Override
    public List<Promotion> getPromotionsByShow(Show show) {
        return promotionRepository.findByShow(show);
    }

    @Override
    public List<Promotion> getActivePromotions() {
        return promotionRepository.findActivePromotions(LocalDate.now());
    }

    @Override
    public List<Promotion> getActivePromotionsForShow(Show show) {
        return promotionRepository.findActivePromotionsForShow(show, LocalDate.now());
    }

    @Override
    public Optional<Promotion> getPromotionById(Long id) {
        return promotionRepository.findById(id);
    }

    @Override
    public Optional<Promotion> getPromotionByCode(String code) {
        return promotionRepository.findByCode(code);
    }

    @Override
    @Transactional
    public Promotion createPromotion(Promotion promotion) {
        // Generate a unique code if not provided
        if (promotion.getCode() == null || promotion.getCode().isEmpty()) {
            promotion.setCode(generateUniqueCode(8));
        }
        
        // Set creation timestamp if not set
        if (promotion.getCreatedAt() == null) {
            promotion.setCreatedAt(LocalDateTime.now());
        }
        
        // Set default status if not set
        if (promotion.getStatus() == null) {
            promotion.setStatus(Promotion.Status.ACTIVE);
        }
        
        // Initialize current uses if not set
        if (promotion.getCurrentUses() == null) {
            promotion.setCurrentUses(0);
        }
        
        return promotionRepository.save(promotion);
    }

    @Override
    @Transactional
    public Promotion updatePromotion(Promotion promotion) {
        if (promotion.getId() == null) {
            return null;
        }
        
        Optional<Promotion> existingPromotion = promotionRepository.findById(promotion.getId());
        if (!existingPromotion.isPresent()) {
            return null;
        }
        
        // Don't allow changing the code
        promotion.setCode(existingPromotion.get().getCode());
        
        // Don't change creation timestamp
        promotion.setCreatedAt(existingPromotion.get().getCreatedAt());
        
        // Update timestamp
        promotion.setUpdatedAt(LocalDateTime.now());
        
        return promotionRepository.save(promotion);
    }

    @Override
    @Transactional
    public boolean deletePromotion(Long id) {
        if (promotionRepository.existsById(id)) {
            promotionRepository.deleteById(id);
            return true;
        }
        return false;
    }

    @Override
    public boolean validatePromotion(String code) {
        Optional<Promotion> promotionOpt = promotionRepository.findByCode(code);
        
        if (promotionOpt.isPresent()) {
            Promotion promotion = promotionOpt.get();
            
            // Check if promotion is active
            if (promotion.getStatus() != Promotion.Status.ACTIVE) {
                return false;
            }
            
            // Check if promotion is within valid date range
            LocalDate today = LocalDate.now();
            if (promotion.getStartDate() != null && today.isBefore(promotion.getStartDate())) {
                return false;
            }
            if (promotion.getEndDate() != null && today.isAfter(promotion.getEndDate())) {
                return false;
            }
            
            // Check if promotion has reached max usage
            if (promotion.getMaxUses() != null && promotion.getCurrentUses() != null) {
                if (promotion.getCurrentUses() >= promotion.getMaxUses()) {
                    return false;
                }
            }
            
            return true;
        }
        
        return false;
    }

    @Override
    public double calculateDiscountAmount(String code, double originalPrice) {
        Optional<Promotion> promotionOpt = promotionRepository.findByCode(code);
        
        if (!promotionOpt.isPresent()) {
            return 0;
        }
        
        Promotion promotion = promotionOpt.get();
        
        // Validate the promotion first
        if (!validatePromotion(code)) {
            return 0;
        }
        
        // Calculate discount based on type
        if (promotion.getDiscountType() == Promotion.DiscountType.PERCENTAGE) {
            return originalPrice * (promotion.getDiscountValue() / 100.0);
        } else if (promotion.getDiscountType() == Promotion.DiscountType.FIXED) {
            return Math.min(promotion.getDiscountValue(), originalPrice);
        }
        
        return 0;
    }

    @Override
    @Transactional
    public boolean usePromotion(String code) {
        Optional<Promotion> promotionOpt = promotionRepository.findByCode(code);
        
        if (promotionOpt.isPresent() && validatePromotion(code)) {
            Promotion promotion = promotionOpt.get();
            
            // Increment usage count
            if (promotion.getCurrentUses() == null) {
                promotion.setCurrentUses(1);
            } else {
                promotion.setCurrentUses(promotion.getCurrentUses() + 1);
            }
            
            // Check if max uses reached and update status if needed
            if (promotion.getMaxUses() != null && promotion.getCurrentUses() >= promotion.getMaxUses()) {
                promotion.setStatus(Promotion.Status.EXPIRED);
            }
            
            promotionRepository.save(promotion);
            return true;
        }
        
        return false;
    }
    
    @Override
    public boolean isCodeUnique(String code) {
        return !promotionRepository.existsByCode(code);
    }
    
    @Override
    public String generateUniqueCode(int length) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        Random random = new Random();
        
        String code;
        boolean isUnique = false;
        
        do {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < length; i++) {
                int index = random.nextInt(chars.length());
                sb.append(chars.charAt(index));
            }
            code = sb.toString();
            
            // Check if code is unique
            isUnique = isCodeUnique(code);
        } while (!isUnique);
        
        return code;
    }
}