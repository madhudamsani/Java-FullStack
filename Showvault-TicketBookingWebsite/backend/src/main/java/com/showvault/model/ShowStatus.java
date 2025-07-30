package com.showvault.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import com.showvault.util.EnumUtils;

/**
 * Enum representing the possible states of a show
 */
public enum ShowStatus {
    /**
     * Show is scheduled but has not yet started
     */
    UPCOMING("Upcoming"),
    
    /**
     * Show is currently running
     */
    ONGOING("Ongoing"),
    
    /**
     * Show has finished its run
     */
    COMPLETED("Completed"),
    
    /**
     * Show has been cancelled
     */
    CANCELLED("Cancelled"),
    
    /**
     * Show is temporarily suspended
     */
    SUSPENDED("Suspended"),
    
    /**
     * Show is in draft state (not yet published)
     */
    DRAFT("Draft");
    
    private final String displayName;
    
    /**
     * Constructor
     * 
     * @param displayName The human-readable display name
     */
    ShowStatus(String displayName) {
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
     * Convert a string to a ShowStatus
     * 
     * @param value The string value to convert
     * @return The ShowStatus enum value
     */
    @JsonCreator
    public static ShowStatus fromString(String value) {
        return EnumUtils.fromString(ShowStatus.class, value, DRAFT);
    }
    
    /**
     * Check if a string is a valid ShowStatus
     * 
     * @param value The string value to check
     * @return true if valid, false otherwise
     */
    public static boolean isValid(String value) {
        return EnumUtils.isValid(ShowStatus.class, value);
    }
    
    /**
     * Get all possible values as strings
     * 
     * @return Array of string values
     */
    public static String[] getValues() {
        return EnumUtils.getValues(ShowStatus.class);
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