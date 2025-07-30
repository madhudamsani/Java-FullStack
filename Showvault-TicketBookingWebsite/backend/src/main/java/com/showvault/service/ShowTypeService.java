package com.showvault.service;

import com.showvault.model.ShowType;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

/**
 * Service for managing show types with backward compatibility
 */
@Service
public class ShowTypeService {
    
    /**
     * Get all available show types
     * @return List of show type display names
     */
    public List<String> getAllShowTypes() {
        return Arrays.asList(ShowType.getAllDisplayNames());
    }
    
    /**
     * Validate and normalize show type with backward compatibility
     * @param type Input type string
     * @return Normalized type string
     */
    public String normalizeShowType(String type) {
        ShowType showType = ShowType.fromString(type);
        return showType.toDatabaseValue();
    }
    
    /**
     * Check if a show type is valid
     * @param type Type string to validate
     * @return true if valid, false otherwise
     */
    public boolean isValidShowType(String type) {
        try {
            ShowType.fromString(type);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    /**
     * Get frontend-compatible type (handles Theater -> Theatrical mapping)
     * @param databaseType Type from database
     * @return Frontend-compatible type
     */
    public String getFrontendType(String databaseType) {
        ShowType showType = ShowType.fromString(databaseType);
        return showType.toDatabaseValue();
    }
    
    /**
     * Convert frontend type to database type (with backward compatibility)
     * @param frontendType Type from frontend
     * @return Database-compatible type
     */
    public String getDatabaseType(String frontendType) {
        ShowType showType = ShowType.fromString(frontendType);
        return showType.toDatabaseValue();
    }
}