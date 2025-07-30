package com.showvault.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.showvault.util.EnumUtils;

/**
 * Enum representing the possible states of a payment
 */
public enum PaymentStatus {
    /**
     * Payment has been initiated but not yet completed
     */
    PENDING("Pending"),
    
    /**
     * Payment has been successfully completed
     */
    COMPLETED("Completed"),
    
    /**
     * Payment has failed
     */
    FAILED("Failed"),
    
    /**
     * Payment has been refunded
     */
    REFUNDED("Refunded"),
    
    /**
     * Payment has been partially refunded
     */
    PARTIALLY_REFUNDED("Partially Refunded"),
    
    /**
     * Payment has been disputed by the customer
     */
    DISPUTED("Disputed"),
    
    /**
     * Payment has been cancelled before processing
     */
    CANCELLED("Cancelled");
    
    private final String displayName;
    
    /**
     * Constructor
     * 
     * @param displayName The human-readable display name
     */
    PaymentStatus(String displayName) {
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
     * Convert a string to a PaymentStatus
     * 
     * @param value The string value to convert
     * @return The PaymentStatus enum value
     */
    @JsonCreator
    public static PaymentStatus fromString(String value) {
        return EnumUtils.fromString(PaymentStatus.class, value, PENDING);
    }
    
    /**
     * Check if a string is a valid PaymentStatus
     * 
     * @param value The string value to check
     * @return true if valid, false otherwise
     */
    public static boolean isValid(String value) {
        return EnumUtils.isValid(PaymentStatus.class, value);
    }
    
    /**
     * Get all possible values as strings
     * 
     * @return Array of string values
     */
    public static String[] getValues() {
        return EnumUtils.getValues(PaymentStatus.class);
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