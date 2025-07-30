package com.showvault.config;

import com.showvault.security.jwt.AuthEntryPointJwt;
import com.showvault.security.jwt.AuthTokenFilter;
import com.showvault.security.jwt.JwtUtils;
import com.showvault.security.services.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private AuthEntryPointJwt unauthorizedHandler;
    
    @Autowired
    private JwtUtils jwtUtils;
    
    @Bean
    public UserDetailsServiceImpl userDetailsService() {
        return new UserDetailsServiceImpl();
    }

    @Bean
    public AuthTokenFilter authenticationJwtTokenFilter(JwtUtils jwtUtils) {
        return new AuthTokenFilter(jwtUtils, userDetailsService());
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService());
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.cors(cors -> cors.configure(http))
            .csrf(csrf -> csrf.disable())
            .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> 
                auth.requestMatchers("/api/auth/**").permitAll()
                    .requestMatchers("/api-docs/**").permitAll()
                    .requestMatchers("/swagger-ui/**").permitAll()
                    .requestMatchers("/api/shows/**").permitAll()
                    .requestMatchers("/api/venues/**").permitAll()
                    .requestMatchers("/api/seats/**").permitAll()
                    .requestMatchers("/api/schedules/**").permitAll()
                    // WebSocket endpoints - permit all for connection establishment
                    .requestMatchers("/api/ws/**").permitAll()
                    // Public endpoints for show information
                    .requestMatchers(HttpMethod.GET, "/api/ratings/show/*/average").permitAll()
                    // Public promotion endpoints
                    .requestMatchers(HttpMethod.GET, "/api/promotions/active").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/promotions/validate/**").permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/promotions/calculate").permitAll()
                    // User-specific endpoints (require authentication)
                    .requestMatchers("/api/favorites/**").authenticated()
                    .requestMatchers("/api/ratings/**").authenticated()
                    .requestMatchers("/api/notifications/**").authenticated()
                    .requestMatchers("/api/bookings/**").authenticated()
                    // Organizer-specific endpoints
                    .requestMatchers("/api/promotions/**").hasAnyRole("ORGANIZER", "ADMIN")
                    .requestMatchers("/api/messages/**").hasAnyRole("ORGANIZER", "ADMIN")
                    .requestMatchers("/api/analytics/shows/**").hasAnyRole("ORGANIZER", "ADMIN")
                    .requestMatchers("/api/analytics/organizer/**").hasAnyRole("ORGANIZER", "ADMIN")
                    // Admin-specific endpoints
                    .requestMatchers("/api/admin/**").hasRole("ADMIN")
                    .anyRequest().authenticated()
            );

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(authenticationJwtTokenFilter(jwtUtils), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}