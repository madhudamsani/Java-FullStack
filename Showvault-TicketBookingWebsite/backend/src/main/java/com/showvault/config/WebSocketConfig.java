package com.showvault.config;

import com.showvault.security.websocket.WebSocketAuthChannelInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import java.util.Arrays;
import java.util.List;

/**
 * Configuration for WebSocket support
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    // Define specific allowed origins
    private static final List<String> ALLOWED_ORIGINS = Arrays.asList(
        "http://localhost:4200",     // Angular dev server
        "http://localhost:8080",     // Spring Boot dev server
        "http://localhost"           // General localhost
    );

    @Autowired
    private WebSocketAuthChannelInterceptor webSocketAuthChannelInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple in-memory message broker for topics
        config.enableSimpleBroker("/topic", "/queue");
        
        // Set prefix for application destinations
        config.setApplicationDestinationPrefixes("/app");
        
        // Set prefix for user-specific destinations
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register the "/api/ws" endpoint, enabling SockJS fallback options
        registry.addEndpoint("/api/ws")
                .setAllowedOriginPatterns("*")
                .setAllowedOrigins(ALLOWED_ORIGINS.toArray(new String[0]))
                .withSockJS();
    }
    
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Add our custom authentication channel interceptor
        registration.interceptors(webSocketAuthChannelInterceptor);
    }
}