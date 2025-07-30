package com.showvault.security.websocket;

import com.showvault.security.jwt.JwtUtils;
import com.showvault.security.services.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import java.util.logging.Logger;

/**
 * WebSocket authentication channel interceptor
 * Handles authentication for WebSocket connections using JWT tokens
 */
@Component
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {
    private static final Logger logger = Logger.getLogger(WebSocketAuthChannelInterceptor.class.getName());

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            logger.info("WebSocket connection attempt detected");
            
            // Try to extract JWT token from various sources
            String jwt = extractToken(accessor);
            
            // If no token found, allow connection without authentication
            if (jwt == null) {
                logger.info("No authentication token found, allowing connection without authentication");
                return message;
            }
            
            // Validate JWT token and set authentication
            authenticateConnection(accessor, jwt);
        }
        
        return message;
    }
    
    /**
     * Extract JWT token from various sources
     * @param accessor StompHeaderAccessor
     * @return JWT token or null if not found
     */
    private String extractToken(StompHeaderAccessor accessor) {
        // 1. Try Authorization header
        String authorizationHeader = accessor.getFirstNativeHeader("Authorization");
        if (authorizationHeader != null) {
            logger.info("Authorization header found");
            String jwt = parseJwt(authorizationHeader);
            if (jwt != null) {
                return jwt;
            }
        }
        
        // 2. Try X-Auth-Token header
        String authToken = accessor.getFirstNativeHeader("X-Auth-Token");
        if (authToken != null) {
            logger.info("X-Auth-Token header found");
            return authToken;
        }
        
        // 3. Try token parameter in URL
        String tokenParam = accessor.getFirstNativeHeader("token");
        if (tokenParam != null) {
            logger.info("Token parameter found in URL");
            return tokenParam;
        }
        
        // 4. Try session attributes
        Object sessionAttr = accessor.getSessionAttributes();
        if (sessionAttr != null && sessionAttr instanceof java.util.Map) {
            @SuppressWarnings("unchecked")
            java.util.Map<String, Object> attrs = (java.util.Map<String, Object>) sessionAttr;
            Object token = attrs.get("token");
            if (token != null) {
                logger.info("Token found in session attributes");
                return token.toString();
            }
        }
        
        logger.info("No token found in any source");
        return null;
    }
    
    /**
     * Authenticate WebSocket connection using JWT token
     * @param accessor StompHeaderAccessor
     * @param jwt JWT token
     */
    private void authenticateConnection(StompHeaderAccessor accessor, String jwt) {
        try {
            if (jwtUtils.validateJwtToken(jwt)) {
                String username = jwtUtils.getUserNameFromJwtToken(jwt);
                logger.info("Valid token for user: " + username);
                
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                
                UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                
                SecurityContextHolder.getContext().setAuthentication(authentication);
                accessor.setUser(authentication);
                logger.info("Authentication set for WebSocket connection");
            } else {
                logger.warning("Invalid token provided for WebSocket connection");
            }
        } catch (Exception e) {
            logger.warning("Error validating token: " + e.getMessage());
        }
    }
    
    /**
     * Parse JWT token from Authorization header
     * @param authorizationHeader Authorization header value
     * @return JWT token or null if not valid
     */
    private String parseJwt(String authorizationHeader) {
        if (StringUtils.hasText(authorizationHeader) && authorizationHeader.startsWith("Bearer ")) {
            return authorizationHeader.substring(7);
        }
        return null;
    }
}