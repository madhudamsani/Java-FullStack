package com.showvault.controller;

import com.showvault.model.UserPreferences;
import com.showvault.model.ERole;
import com.showvault.model.User;
import com.showvault.security.services.UserDetailsImpl;
import com.showvault.service.UserService;
import com.showvault.security.jwt.JwtUtils;
import com.showvault.dto.MessageResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Optional;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(UserController.class);

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtils jwtUtils;

    // Helper method to create response
    private ResponseEntity<?> createResponse(String message, HttpStatus status) {
        Map<String, String> response = new HashMap<>();
        response.put("message", message);
        return new ResponseEntity<>(response, status);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        return new ResponseEntity<>(users, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @userSecurity.isCurrentUser(#id)")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userService.getUserById(id)
                .map(user -> new ResponseEntity<>(user, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping("/profile")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<User> getCurrentUserProfile() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (!(authentication.getPrincipal() instanceof UserDetailsImpl)) {
                logger.error("Invalid authentication principal type");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            logger.debug("Fetching profile for user: {}", userDetails.getUsername());

            return userService.getUserById(userDetails.getId())
                    .map(user -> {
                        logger.debug("Profile found for user: {}", user.getUsername());
                        return new ResponseEntity<>(user, HttpStatus.OK);
                    })
                    .orElseGet(() -> {
                        logger.error("Profile not found for user ID: {}", userDetails.getId());
                        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
                    });
        } catch (Exception e) {
            logger.error("Error fetching user profile: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/profile")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> updateCurrentUserProfile(@Valid @RequestBody User updatedUserInfo) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (!(authentication.getPrincipal() instanceof UserDetailsImpl)) {
                logger.error("Invalid authentication principal type");
                return createResponse("Authentication error", HttpStatus.UNAUTHORIZED);
            }

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            logger.debug("Updating profile for user: {}", userDetails.getUsername());

            return userService.getUserById(userDetails.getId())
                    .map(user -> {
                        try {
                            // Validate updated information
                            if (updatedUserInfo.getFirstName() == null || updatedUserInfo.getFirstName().trim().isEmpty()) {
                                return createResponse("First name cannot be empty", HttpStatus.BAD_REQUEST);
                            }
                            if (updatedUserInfo.getLastName() == null || updatedUserInfo.getLastName().trim().isEmpty()) {
                                return createResponse("Last name cannot be empty", HttpStatus.BAD_REQUEST);
                            }

                            // Only update allowed fields
                            user.setFirstName(updatedUserInfo.getFirstName().trim());
                            user.setLastName(updatedUserInfo.getLastName().trim());
                            if (updatedUserInfo.getPhoneNumber() != null) {
                                user.setPhoneNumber(updatedUserInfo.getPhoneNumber().trim());
                            }
                            if (updatedUserInfo.getAddress() != null) {
                                user.setAddress(updatedUserInfo.getAddress().trim());
                            }

                            User updated = userService.updateUser(user);
                            logger.debug("Profile updated successfully for user: {}", updated.getUsername());
                            return ResponseEntity.ok(updated);
                        } catch (Exception e) {
                            logger.error("Error updating user fields: {}", e.getMessage(), e);
                            return createResponse("Error updating profile fields: " + e.getMessage(),
                                    HttpStatus.INTERNAL_SERVER_ERROR);
                        }
                    })
                    .orElseGet(() -> {
                        logger.error("Profile not found for user ID: {}", userDetails.getId());
                        return ResponseEntity.notFound().build();
                    });
        } catch (Exception e) {
            logger.error("Error updating user profile: {}", e.getMessage(), e);
            return createResponse("Error updating profile: " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PatchMapping("/password")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> changePassword(
            @RequestParam String currentPassword,
            @RequestParam String newPassword) {
        try {
            if (currentPassword == null || currentPassword.trim().isEmpty()) {
                return createResponse("Current password is required", HttpStatus.BAD_REQUEST);
            }

            if (newPassword == null || newPassword.trim().isEmpty()) {
                return createResponse("New password is required", HttpStatus.BAD_REQUEST);
            }

            // Password complexity validation
            if (newPassword.length() < 8) {
                return createResponse("Password must be at least 8 characters long", HttpStatus.BAD_REQUEST);
            }

            if (!newPassword.matches(".*[A-Z].*")) {
                return createResponse("Password must contain at least one uppercase letter", HttpStatus.BAD_REQUEST);
            }

            if (!newPassword.matches(".*[a-z].*")) {
                return createResponse("Password must contain at least one lowercase letter", HttpStatus.BAD_REQUEST);
            }

            if (!newPassword.matches(".*\\d.*")) {
                return createResponse("Password must contain at least one number", HttpStatus.BAD_REQUEST);
            }

            if (!newPassword.matches(".*[!@#$%^&*()\\-_=+{};:,<.>].*")) {
                return createResponse("Password must contain at least one special character", HttpStatus.BAD_REQUEST);
            }

            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (!(authentication.getPrincipal() instanceof UserDetailsImpl)) {
                logger.error("Invalid authentication principal type");
                return createResponse("Authentication error", HttpStatus.UNAUTHORIZED);
            }

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            logger.debug("Processing password change request for user: {}", userDetails.getUsername());

            boolean changed = userService.changePassword(userDetails.getId(), currentPassword, newPassword);

            if (changed) {
                logger.info("Password changed successfully for user: {}", userDetails.getUsername());
                return createResponse("Password changed successfully", HttpStatus.OK);
            } else {
                logger.warn("Failed to change password for user: {}. Current password may be incorrect",
                        userDetails.getUsername());
                return createResponse("Failed to change password. Current password may be incorrect.",
                        HttpStatus.BAD_REQUEST);
            }
        } catch (Exception e) {
            logger.error("Error changing password: {}", e.getMessage(), e);
            return createResponse("Error changing password: " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<HttpStatus> activateUser(@PathVariable Long id) {
        Optional<User> userOpt = userService.getUserById(id);

        if (userOpt.isPresent()) {
            userService.activateUser(id);
            return new ResponseEntity<>(HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<HttpStatus> deactivateUser(@PathVariable Long id) {
        Optional<User> userOpt = userService.getUserById(id);

        if (userOpt.isPresent()) {
            // Prevent deactivating the last admin
            User user = userOpt.get();
            boolean isAdmin = user.getRoles().stream()
                    .anyMatch(role -> role.getName() == ERole.ROLE_ADMIN);

            if (isAdmin) {
                long adminCount = userService.countUsersByRole("ROLE_ADMIN");
                if (adminCount <= 1) {
                    return new ResponseEntity<>(HttpStatus.FORBIDDEN);
                }
            }

            userService.deactivateUser(id);
            return new ResponseEntity<>(HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping(value = "/profile-picture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> uploadProfilePicture(@RequestParam("profilePicture") MultipartFile file) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (!(authentication.getPrincipal() instanceof UserDetailsImpl)) {
                logger.error("Invalid authentication principal type");
                return createResponse("Authentication error", HttpStatus.UNAUTHORIZED);
            }

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            logger.debug("Processing profile picture upload for user: {}", userDetails.getUsername());
            
            // Validate file
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new MessageResponse("Please select a file to upload"));
            }

            // Validate file type
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest()
                    .body(new MessageResponse("Only image files are allowed"));
            }

            // Validate file size (max 5MB)
            if (file.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.badRequest()
                    .body(new MessageResponse("File size should not exceed 5MB"));
            }
            
            // Save the profile picture
            User updatedUser = userService.saveProfilePicture(
                userDetails.getId(), 
                file.getBytes(), 
                file.getOriginalFilename()
            );
            
            if (updatedUser != null) {
                logger.debug("Profile picture updated successfully for user: {}", updatedUser.getUsername());
                return ResponseEntity.ok(updatedUser);
            } else {
                logger.error("Failed to update profile picture for user ID: {}", userDetails.getId());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Failed to update profile picture"));
            }
        } catch (Exception e) {
            logger.error("Error uploading profile picture: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new MessageResponse("Error uploading profile picture: " + e.getMessage()));
        }
    }
    
    @GetMapping("/preferences")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<UserPreferences> getUserPreferences() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        UserPreferences preferences = userService.getUserPreferences(userDetails.getId());
        
        if (preferences != null) {
            return ResponseEntity.ok(preferences);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PutMapping("/preferences")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<User> updateUserPreferences(@Valid @RequestBody UserPreferences preferences) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (!(authentication.getPrincipal() instanceof UserDetailsImpl)) {
                logger.error("Invalid authentication principal type");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            logger.debug("Updating preferences for user: {}", userDetails.getUsername());
            
            User updatedUser = userService.updateUserPreferences(userDetails.getId(), preferences);
            if (updatedUser != null) {
                logger.debug("Preferences updated successfully for user: {}", updatedUser.getUsername());
                return ResponseEntity.ok(updatedUser);
            } else {
                logger.error("User not found for ID: {}", userDetails.getId());
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("Error updating user preferences: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}