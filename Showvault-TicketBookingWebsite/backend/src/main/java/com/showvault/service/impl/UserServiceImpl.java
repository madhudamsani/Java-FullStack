package com.showvault.service.impl;

import com.showvault.model.UserPreferences;
import com.showvault.model.ERole;
import com.showvault.model.Role;
import com.showvault.model.User;
import com.showvault.repository.RoleRepository;
import com.showvault.repository.UserPreferencesRepository;
import com.showvault.repository.UserRepository;
import com.showvault.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserPreferencesRepository userPreferencesRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserServiceImpl(UserRepository userRepository, RoleRepository roleRepository, 
                      UserPreferencesRepository userPreferencesRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userPreferencesRepository = userPreferencesRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Override
    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    @Override
    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @Override
    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    @Override
    @Transactional
    public User registerUser(User user, String roleName) {
        System.out.println("Registering new user: " + user.getUsername() + ", email: " + user.getEmail());
        
        // Encode password
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        System.out.println("Password encoded successfully");
        
        // Set user as active
        user.setActive(true);
        
        // If roles are not already set and roleName is provided, assign role
        if (user.getRoles() == null || user.getRoles().isEmpty()) {
            Set<Role> roles = new HashSet<>();
            if (roleName != null) {
                ERole eRole;
                switch (roleName.toLowerCase()) {
                    case "admin":
                        eRole = ERole.ROLE_ADMIN;
                        System.out.println("Assigning ADMIN role to user");
                        break;
                    case "organizer":
                        eRole = ERole.ROLE_ORGANIZER;
                        System.out.println("Assigning ORGANIZER role to user");
                        break;
                    default:
                        eRole = ERole.ROLE_USER;
                        System.out.println("Assigning USER role to user");
                }
                Optional<Role> roleOpt = roleRepository.findByName(eRole);
                if (roleOpt.isPresent()) {
                    roles.add(roleOpt.get());
                    System.out.println("Role found and added: " + eRole);
                } else {
                    System.out.println("WARNING: Role not found in database: " + eRole);
                }
            } else {
                // Default to USER role if none specified
                Optional<Role> userRoleOpt = roleRepository.findByName(ERole.ROLE_USER);
                if (userRoleOpt.isPresent()) {
                    roles.add(userRoleOpt.get());
                    System.out.println("Default USER role added");
                } else {
                    System.out.println("WARNING: Default USER role not found in database");
                }
            }
            user.setRoles(roles);
        }
        
        // Save the user
        try {
            User savedUser = userRepository.save(user);
            System.out.println("User saved successfully with ID: " + savedUser.getId());
            
            // Verify the user was saved correctly
            Optional<User> verifiedUser = userRepository.findById(savedUser.getId());
            if (verifiedUser.isPresent()) {
                System.out.println("Successfully verified user with ID: " + savedUser.getId());
                
                // Verify the roles were saved correctly
                Set<Role> roles = verifiedUser.get().getRoles();
                if (roles != null && !roles.isEmpty()) {
                    System.out.println("User has " + roles.size() + " roles:");
                    roles.forEach(role -> System.out.println("- " + role.getName()));
                } else {
                    System.out.println("WARNING: User has no roles assigned!");
                }
                
                // Detach the user from the persistence context to avoid lazy loading issues
                return verifiedUser.get();
            } else {
                System.out.println("WARNING: Could not verify user with ID: " + savedUser.getId());
                return savedUser;
            }
        } catch (Exception e) {
            System.err.println("Error saving user: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @Override
    @Transactional
    public User updateUser(User user) {
        System.out.println("Updating user with ID: " + user.getId());
        
        // Verify the user exists
        Optional<User> existingUserOpt = userRepository.findById(user.getId());
        if (!existingUserOpt.isPresent()) {
            System.out.println("User not found with ID: " + user.getId());
            return user; // Return the original user object
        }
        
        User existingUser = existingUserOpt.get();
        
        // Update user fields if they are not null
        if (user.getUsername() != null && !user.getUsername().isEmpty()) {
            existingUser.setUsername(user.getUsername());
            System.out.println("Updated username to: " + user.getUsername());
        }
        
        if (user.getEmail() != null && !user.getEmail().isEmpty()) {
            existingUser.setEmail(user.getEmail());
            System.out.println("Updated email to: " + user.getEmail());
        }
        
        // Name field doesn't exist in User class, so we'll skip this check
        // If a full name is needed, it can be constructed from firstName and lastName
        
        if (user.getFirstName() != null && !user.getFirstName().isEmpty()) {
            existingUser.setFirstName(user.getFirstName());
            System.out.println("Updated first name to: " + user.getFirstName());
        }
        
        if (user.getLastName() != null && !user.getLastName().isEmpty()) {
            existingUser.setLastName(user.getLastName());
            System.out.println("Updated last name to: " + user.getLastName());
        }
        
        if (user.getPhoneNumber() != null && !user.getPhoneNumber().isEmpty()) {
            existingUser.setPhoneNumber(user.getPhoneNumber());
            System.out.println("Updated phone to: " + user.getPhoneNumber());
        }
        
        // Don't update password here - use changePassword method instead
        
        // Save the updated user
        User savedUser = userRepository.save(existingUser);
        System.out.println("User updated successfully with ID: " + savedUser.getId());
        
        // Verify the user was updated correctly
        Optional<User> verifiedUserOpt = userRepository.findById(savedUser.getId());
        if (verifiedUserOpt.isPresent()) {
            User verifiedUser = verifiedUserOpt.get();
            System.out.println("Successfully verified user update with ID: " + verifiedUser.getId());
            System.out.println("Updated user details: " + 
                              "Username: " + verifiedUser.getUsername() + ", " +
                              "Email: " + verifiedUser.getEmail() + ", " +
                              "Name: " + verifiedUser.getFirstName() + " " + verifiedUser.getLastName() + ", " +
                              "Phone: " + verifiedUser.getPhoneNumber());
            return verifiedUser;
        } else {
            System.out.println("WARNING: Could not verify user update with ID: " + savedUser.getId());
            return savedUser;
        }
    }

    @Override
    @Transactional
    public boolean changePassword(Long userId, String currentPassword, String newPassword) {
        Optional<User> userOpt = userRepository.findById(userId);
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            // Verify current password
            if (passwordEncoder.matches(currentPassword, user.getPassword())) {
                // Update with new password
                user.setPassword(passwordEncoder.encode(newPassword));
                userRepository.save(user);
                return true;
            }
        }
        
        return false;
    }

    @Override
    @Transactional
    public void deactivateUser(Long userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setActive(false);
            userRepository.save(user);
        });
    }

    @Override
    @Transactional
    public void activateUser(Long userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setActive(true);
            userRepository.save(user);
        });
    }

    @Override
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    @Override
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }
    
    @Override
    @Transactional
    public User saveProfilePicture(Long userId, byte[] profilePicture, String fileName) {
        Optional<User> userOpt = userRepository.findById(userId);
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            // In a real implementation, this would save the file to a storage service
            // and store the URL in the user record. For now, we'll just store the filename.
            
            // Simulate a URL for the profile picture
            String fileExtension = fileName.substring(fileName.lastIndexOf("."));
            String profilePictureUrl = "/uploads/profile-pictures/" + userId + "_" + System.currentTimeMillis() + fileExtension;
            
            // In a real implementation, we would add a profilePictureUrl field to the User model
            // user.setProfilePictureUrl(profilePictureUrl);
            
            return userRepository.save(user);
        }
        
        return null;
    }
    
    @Override
    public UserPreferences getUserPreferences(Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            Optional<UserPreferences> preferencesOpt = userPreferencesRepository.findByUser(user);
            
            if (preferencesOpt.isPresent()) {
                return preferencesOpt.get();
            } else {
                // Create default preferences
                UserPreferences preferences = new UserPreferences();
                preferences.setUser(user);
                return userPreferencesRepository.save(preferences);
            }
        }
        
        return null;
    }
    
    @Override
    @Transactional
    public User updateUserPreferences(Long userId, UserPreferences preferences) {
        Optional<User> userOpt = userRepository.findById(userId);
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            Optional<UserPreferences> existingPreferencesOpt = userPreferencesRepository.findByUser(user);
            
            UserPreferences userPreferences;
            if (existingPreferencesOpt.isPresent()) {
                userPreferences = existingPreferencesOpt.get();
                userPreferences.setEmailNotifications(preferences.isEmailNotifications());
                userPreferences.setSmsNotifications(preferences.isSmsNotifications());
                userPreferences.setLanguage(preferences.getLanguage());
                userPreferences.setCurrency(preferences.getCurrency());
                userPreferences.setFavoriteCategories(preferences.getFavoriteCategories());
            } else {
                userPreferences = preferences;
                userPreferences.setUser(user);
            }
            
            userPreferencesRepository.save(userPreferences);
            return user;
        }
        
        return null;
    }

    @Override
    public long countUsersByRole(ERole roleName) {
        return userRepository.findAll().stream()
                .filter(user -> user.getRoles().stream()
                        .anyMatch(role -> role.getName() == roleName))
                .count();
    }

    @Override
    public long countUsersByRole(String roleName) {
        // Convert string role name to ERole if needed
        try {
            ERole eRole = ERole.valueOf(roleName);
            return countUsersByRole(eRole);
        } catch (IllegalArgumentException e) {
            // If the string doesn't match exactly, try with ROLE_ prefix
            if (!roleName.startsWith("ROLE_")) {
                return userRepository.countUsersByRoleName("ROLE_" + roleName.toUpperCase());
            } else {
                return userRepository.countUsersByRoleName(roleName);
            }
        }
    }
    
    @Override
    public List<User> getUsersWithFilters(int offset, int limit, String role, String status, String search, String sortBy, String sortOrder) {
        // Use the repository to query the database directly
        System.out.println("Fetching users with filters - offset: " + offset + ", limit: " + limit + 
                          ", role: " + role + ", status: " + status + ", search: " + search + 
                          ", sortBy: " + sortBy + ", sortOrder: " + sortOrder);
        
        // Get all users from the database with pagination
        List<User> users = userRepository.findAll();
        List<User> filteredUsers = new ArrayList<>();
        
        // Apply filters
        for (User user : users) {
            // Skip deleted users unless specifically requested
            if (user.isDeleted() && (status == null || !status.equalsIgnoreCase("deleted"))) {
                continue;
            }
            
            boolean roleMatch = true;
            if (role != null && !role.equals("all")) {
                String roleToMatch = role.startsWith("ROLE_") ? role : "ROLE_" + role.toUpperCase();
                roleMatch = user.getRoles().stream()
                    .anyMatch(r -> r.getName().name().equals(roleToMatch));
            }
            
            boolean statusMatch = true;
            if (status != null && !status.equals("all")) {
                statusMatch = (status.equalsIgnoreCase("active") && user.isActive() && !user.isDeleted()) ||
                             (status.equalsIgnoreCase("inactive") && !user.isActive() && !user.isDeleted()) ||
                             (status.equalsIgnoreCase("suspended") && !user.isActive() && !user.isDeleted()) ||
                             (status.equalsIgnoreCase("deleted") && user.isDeleted());
            }
            
            boolean searchMatch = true;
            if (search != null && !search.isEmpty()) {
                searchMatch = user.getUsername().toLowerCase().contains(search.toLowerCase()) ||
                             user.getEmail().toLowerCase().contains(search.toLowerCase()) ||
                             (user.getFirstName() != null && user.getFirstName().toLowerCase().contains(search.toLowerCase())) ||
                             (user.getLastName() != null && user.getLastName().toLowerCase().contains(search.toLowerCase()));
            }
            
            if (roleMatch && statusMatch && searchMatch) {
                filteredUsers.add(user);
            }
        }
        
        // Apply sorting
        if (sortBy != null && !sortBy.isEmpty()) {
            filteredUsers.sort((u1, u2) -> {
                int result = 0;
                
                switch (sortBy) {
                    case "id":
                        result = u1.getId().compareTo(u2.getId());
                        break;
                    case "username":
                        result = u1.getUsername().compareTo(u2.getUsername());
                        break;
                    case "email":
                        result = u1.getEmail().compareTo(u2.getEmail());
                        break;
                    case "name":
                        String name1 = (u1.getFirstName() != null ? u1.getFirstName() : "") + 
                                      (u1.getLastName() != null ? " " + u1.getLastName() : "");
                        String name2 = (u2.getFirstName() != null ? u2.getFirstName() : "") + 
                                      (u2.getLastName() != null ? " " + u2.getLastName() : "");
                        result = name1.compareTo(name2);
                        break;
                    case "role":
                        String role1 = u1.getRoles().isEmpty() ? "" : u1.getRoles().iterator().next().getName().name();
                        String role2 = u2.getRoles().isEmpty() ? "" : u2.getRoles().iterator().next().getName().name();
                        result = role1.compareTo(role2);
                        break;
                    case "status":
                        result = Boolean.compare(u1.isActive(), u2.isActive());
                        break;
                    case "createdAt":
                        if (u1.getCreatedAt() != null && u2.getCreatedAt() != null) {
                            result = u1.getCreatedAt().compareTo(u2.getCreatedAt());
                        }
                        break;
                    case "lastLogin":
                        if (u1.getLastLoginDate() != null && u2.getLastLoginDate() != null) {
                            result = u1.getLastLoginDate().compareTo(u2.getLastLoginDate());
                        }
                        break;
                    default:
                        result = 0;
                }
                
                // Apply sort order
                if ("desc".equalsIgnoreCase(sortOrder)) {
                    result = -result;
                }
                
                return result;
            });
        }
        
        // Apply pagination
        int end = Math.min(offset + limit, filteredUsers.size());
        if (offset >= filteredUsers.size()) {
            return new ArrayList<>();
        }
        
        System.out.println("Returning " + (end - offset) + " users from " + filteredUsers.size() + " total filtered users");
        return filteredUsers.subList(offset, end);
    }
    
    @Override
    public long countUsersWithFilters(String role, String status, String search) {
        System.out.println("Counting users with filters - role: " + role + ", status: " + status + ", search: " + search);
        
        // Get all users from the database
        List<User> users = userRepository.findAll();
        long count = 0;
        
        // Apply filters
        for (User user : users) {
            // Skip deleted users unless specifically requested
            if (user.isDeleted() && (status == null || !status.equalsIgnoreCase("deleted"))) {
                continue;
            }
            
            boolean roleMatch = true;
            if (role != null && !role.equals("all")) {
                String roleToMatch = role.startsWith("ROLE_") ? role : "ROLE_" + role.toUpperCase();
                roleMatch = user.getRoles().stream()
                    .anyMatch(r -> r.getName().name().equals(roleToMatch));
            }
            
            boolean statusMatch = true;
            if (status != null && !status.equals("all")) {
                statusMatch = (status.equalsIgnoreCase("active") && user.isActive() && !user.isDeleted()) ||
                             (status.equalsIgnoreCase("inactive") && !user.isActive() && !user.isDeleted()) ||
                             (status.equalsIgnoreCase("suspended") && !user.isActive() && !user.isDeleted()) ||
                             (status.equalsIgnoreCase("deleted") && user.isDeleted());
            }
            
            boolean searchMatch = true;
            if (search != null && !search.isEmpty()) {
                searchMatch = user.getUsername().toLowerCase().contains(search.toLowerCase()) ||
                             user.getEmail().toLowerCase().contains(search.toLowerCase()) ||
                             (user.getFirstName() != null && user.getFirstName().toLowerCase().contains(search.toLowerCase())) ||
                             (user.getLastName() != null && user.getLastName().toLowerCase().contains(search.toLowerCase()));
            }
            
            if (roleMatch && statusMatch && searchMatch) {
                count++;
            }
        }
        
        System.out.println("Found " + count + " users matching the filters");
        return count;
    }
    
    @Override
    @Transactional
    public User updateUserRole(User user, String roleName) {
        // Clear existing roles
        user.getRoles().clear();
        
        // Add new role
        ERole eRole;
        switch (roleName.toLowerCase()) {
            case "admin":
            case "role_admin":
                eRole = ERole.ROLE_ADMIN;
                break;
            case "organizer":
            case "role_organizer":
                eRole = ERole.ROLE_ORGANIZER;
                break;
            default:
                eRole = ERole.ROLE_USER;
        }
        
        Optional<Role> roleOpt = roleRepository.findByName(eRole);
        if (roleOpt.isPresent()) {
            Set<Role> roles = new HashSet<>();
            roles.add(roleOpt.get());
            user.setRoles(roles);
        }
        
        return userRepository.save(user);
    }
    
    @Override
    @Transactional
    public boolean resetPassword(Long userId) {
        System.out.println("Attempting to reset password for user ID: " + userId);
        
        Optional<User> userOpt = userRepository.findById(userId);
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            System.out.println("User found: " + user.getUsername() + " (ID: " + userId + ")");
            
            // Generate a random temporary password
            String tempPassword = UUID.randomUUID().toString().substring(0, 8);
            System.out.println("Generated temporary password for user ID " + userId + ": " + tempPassword);
            
            // Update user with new password
            user.setPassword(passwordEncoder.encode(tempPassword));
            userRepository.save(user);
            System.out.println("Password updated successfully for user ID: " + userId);
            
            // In a real implementation, this would send an email with the temporary password
            System.out.println("NOTE: In a production environment, an email would be sent to " + 
                              user.getEmail() + " with the temporary password");
            
            // For localhost testing, print the temporary password to console
            System.out.println("TEMPORARY PASSWORD FOR " + user.getUsername() + ": " + tempPassword);
            
            return true;
        } else {
            System.out.println("User not found with ID: " + userId);
        }
        
        return false;
    }
    
    @Override
    @Transactional
    public void deleteUser(Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            // Implement soft delete
            user.setDeleted(true);
            user.setActive(false);
            
            // Anonymize personal data
            user.setEmail("deleted_" + userId + "@example.com");
            user.setUsername("deleted_user_" + userId);
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            
            // Save the updated user
            userRepository.save(user);
            
            System.out.println("User " + userId + " has been soft deleted");
        } else {
            System.out.println("User " + userId + " not found for deletion");
        }
    }
}