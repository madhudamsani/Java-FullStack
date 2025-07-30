package com.showvault.service;

import com.showvault.model.Promotion;
import com.showvault.model.Show;
import com.showvault.model.User;

import java.util.List;
import java.util.Optional;

public interface PromotionService {
    
    List<Promotion> getAllPromotions();
    
    List<Promotion> getPromotionsByUser(User user);
    
    List<Promotion> getPromotionsByShow(Show show);
    
    List<Promotion> getActivePromotions();
    
    List<Promotion> getActivePromotionsForShow(Show show);
    
    Optional<Promotion> getPromotionById(Long id);
    
    Optional<Promotion> getPromotionByCode(String code);
    
    Promotion createPromotion(Promotion promotion);
    
    Promotion updatePromotion(Promotion promotion);
    
    boolean deletePromotion(Long id);
    
    boolean validatePromotion(String code);
    
    double calculateDiscountAmount(String code, double originalPrice);
    
    boolean usePromotion(String code);
    
    boolean isCodeUnique(String code);
    
    String generateUniqueCode(int length);
}