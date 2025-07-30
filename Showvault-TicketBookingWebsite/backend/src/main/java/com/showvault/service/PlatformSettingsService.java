package com.showvault.service;

import java.util.Map;

public interface PlatformSettingsService {
    
    /**
     * Get all platform settings
     * @return Map containing all settings
     */
    Map<String, Object> getAllSettings();
    
    /**
     * Update platform settings
     * @param settings Map containing settings to update
     */
    void updateSettings(Map<String, Object> settings);
    
    /**
     * Get email templates
     * @return Map containing email templates
     */
    Map<String, Object> getEmailTemplates();
    
    /**
     * Update email template
     * @param templateId Template ID
     * @param templateData Template data
     */
    void updateEmailTemplate(String templateId, Map<String, String> templateData);
    
    /**
     * Get payment providers
     * @return Map containing payment providers
     */
    Map<String, Object> getPaymentProviders();
    
    /**
     * Update payment provider
     * @param providerId Provider ID
     * @param providerData Provider data
     */
    void updatePaymentProvider(String providerId, Map<String, Object> providerData);
}