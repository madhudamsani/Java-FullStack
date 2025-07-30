package com.showvault.controller;

import com.showvault.model.Promotion;
import com.showvault.model.Show;
import com.showvault.model.User;
import com.showvault.security.services.UserDetailsImpl;
import com.showvault.service.PromotionService;
import com.showvault.service.ShowService;
import com.showvault.service.UserService;

import org.springframework.beans.factory.annotation.Autowired;
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

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/promotions")
public class PromotionController {

    @Autowired
    private PromotionService promotionService;

    @Autowired
    private UserService userService;

    @Autowired
    private ShowService showService;

    @GetMapping("/active")
    public ResponseEntity<List<Promotion>> getActivePromotions() {
        List<Promotion> activePromotions = promotionService.getActivePromotions();
        return new ResponseEntity<>(activePromotions, HttpStatus.OK);
    }

    @GetMapping
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<List<Promotion>> getAllPromotions() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // If admin, return all promotions
        if (authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            List<Promotion> promotions = promotionService.getAllPromotions();
            return new ResponseEntity<>(promotions, HttpStatus.OK);
        } 
        // If organizer, return only their promotions
        else {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            Optional<User> userOpt = userService.getUserById(userDetails.getId());
            
            if (userOpt.isPresent()) {
                List<Promotion> promotions = promotionService.getPromotionsByUser(userOpt.get());
                return new ResponseEntity<>(promotions, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<Promotion> getPromotionById(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<Promotion> promotionOpt = promotionService.getPromotionById(id);
        
        if (promotionOpt.isPresent()) {
            Promotion promotion = promotionOpt.get();
            
            // Check if the promotion belongs to the current user or if the user is an admin
            if (promotion.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                return new ResponseEntity<>(promotion, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/show/{showId}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<List<Promotion>> getPromotionsByShow(@PathVariable Long showId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<Show> showOpt = showService.getShowById(showId);
        
        if (showOpt.isPresent()) {
            Show show = showOpt.get();
            
            // Check if the show belongs to the current user or if the user is an admin
            if (show.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                List<Promotion> promotions = promotionService.getPromotionsByShow(show);
                return new ResponseEntity<>(promotions, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> createPromotion(@RequestBody Promotion promotion) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            // Check if code is unique
            if (!promotionService.isCodeUnique(promotion.getCode())) {
                return new ResponseEntity<>("Promotion code already exists", HttpStatus.BAD_REQUEST);
            }
            
            // Set the creator
            promotion.setCreatedBy(user);
            
            // If show ID is provided, validate and set the show
            if (promotion.getShow() != null && promotion.getShow().getId() != null) {
                Optional<Show> showOpt = showService.getShowById(promotion.getShow().getId());
                
                if (showOpt.isPresent()) {
                    Show show = showOpt.get();
                    
                    // Check if the show belongs to the current user or if the user is an admin
                    if (show.getCreatedBy().getId().equals(userDetails.getId()) || 
                            authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                        promotion.setShow(show);
                    } else {
                        return new ResponseEntity<>("You don't have permission to create promotions for this show", HttpStatus.FORBIDDEN);
                    }
                } else {
                    return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
                }
            }
            
            Promotion newPromotion = promotionService.createPromotion(promotion);
            return new ResponseEntity<>(newPromotion, HttpStatus.CREATED);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> updatePromotion(@PathVariable Long id, @RequestBody Promotion promotion) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<Promotion> promotionOpt = promotionService.getPromotionById(id);
        
        if (promotionOpt.isPresent()) {
            Promotion existingPromotion = promotionOpt.get();
            
            // Check if the promotion belongs to the current user or if the user is an admin
            if (existingPromotion.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                // Check if code is changed and if it's unique
                if (!existingPromotion.getCode().equals(promotion.getCode()) && 
                        !promotionService.isCodeUnique(promotion.getCode())) {
                    return new ResponseEntity<>("Promotion code already exists", HttpStatus.BAD_REQUEST);
                }
                
                // Set the ID and creator
                promotion.setId(id);
                promotion.setCreatedBy(existingPromotion.getCreatedBy());
                promotion.setCreatedAt(existingPromotion.getCreatedAt());
                
                // If show ID is provided, validate and set the show
                if (promotion.getShow() != null && promotion.getShow().getId() != null) {
                    Optional<Show> showOpt = showService.getShowById(promotion.getShow().getId());
                    
                    if (showOpt.isPresent()) {
                        Show show = showOpt.get();
                        
                        // Check if the show belongs to the current user or if the user is an admin
                        if (show.getCreatedBy().getId().equals(userDetails.getId()) || 
                                authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                            promotion.setShow(show);
                        } else {
                            return new ResponseEntity<>("You don't have permission to create promotions for this show", HttpStatus.FORBIDDEN);
                        }
                    } else {
                        return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
                    }
                }
                
                Promotion updatedPromotion = promotionService.updatePromotion(promotion);
                return new ResponseEntity<>(updatedPromotion, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> deletePromotion(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<Promotion> promotionOpt = promotionService.getPromotionById(id);
        
        if (promotionOpt.isPresent()) {
            Promotion promotion = promotionOpt.get();
            
            // Check if the promotion belongs to the current user or if the user is an admin
            if (promotion.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                boolean deleted = promotionService.deletePromotion(id);
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

    @GetMapping("/validate/{code}")
    public ResponseEntity<Map<String, Object>> validatePromotion(@PathVariable String code) {
        boolean isValid = promotionService.validatePromotion(code);
        Map<String, Object> response = new HashMap<>();
        response.put("valid", isValid);
        
        if (isValid) {
            Optional<Promotion> promotionOpt = promotionService.getPromotionByCode(code);
            if (promotionOpt.isPresent()) {
                Promotion promotion = promotionOpt.get();
                response.put("promotion", Map.of(
                    "id", promotion.getId(),
                    "code", promotion.getCode(),
                    "name", promotion.getName(),
                    "description", promotion.getDescription() != null ? promotion.getDescription() : "",
                    "discountType", promotion.getDiscountType().toString(),
                    "discountValue", promotion.getDiscountValue(),
                    "maxUses", promotion.getMaxUses(),
                    "currentUses", promotion.getCurrentUses()
                ));
            }
        }
        
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PostMapping("/calculate")
    public ResponseEntity<Map<String, Object>> calculateDiscount(
            @RequestBody Map<String, Object> request) {
        
        String code = (String) request.get("code");
        Double originalPrice = Double.valueOf(request.get("price").toString());
        
        if (code == null || originalPrice == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        
        double discountAmount = promotionService.calculateDiscountAmount(code, originalPrice);
        double finalPrice = originalPrice - discountAmount;
        
        Map<String, Object> response = Map.of(
            "originalPrice", originalPrice,
            "discountAmount", discountAmount,
            "finalPrice", finalPrice
        );
        
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PostMapping("/apply/{code}")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<Boolean> applyPromotion(@PathVariable String code) {
        boolean applied = promotionService.usePromotion(code);
        return new ResponseEntity<>(applied, HttpStatus.OK);
    }

    @GetMapping("/generate-code")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<String> generateCode(@RequestParam(defaultValue = "8") int length) {
        String code = promotionService.generateUniqueCode(length);
        return new ResponseEntity<>(code, HttpStatus.OK);
    }
}