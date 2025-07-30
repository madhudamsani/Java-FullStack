package com.showvault.controller;

import com.showvault.service.PlatformSettingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin/settings")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSettingsController {

    @Autowired
    private PlatformSettingsService platformSettingsService;

    @GetMapping
    public ResponseEntity<?> getPlatformSettings() {
        Map<String, Object> settings = platformSettingsService.getAllSettings();
        return new ResponseEntity<>(settings, HttpStatus.OK);
    }

    @PutMapping
    public ResponseEntity<?> updatePlatformSettings(@RequestBody Map<String, Object> settings) {
        try {
            platformSettingsService.updateSettings(settings);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Platform settings updated successfully");
            
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to update platform settings: " + e.getMessage());
            
            return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/email/templates")
    public ResponseEntity<?> getEmailTemplates() {
        Map<String, Object> templates = platformSettingsService.getEmailTemplates();
        return new ResponseEntity<>(templates, HttpStatus.OK);
    }

    @PutMapping("/email/templates/{templateId}")
    public ResponseEntity<?> updateEmailTemplate(
            @PathVariable String templateId,
            @RequestBody Map<String, String> templateData) {
        
        try {
            platformSettingsService.updateEmailTemplate(templateId, templateData);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Email template updated successfully");
            
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to update email template: " + e.getMessage());
            
            return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/payment/providers")
    public ResponseEntity<?> getPaymentProviders() {
        Map<String, Object> providers = platformSettingsService.getPaymentProviders();
        return new ResponseEntity<>(providers, HttpStatus.OK);
    }

    @PutMapping("/payment/providers/{providerId}")
    public ResponseEntity<?> updatePaymentProvider(
            @PathVariable String providerId,
            @RequestBody Map<String, Object> providerData) {
        
        try {
            platformSettingsService.updatePaymentProvider(providerId, providerData);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Payment provider updated successfully");
            
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to update payment provider: " + e.getMessage());
            
            return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}