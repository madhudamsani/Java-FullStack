package com.showvault.service;

import org.springframework.stereotype.Service;

/**
 * Service for sending emails
 * Note: This is a simplified implementation. In a real application, you would
 * configure a proper email service and handle templates, HTML emails, etc.
 * Currently, emails are just logged to console.
 */
@Service
public class EmailService {

    private boolean emailEnabled = false;

    /**
     * Send a simple email
     * @param to Recipient email address
     * @param subject Email subject
     * @param text Email content
     */
    public void sendEmail(String to, String subject, String text) {
        // If email is not enabled, just log the message
        if (!emailEnabled) {
            logEmail(to, subject, text);
            return;
        }

        // For now, we'll just log emails instead of sending them
        // In a real application, you would integrate with an email service
        logEmail(to, subject, text);
    }

    /**
     * Log an email that would have been sent
     * @param to Recipient email address
     * @param subject Email subject
     * @param text Email content
     */
    private void logEmail(String to, String subject, String text) {
        System.out.println("========== EMAIL WOULD BE SENT ==========");
        System.out.println("To: " + to);
        System.out.println("Subject: " + subject);
        System.out.println("Content: " + text);
        System.out.println("========================================");
    }
}