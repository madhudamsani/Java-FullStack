package com.showvault.controller;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.showvault.model.ERole;
import com.showvault.model.Role;
import com.showvault.model.User;
import com.showvault.repository.RoleRepository;
import com.showvault.repository.UserRepository;
import com.showvault.security.jwt.JwtUtils;
import com.showvault.security.services.UserDetailsImpl;
import com.showvault.dto.JwtResponse;
import com.showvault.dto.LoginRequest;
import com.showvault.dto.MessageResponse;
import com.showvault.dto.SignupRequest;
import com.showvault.service.UserService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(AuthController.class);
    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    RoleRepository roleRepository;

    @Autowired
    UserService userService;

    @Autowired
    JwtUtils jwtUtils;

    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            // Log the login attempt
            System.out.println("Login attempt for username: " + loginRequest.getUsername());
            
            // Check if user exists before attempting authentication
            boolean userExists = userRepository.findByUsername(loginRequest.getUsername()).isPresent() || 
                                userRepository.findByEmail(loginRequest.getUsername()).isPresent();
            
            if (!userExists) {
                System.out.println("User not found with username/email: " + loginRequest.getUsername());
                return ResponseEntity.status(401).body(new MessageResponse("Error: User not found"));
            }
            
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);
            
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            List<String> roles = userDetails.getAuthorities().stream()
                    .map(item -> item.getAuthority())
                    .collect(Collectors.toList());

            System.out.println("Login successful for user: " + userDetails.getUsername());
            
            return ResponseEntity.ok(new JwtResponse(jwt, 
                                     userDetails.getId(), 
                                     userDetails.getUsername(), 
                                     userDetails.getEmail(), 
                                     roles));
        } catch (Exception e) {
            System.out.println("Authentication error: " + e.getMessage());
            return ResponseEntity.status(401).body(new MessageResponse("Error: " + e.getMessage()));
        }
    }

    @GetMapping("/check-user/{identifier}")
    public ResponseEntity<?> checkUserExists(@PathVariable String identifier) {
        boolean userExists = userRepository.findByUsername(identifier).isPresent() || 
                            userRepository.findByEmail(identifier).isPresent();
        
        return ResponseEntity.ok(new MessageResponse("User exists: " + userExists));
    }
    
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody(required = false) Map<String, String> tokenRequest) {
        try {
            logger.info("Token refresh request received");
            
            // Get token from request body
            String token = null;
            if (tokenRequest != null && tokenRequest.containsKey("token")) {
                token = tokenRequest.get("token");
                logger.info("Token received from request body");
            }
            
            // If no token in body, try to get from Authorization header
            if (token == null) {
                Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
                if (authentication != null && authentication.isAuthenticated() && 
                    authentication.getPrincipal() instanceof UserDetailsImpl) {
                    
                    UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
                    logger.info("Generating new token for authenticated user: {}", userDetails.getUsername());
                    
                    // Generate new token
                    String newToken = jwtUtils.generateJwtToken(authentication);
                    
                    // Get user roles
                    List<String> roles = userDetails.getAuthorities().stream()
                            .map(item -> item.getAuthority())
                            .collect(Collectors.toList());
                    
                    return ResponseEntity.ok(new JwtResponse(newToken, 
                                             userDetails.getId(), 
                                             userDetails.getUsername(), 
                                             userDetails.getEmail(), 
                                             roles));
                } else {
                    logger.warn("No authentication found in security context");
                    return ResponseEntity.status(401).body(new MessageResponse("Error: No valid authentication found"));
                }
            }
            
            // Validate the token
            if (!jwtUtils.validateJwtToken(token)) {
                logger.warn("Invalid token provided for refresh");
                return ResponseEntity.status(401).body(new MessageResponse("Error: Invalid token"));
            }
            
            // Extract username from token
            String username = jwtUtils.getUserNameFromJwtToken(token);
            logger.info("Token valid, refreshing for user: {}", username);
            
            // Get user details
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found with username: " + username));
            
            // Create authentication object
            UserDetailsImpl userDetails = UserDetailsImpl.build(user);
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());
            
            // Generate new token
            String newToken = jwtUtils.generateJwtToken(authentication);
            
            // Get user roles
            List<String> roles = userDetails.getAuthorities().stream()
                    .map(item -> item.getAuthority())
                    .collect(Collectors.toList());
            
            logger.info("Token refreshed successfully for user: {}", username);
            
            return ResponseEntity.ok(new JwtResponse(newToken, 
                                     userDetails.getId(), 
                                     userDetails.getUsername(), 
                                     userDetails.getEmail(), 
                                     roles));
        } catch (Exception e) {
            logger.error("Error refreshing token: {}", e.getMessage(), e);
            return ResponseEntity.status(401).body(new MessageResponse("Error: " + e.getMessage()));
        }
    }
    
    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Username is already taken!"));
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Email is already in use!"));
        }

        // Create new user's account
        User user = new User();
        user.setUsername(signUpRequest.getUsername());
        user.setEmail(signUpRequest.getEmail());
        user.setPassword(signUpRequest.getPassword());
        user.setFirstName(signUpRequest.getFirstName());
        user.setLastName(signUpRequest.getLastName());
        user.setPhoneNumber(signUpRequest.getPhoneNumber());

        Set<String> strRoles = signUpRequest.getRoles();
        Set<Role> roles = new HashSet<>();

        if (strRoles == null || strRoles.isEmpty()) {
            Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                    .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            roles.add(userRole);
        } else {
            strRoles.forEach(role -> {
                switch (role.toLowerCase()) {
                case "admin":
                    Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                    roles.add(adminRole);
                    break;
                case "organizer":
                    Role organizerRole = roleRepository.findByName(ERole.ROLE_ORGANIZER)
                            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                    roles.add(organizerRole);
                    break;
                default:
                    Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                    roles.add(userRole);
                }
            });
        }

        user.setRoles(roles);
        
        try {
            // Register the user
            User savedUser = userService.registerUser(user, null); // null because we're setting roles manually
            
            // Generate JWT token for the new user
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(signUpRequest.getUsername(), signUpRequest.getPassword()));
            
            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);
            
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            List<String> userRoles = userDetails.getAuthorities().stream()
                    .map(item -> item.getAuthority())
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(new JwtResponse(jwt, 
                                     userDetails.getId(), 
                                     userDetails.getUsername(), 
                                     userDetails.getEmail(), 
                                     userRoles));
        } catch (Exception e) {
            // Log the error
            System.out.println("Registration error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(new MessageResponse("Error: " + e.getMessage()));
        }
    }
}