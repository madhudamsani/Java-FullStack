package com.showvault.service.impl;

import com.showvault.service.PlatformSettingsService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PlatformSettingsServiceImpl implements PlatformSettingsService {

    // In a real implementation, these would be stored in a database
    private Map<String, Object> settings = new HashMap<>();
    private Map<String, Object> emailTemplates = new HashMap<>();
    private Map<String, Object> paymentProviders = new HashMap<>();
    
    public PlatformSettingsServiceImpl() {
        // Initialize with default settings
        initializeDefaultSettings();
        initializeDefaultEmailTemplates();
        initializeDefaultPaymentProviders();
    }
    
    private void initializeDefaultSettings() {
        Map<String, Object> general = new HashMap<>();
        general.put("siteName", "ShowVault");
        general.put("siteDescription", "Your one-stop platform for booking shows and events");
        general.put("contactEmail", "contact@showvault.com");
        general.put("supportPhone", "+1-555-123-4567");
        general.put("maintenanceMode", false);
        
        Map<String, Object> security = new HashMap<>();
        Map<String, Object> passwordPolicy = new HashMap<>();
        passwordPolicy.put("minLength", 8);
        passwordPolicy.put("requireUppercase", true);
        passwordPolicy.put("requireLowercase", true);
        passwordPolicy.put("requireNumbers", true);
        passwordPolicy.put("requireSpecialChars", true);
        security.put("passwordPolicy", passwordPolicy);
        security.put("sessionTimeout", 30);
        security.put("maxLoginAttempts", 5);
        security.put("twoFactorAuth", false);
        
        Map<String, Object> email = new HashMap<>();
        email.put("provider", "SMTP");
        email.put("fromEmail", "noreply@showvault.com");
        email.put("fromName", "ShowVault");
        
        Map<String, Object> payment = new HashMap<>();
        payment.put("currency", "USD");
        payment.put("taxRate", 7.5);
        
        settings.put("general", general);
        settings.put("security", security);
        settings.put("email", email);
        settings.put("payment", payment);
    }
    
    private void initializeDefaultEmailTemplates() {
        List<Map<String, Object>> templates = new ArrayList<>();
        
        Map<String, Object> welcomeTemplate = new HashMap<>();
        welcomeTemplate.put("name", "welcome");
        welcomeTemplate.put("subject", "Welcome to ShowVault");
        welcomeTemplate.put("lastUpdated", LocalDate.now());
        
        Map<String, Object> bookingConfirmationTemplate = new HashMap<>();
        bookingConfirmationTemplate.put("name", "booking_confirmation");
        bookingConfirmationTemplate.put("subject", "Your Booking Confirmation");
        bookingConfirmationTemplate.put("lastUpdated", LocalDate.now());
        
        Map<String, Object> passwordResetTemplate = new HashMap<>();
        passwordResetTemplate.put("name", "password_reset");
        passwordResetTemplate.put("subject", "Password Reset Request");
        passwordResetTemplate.put("lastUpdated", LocalDate.now());
        
        templates.add(welcomeTemplate);
        templates.add(bookingConfirmationTemplate);
        templates.add(passwordResetTemplate);
        
        emailTemplates.put("templates", templates);
    }
    
    private void initializeDefaultPaymentProviders() {
        List<Map<String, Object>> providers = new ArrayList<>();
        
        Map<String, Object> stripeProvider = new HashMap<>();
        stripeProvider.put("name", "Stripe");
        stripeProvider.put("enabled", true);
        stripeProvider.put("testMode", true);
        
        Map<String, Object> paypalProvider = new HashMap<>();
        paypalProvider.put("name", "PayPal");
        paypalProvider.put("enabled", true);
        paypalProvider.put("testMode", true);
        
        providers.add(stripeProvider);
        providers.add(paypalProvider);
        
        paymentProviders.put("providers", providers);
    }

    @Override
    public Map<String, Object> getAllSettings() {
        return settings;
    }

    @Override
    public void updateSettings(Map<String, Object> newSettings) {
        // In a real implementation, this would validate and update settings in a database
        // For now, we'll just update our in-memory map
        
        // Update general settings
        if (newSettings.containsKey("general") && newSettings.get("general") instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> newGeneral = (Map<String, Object>) newSettings.get("general");
            @SuppressWarnings("unchecked")
            Map<String, Object> general = (Map<String, Object>) settings.get("general");
            general.putAll(newGeneral);
        }
        
        // Update security settings
        if (newSettings.containsKey("security") && newSettings.get("security") instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> security = (Map<String, Object>) settings.get("security");
            @SuppressWarnings("unchecked")
            Map<String, Object> newSecurity = (Map<String, Object>) newSettings.get("security");
            
            // Update password policy
            if (newSecurity.containsKey("passwordPolicy") && newSecurity.get("passwordPolicy") instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> passwordPolicy = (Map<String, Object>) security.get("passwordPolicy");
                @SuppressWarnings("unchecked")
                Map<String, Object> newPasswordPolicy = (Map<String, Object>) newSecurity.get("passwordPolicy");
                passwordPolicy.putAll(newPasswordPolicy);
            }
            
            // Update other security settings
            if (newSecurity.containsKey("sessionTimeout")) {
                security.put("sessionTimeout", newSecurity.get("sessionTimeout"));
            }
            if (newSecurity.containsKey("maxLoginAttempts")) {
                security.put("maxLoginAttempts", newSecurity.get("maxLoginAttempts"));
            }
            if (newSecurity.containsKey("twoFactorAuth")) {
                security.put("twoFactorAuth", newSecurity.get("twoFactorAuth"));
            }
        }
        
        // Update email settings
        if (newSettings.containsKey("email") && newSettings.get("email") instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> email = (Map<String, Object>) settings.get("email");
            @SuppressWarnings("unchecked")
            Map<String, Object> newEmail = (Map<String, Object>) newSettings.get("email");
            email.putAll(newEmail);
        }
        
        // Update payment settings
        if (newSettings.containsKey("payment") && newSettings.get("payment") instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> payment = (Map<String, Object>) settings.get("payment");
            @SuppressWarnings("unchecked")
            Map<String, Object> newPayment = (Map<String, Object>) newSettings.get("payment");
            
            if (newPayment.containsKey("currency")) {
                payment.put("currency", newPayment.get("currency"));
            }
            if (newPayment.containsKey("taxRate")) {
                payment.put("taxRate", newPayment.get("taxRate"));
            }
        }
    }

    @Override
    public Map<String, Object> getEmailTemplates() {
        return emailTemplates;
    }

    @Override
    public void updateEmailTemplate(String templateId, Map<String, String> templateData) {
        Object templatesObj = emailTemplates.get("templates");
        if (!(templatesObj instanceof List)) {
            return;
        }
        
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> templates = (List<Map<String, Object>>) templatesObj;
        
        for (Map<String, Object> template : templates) {
            if (template.get("name").equals(templateId)) {
                if (templateData.containsKey("subject")) {
                    template.put("subject", templateData.get("subject"));
                }
                if (templateData.containsKey("content")) {
                    template.put("content", templateData.get("content"));
                }
                template.put("lastUpdated", LocalDate.now());
                break;
            }
        }
    }

    @Override
    public Map<String, Object> getPaymentProviders() {
        return paymentProviders;
    }

    @Override
    public void updatePaymentProvider(String providerId, Map<String, Object> providerData) {
        Object providersObj = paymentProviders.get("providers");
        if (!(providersObj instanceof List)) {
            return;
        }
        
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> providers = (List<Map<String, Object>>) providersObj;
        
        for (Map<String, Object> provider : providers) {
            if (provider.get("name").equals(providerId)) {
                if (providerData.containsKey("enabled")) {
                    provider.put("enabled", providerData.get("enabled"));
                }
                if (providerData.containsKey("testMode")) {
                    provider.put("testMode", providerData.get("testMode"));
                }
                break;
            }
        }
    }
}