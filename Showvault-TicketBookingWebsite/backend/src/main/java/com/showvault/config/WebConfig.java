package com.showvault.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.util.Arrays;
import java.util.List;

/**
 * Web configuration for CORS and other web-related settings
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    // Define specific allowed origins
    private static final List<String> ALLOWED_ORIGINS = Arrays.asList(
        "http://localhost:4200",     // Angular dev server
        "http://localhost:8080",     // Spring Boot dev server
        "http://localhost"           // General localhost
    );
    
    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // Use the defined list of allowed origins instead of wildcard
        ALLOWED_ORIGINS.forEach(config::addAllowedOrigin);
        config.addAllowedOriginPattern("*"); // For development flexibility
        
        // Allow all headers
        config.addAllowedHeader("*");
        
        // Allow all methods
        config.addAllowedMethod("*");
        
        // Allow credentials (important for WebSocket)
        config.setAllowCredentials(true);
        
        // Set max age for preflight requests
        config.setMaxAge(3600L); // 1 hour cache for preflight requests
        
        // Apply configuration to all paths
        source.registerCorsConfiguration("/**", config);
        source.registerCorsConfiguration("/api/ws/**", config);
        
        System.out.println("CORS configuration applied: allowing origins: " + ALLOWED_ORIGINS);
        
        return new CorsFilter(source);
    }
}