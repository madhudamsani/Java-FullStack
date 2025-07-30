package com.showvault.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.showvault.util.EnumUtils;

/**
 * Enum representing the types of notifications in the system
 */
public enum NotificationType {
    /**
     * System notifications for general announcements and updates
     */
    SYSTEM("System"),
    
    /**
     * Booking-related notifications for ticket purchases and reservations
     */
    BOOKING("Booking"),
    
    /**
     * Show update notifications for changes to show details, times, etc.
     */
    SHOW_UPDATE("Show Update"),
    
    /**
     * Promotion notifications for special offers and discounts
     */
    PROMOTION("Promotion"),
    
    /**
     * Reminder notifications for upcoming shows and events
     */
    REMINDER("Reminder"),
    
    /**
     * Payment notifications for successful payments and receipts
     */
    PAYMENT("Payment"),
    
    /**
     * Refund notifications for processed refunds
     */
    REFUND("Refund"),
    
    /**
     * Cancellation notifications for cancelled shows or bookings
     */
    CANCELLATION("Cancellation");
    
    private final String displayName;
    
    /**
     * Constructor
     * 
     * @param displayName The human-readable display name
     */
    NotificationType(String displayName) {
        this.displayName = displayName;
    }
    
    /**
     * Get the display name
     * 
     * @return The human-readable display name
     */
    @JsonValue
    public String getDisplayName() {
        return displayName;
    }
    
    /**
     * Convert a string to a NotificationType
     * 
     * @param value The string value to convert
     * @return The NotificationType enum value
     */
    @JsonCreator
    public static NotificationType fromString(String value) {
        return EnumUtils.fromString(NotificationType.class, value, SYSTEM);
    }
    
    /**
     * Check if a string is a valid NotificationType
     * 
     * @param value The string value to check
     * @return true if valid, false otherwise
     */
    public static boolean isValid(String value) {
        return EnumUtils.isValid(NotificationType.class, value);
    }
    
    /**
     * Get all possible values as strings
     * 
     * @return Array of string values
     */
    public static String[] getValues() {
        return EnumUtils.getValues(NotificationType.class);
    }
    
    /**
     * Convert to string
     * 
     * @return The enum name
     */
    @Override
    public String toString() {
        return name();
    }
}