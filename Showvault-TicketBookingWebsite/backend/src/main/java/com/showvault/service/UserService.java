package com.showvault.service;

import com.showvault.model.UserPreferences;
import com.showvault.model.ERole;
import com.showvault.model.User;
import java.util.List;
import java.util.Optional;

public interface UserService {

    List<User> getAllUsers();

    Optional<User> getUserById(Long id);

    Optional<User> getUserByUsername(String username);

    Optional<User> getUserByEmail(String email);

    User registerUser(User user, String roleName);

    User updateUser(User user);

    boolean changePassword(Long userId, String currentPassword, String newPassword);

    void deactivateUser(Long userId);

    void activateUser(Long userId);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);
    
    /**
     * Saves a profile picture for a user
     * 
     * @param userId The ID of the user
     * @param profilePicture The profile picture file data
     * @param fileName The name of the uploaded file
     * @return The updated user with the profile picture URL
     */
    User saveProfilePicture(Long userId, byte[] profilePicture, String fileName);
    
    /**
     * Gets the preferences for a user
     * 
     * @param userId The ID of the user
     * @return The user's preferences, or a new preferences object if none exists
     */
    UserPreferences getUserPreferences(Long userId);
    
    /**
     * Updates the preferences for a user
     * 
     * @param userId The ID of the user
     * @param preferences The updated preferences
     * @return The updated user
     */
    User updateUserPreferences(Long userId, UserPreferences preferences);

    long countUsersByRole(ERole roleName);

    long countUsersByRole(String roleName);
    
    /**
     * Get users with pagination and filters for admin dashboard
     * @param offset Pagination offset
     * @param limit Pagination limit
     * @param role Role filter
     * @param status Status filter
     * @param search Search term
     * @param sortBy Field to sort by
     * @param sortOrder Sort order (asc/desc)
     * @return List of users
     */
    List<User> getUsersWithFilters(int offset, int limit, String role, String status, String search, String sortBy, String sortOrder);
    
    /**
     * Count users with filters for admin dashboard
     * @param role Role filter
     * @param status Status filter
     * @param search Search term
     * @return Total count of matching users
     */
    long countUsersWithFilters(String role, String status, String search);
    
    /**
     * Update user role
     * @param user User to update
     * @param role New role
     * @return Updated user
     */
    User updateUserRole(User user, String role);
    
    /**
     * Reset user password
     * @param userId User ID
     * @return True if successful, false otherwise
     */
    boolean resetPassword(Long userId);
    
    /**
     * Delete a user
     * @param userId User ID
     */
    void deleteUser(Long userId);
}
