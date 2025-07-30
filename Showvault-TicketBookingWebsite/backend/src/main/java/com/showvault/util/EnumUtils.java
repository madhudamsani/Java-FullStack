package com.showvault.util;

import java.util.Arrays;
import java.util.Optional;

/**
 * Utility class for working with enums
 */
public class EnumUtils {
    
    /**
     * Safely convert a string to an enum value
     * 
     * @param <T> The enum type
     * @param enumClass The enum class
     * @param value The string value to convert
     * @return Optional containing the enum value if found, empty otherwise
     */
    public static <T extends Enum<T>> Optional<T> fromString(Class<T> enumClass, String value) {
        if (value == null) {
            return Optional.empty();
        }
        
        try {
            return Optional.of(Enum.valueOf(enumClass, value.toUpperCase()));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
    
    /**
     * Safely convert a string to an enum value with a default fallback
     * 
     * @param <T> The enum type
     * @param enumClass The enum class
     * @param value The string value to convert
     * @param defaultValue The default value to return if conversion fails
     * @return The enum value if found, defaultValue otherwise
     */
    public static <T extends Enum<T>> T fromString(Class<T> enumClass, String value, T defaultValue) {
        return fromString(enumClass, value).orElse(defaultValue);
    }
    
    /**
     * Check if a string is a valid enum value
     * 
     * @param <T> The enum type
     * @param enumClass The enum class
     * @param value The string value to check
     * @return true if the string is a valid enum value, false otherwise
     */
    public static <T extends Enum<T>> boolean isValid(Class<T> enumClass, String value) {
        return fromString(enumClass, value).isPresent();
    }
    
    /**
     * Get all possible values for an enum as strings
     * 
     * @param <T> The enum type
     * @param enumClass The enum class
     * @return Array of string values
     */
    public static <T extends Enum<T>> String[] getValues(Class<T> enumClass) {
        return Arrays.stream(enumClass.getEnumConstants())
                .map(Enum::name)
                .toArray(String[]::new);
    }
}