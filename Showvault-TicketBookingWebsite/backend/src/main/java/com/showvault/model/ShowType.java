package com.showvault.model;

/**
 * Enum representing different types of shows in the system.
 * This provides better type safety and consistency across the application.
 */
public enum ShowType {
    MOVIE("Movie"),
    THEATRICAL("Theatrical"),  // Renamed from "Theater" for clarity
    CONCERT("Concert"),
    EVENT("Event"),
    OTHER("Other");
    
    private final String displayName;
    
    ShowType(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    /**
     * Get ShowType from string value with backward compatibility
     * @param value String value (supports both "Theater" and "Theatrical")
     * @return ShowType enum value
     */
    public static ShowType fromString(String value) {
        if (value == null) {
            return OTHER;
        }
        
        // Handle backward compatibility for "Theater"
        if ("Theater".equalsIgnoreCase(value)) {
            return THEATRICAL;
        }
        
        for (ShowType type : ShowType.values()) {
            if (type.displayName.equalsIgnoreCase(value) || 
                type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        
        return OTHER;
    }
    
    /**
     * Convert to database string value
     * @return String value for database storage
     */
    public String toDatabaseValue() {
        return this.displayName;
    }
    
    /**
     * Get all available show types as strings for frontend
     * @return Array of show type display names
     */
    public static String[] getAllDisplayNames() {
        return new String[]{
            MOVIE.displayName,
            THEATRICAL.displayName,
            CONCERT.displayName,
            EVENT.displayName,
            OTHER.displayName
        };
    }
}