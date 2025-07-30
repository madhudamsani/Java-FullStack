package com.showvault.security.jwt;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import java.security.Key;
import java.util.Base64;
import jakarta.annotation.PostConstruct;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import com.showvault.security.services.UserDetailsImpl;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import io.jsonwebtoken.SignatureAlgorithm;

@Component
public class JwtUtils {
    private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);

    @Value("${jwt.secret}")
    private String jwtSecret;
    
    // Old secret key (for backward compatibility)
    private static final String OLD_JWT_SECRET = "showVaultSecretKey2023ForSecureTokenGenerationAndValidation";

    @Value("${jwt.expiration}")
    private int jwtExpirationMs;
    
    // Keys for different algorithms
    private Key currentKeyHS256;
    private Key oldKeyHS256;
    private Key oldKeyHS512;
    
    @PostConstruct
    public void init() {
        // Initialize keys for different algorithms
        try {
            // Current key for HS256
            this.currentKeyHS256 = Keys.hmacShaKeyFor(jwtSecret.getBytes());
            
            // Old key for HS256
            this.oldKeyHS256 = Keys.hmacShaKeyFor(OLD_JWT_SECRET.getBytes());
            
            // Old key for HS512 - use a secure key generation method
            this.oldKeyHS512 = Keys.secretKeyFor(SignatureAlgorithm.HS512);
            
            logger.info("JWT keys initialized successfully for multiple algorithms");
        } catch (Exception e) {
            logger.error("Error initializing JWT keys: {}", e.getMessage());
        }
    }

    public String generateJwtToken(Authentication authentication) {
        UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();
        
        // Create claims with user roles
        Map<String, Object> claims = new HashMap<>();
        claims.put("id", userPrincipal.getId());
        claims.put("email", userPrincipal.getEmail());
        claims.put("roles", userPrincipal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList()));

        // Add a key ID to identify which key was used
        Map<String, Object> header = new HashMap<>();
        header.put("kid", "current-hs256");
        
        return Jwts.builder()
                .setHeader(header)
                .setClaims(claims)
                .setSubject(userPrincipal.getUsername())
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(currentKeyHS256, SignatureAlgorithm.HS256)
                .compact();
    }

    public String getUserNameFromJwtToken(String token) {
        Claims claims = getAllClaimsFromJwtToken(token);
        return claims != null ? claims.getSubject() : null;
    }
    
    public Claims getAllClaimsFromJwtToken(String token) {
        // Try all available keys and algorithms
        Exception lastException = null;
        
        // Try to extract the algorithm from the token header
        String algorithm = getAlgorithmFromToken(token);
        logger.debug("Token algorithm: {}", algorithm);
        
        // Try with current key (HS256)
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(currentKeyHS256)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (Exception e) {
            lastException = e;
            logger.debug("Failed to validate with current HS256 key: {}", e.getMessage());
        }
        
        // Try with old key (HS256)
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(oldKeyHS256)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (Exception e) {
            lastException = e;
            logger.debug("Failed to validate with old HS256 key: {}", e.getMessage());
        }
        
        // Try with old key (HS512)
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(oldKeyHS512)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (Exception e) {
            lastException = e;
            logger.debug("Failed to validate with old HS512 key: {}", e.getMessage());
        }
        
        // If we get here, all validation attempts failed
        if (lastException != null) {
            logger.error("All token validation attempts failed. Last error: {}", lastException.getMessage());
        }
        
        return null;
    }

    public boolean validateJwtToken(String authToken) {
        if (authToken == null || authToken.isEmpty()) {
            logger.error("JWT token is empty");
            return false;
        }
        
        try {
            // Try to get claims - this will throw an exception if validation fails
            Claims claims = getAllClaimsFromJwtToken(authToken);
            
            if (claims == null) {
                logger.error("JWT token validation failed with all keys");
                return false;
            }
            
            // Check if token is expired
            Date expiration = claims.getExpiration();
            if (expiration != null && expiration.before(new Date())) {
                logger.error("JWT token is expired");
                return false;
            }
            
            return true;
        } catch (MalformedJwtException e) {
            logger.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            logger.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            logger.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.error("JWT claims string is empty: {}", e.getMessage());
        } catch (Exception e) {
            logger.error("JWT validation error: {}", e.getMessage());
        }

        return false;
    }
    
    /**
     * Extract the algorithm from the JWT token header
     */
    private String getAlgorithmFromToken(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return null;
            }
            
            String headerJson = new String(Base64.getUrlDecoder().decode(parts[0]));
            if (headerJson.contains("\"alg\"")) {
                // Simple string extraction - in production, use a proper JSON parser
                int start = headerJson.indexOf("\"alg\"") + 7;
                int end = headerJson.indexOf("\"", start);
                if (start > 0 && end > start) {
                    return headerJson.substring(start, end);
                }
            }
        } catch (Exception e) {
            logger.error("Error extracting algorithm from token: {}", e.getMessage());
        }
        return null;
    }
}