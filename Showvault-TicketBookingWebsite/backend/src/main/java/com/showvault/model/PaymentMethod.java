package com.showvault.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.showvault.util.EnumUtils;

/**
 * Enum representing the possible payment methods
 */
public enum PaymentMethod {
    /**
     * Payment made with a credit card
     */
    CREDIT_CARD("Credit Card"),
    
    /**
     * Payment made with a debit card
     */
    DEBIT_CARD("Debit Card"),
    
    /**
     * Payment made through PayPal
     */
    PAYPAL("PayPal"),
    
    /**
     * Payment made through bank transfer
     */
    BANK_TRANSFER("Bank Transfer"),
    
    /**
     * Payment made with cash
     */
    CASH("Cash"),
    
    /**
     * Payment made through Google Pay
     */
    GOOGLE_PAY("Google Pay"),
    
    /**
     * Payment made through Apple Pay
     */
    APPLE_PAY("Apple Pay"),
    
    /**
     * Payment made through a gift card
     */
    GIFT_CARD("Gift Card"),
    
    /**
     * Payment made through a voucher
     */
    VOUCHER("Voucher"),
    
    /**
     * Refund processed for a cancelled booking
     */
    REFUND("Refund");
    
    private final String displayName;
    
    /**
     * Constructor
     * 
     * @param displayName The human-readable display name
     */
    PaymentMethod(String displayName) {
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
     * Convert a string to a PaymentMethod
     * 
     * @param value The string value to convert
     * @return The PaymentMethod enum value
     */
    @JsonCreator
    public static PaymentMethod fromString(String value) {
        return EnumUtils.fromString(PaymentMethod.class, value, CREDIT_CARD);
    }
    
    /**
     * Check if a string is a valid PaymentMethod
     * 
     * @param value The string value to check
     * @return true if valid, false otherwise
     */
    public static boolean isValid(String value) {
        return EnumUtils.isValid(PaymentMethod.class, value);
    }
    
    /**
     * Get all possible values as strings
     * 
     * @return Array of string values
     */
    public static String[] getValues() {
        return EnumUtils.getValues(PaymentMethod.class);
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