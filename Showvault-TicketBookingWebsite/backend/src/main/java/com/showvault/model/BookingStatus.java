package com.showvault.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.showvault.util.EnumUtils;

/**
 * Enum representing the possible states of a booking
 */
public enum BookingStatus {
    /**
     * Booking has been created but not yet confirmed (e.g., payment pending)
     */
    PENDING("Pending"),
    
    /**
     * Booking has been confirmed (e.g., payment received)
     */
    CONFIRMED("Confirmed"),
    
    /**
     * Booking has been cancelled by the user or system
     */
    CANCELLED("Cancelled"),
    
    /**
     * Booking has been completed (e.g., event has passed)
     */
    COMPLETED("Completed"),
    
    /**
     * Booking has been refunded
     */
    REFUNDED("Refunded"),
    
    /**
     * Booking has expired (e.g., payment not received within time limit)
     */
    EXPIRED("Expired"),
    
    /**
     * Refund has been requested but not yet processed
     */
    REFUND_REQUESTED("Refund Requested");
    
    private final String displayName;
    
    /**
     * Constructor
     * 
     * @param displayName The human-readable display name
     */
    BookingStatus(String displayName) {
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
     * Convert a string to a BookingStatus
     * 
     * @param value The string value to convert
     * @return The BookingStatus enum value
     */
    @JsonCreator
    public static BookingStatus fromString(String value) {
        return EnumUtils.fromString(BookingStatus.class, value, PENDING);
    }
    
    /**
     * Check if a string is a valid BookingStatus
     * 
     * @param value The string value to check
     * @return true if valid, false otherwise
     */
    public static boolean isValid(String value) {
        return EnumUtils.isValid(BookingStatus.class, value);
    }
    
    /**
     * Get all possible values as strings
     * 
     * @return Array of string values
     */
    public static String[] getValues() {
        return EnumUtils.getValues(BookingStatus.class);
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