package com.showvault.controller;

import com.showvault.model.User;
import com.showvault.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    @Autowired
    private UserService userService;

    @GetMapping
    public ResponseEntity<?> getAllUsers(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortOrder) {
        
        // Calculate offset for pagination
        int offset = (page - 1) * limit;
        
        // Get users with pagination and filters
        List<User> users = userService.getUsersWithFilters(offset, limit, role, status, search, sortBy, sortOrder);
        long totalUsers = userService.countUsersWithFilters(role, status, search);
        
        Map<String, Object> response = new HashMap<>();
        response.put("users", users);
        response.put("total", totalUsers);
        
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userService.getUserById(id)
                .map(user -> new ResponseEntity<>(user, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<User> updateUserStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> statusUpdate) {
        
        String status = statusUpdate.get("status");
        if (status == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        
        Optional<User> userOpt = userService.getUserById(id);
        if (userOpt.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        
        User user = userOpt.get();
        
        // Check if trying to deactivate the last admin
        if (status.equals("inactive") || status.equals("suspended") || status.equals("deleted")) {
            boolean isAdmin = user.getRoles().stream()
                    .anyMatch(role -> role.getName().name().equals("ROLE_ADMIN"));
            
            if (isAdmin) {
                long adminCount = userService.countUsersByRole("ROLE_ADMIN");
                if (adminCount <= 1) {
                    return new ResponseEntity<>(HttpStatus.FORBIDDEN);
                }
            }
        }
        
        // Update user status
        switch (status.toLowerCase()) {
            case "active":
                user.setActive(true);
                user.setDeleted(false);
                break;
            case "inactive":
            case "suspended":
                user.setActive(false);
                user.setDeleted(false);
                break;
            case "deleted":
                user.setActive(false);
                user.setDeleted(true);
                break;
            default:
                return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        
        User updatedUser = userService.updateUser(user);
        return new ResponseEntity<>(updatedUser, HttpStatus.OK);
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<User> updateUserRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> roleUpdate) {
        
        String role = roleUpdate.get("role");
        if (role == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        
        Optional<User> userOpt = userService.getUserById(id);
        if (userOpt.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        
        User user = userOpt.get();
        
        // Check if trying to remove admin role from the last admin
        if (!role.equals("ROLE_ADMIN")) {
            boolean isCurrentlyAdmin = user.getRoles().stream()
                    .anyMatch(r -> r.getName().name().equals("ROLE_ADMIN"));
            
            if (isCurrentlyAdmin) {
                long adminCount = userService.countUsersByRole("ROLE_ADMIN");
                if (adminCount <= 1) {
                    return new ResponseEntity<>(HttpStatus.FORBIDDEN);
                }
            }
        }
        
        // Update user role
        User updatedUser = userService.updateUserRole(user, role);
        return new ResponseEntity<>(updatedUser, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<HttpStatus> deleteUser(@PathVariable Long id) {
        Optional<User> userOpt = userService.getUserById(id);
        
        if (userOpt.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
        
        User user = userOpt.get();
        
        // Check if trying to delete the last admin
        boolean isAdmin = user.getRoles().stream()
                .anyMatch(role -> role.getName().name().equals("ROLE_ADMIN"));
        
        if (isAdmin) {
            long adminCount = userService.countUsersByRole("ROLE_ADMIN");
            if (adminCount <= 1) {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        }
        
        userService.deleteUser(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<?> resetUserPassword(@PathVariable Long id) {
        System.out.println("Received password reset request for user ID: " + id);
        
        boolean success = userService.resetPassword(id);
        
        if (success) {
            System.out.println("Password reset successful for user ID: " + id);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Password has been reset successfully. A temporary password has been sent to the user's email.");
            return new ResponseEntity<>(response, HttpStatus.OK);
        } else {
            System.out.println("Password reset failed - user not found with ID: " + id);
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }
}