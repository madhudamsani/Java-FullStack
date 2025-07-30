package com.showvault.controller;

import com.showvault.model.Show;
import com.showvault.model.ShowAnalytics;
import com.showvault.model.User;
import com.showvault.security.services.UserDetailsImpl;
import com.showvault.service.ShowAnalyticsService;
import com.showvault.service.ShowService;
import com.showvault.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/analytics")
public class ShowAnalyticsController {

    @Autowired
    private ShowAnalyticsService showAnalyticsService;

    @Autowired
    private ShowService showService;

    @Autowired
    private UserService userService;

    @GetMapping("/shows/{showId}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> getShowAnalytics(@PathVariable Long showId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<Show> showOpt = showService.getShowById(showId);
        
        if (showOpt.isPresent()) {
            Show show = showOpt.get();
            
            // Check if the user is the creator of the show or an admin
            if (show.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                ShowAnalytics analytics = showAnalyticsService.getShowAnalytics(showId);
                return new ResponseEntity<>(analytics, HttpStatus.OK);
            } else {
                return new ResponseEntity<>("You don't have permission to view analytics for this show", HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/organizer/dashboard")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> getOrganizerDashboardStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            Map<String, Object> stats;
            if (startDate != null && endDate != null) {
                stats = showAnalyticsService.getOrganizerDashboardStats(user, startDate, endDate);
            } else {
                stats = showAnalyticsService.getOrganizerDashboardStats(user);
            }
            
            return new ResponseEntity<>(stats, HttpStatus.OK);
        } else {
            return new ResponseEntity<>("User not found", HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/organizer/top-shows")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> getTopPerformingShows(@RequestParam(defaultValue = "5") int limit) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            List<Map<String, Object>> topShows = showAnalyticsService.getTopPerformingShows(user, limit);
            return new ResponseEntity<>(topShows, HttpStatus.OK);
        } else {
            return new ResponseEntity<>("User not found", HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/shows/{showId}/performance")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> getShowPerformanceMetrics(@PathVariable Long showId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<Show> showOpt = showService.getShowById(showId);
        
        if (showOpt.isPresent()) {
            Show show = showOpt.get();
            
            // Check if the user is the creator of the show or an admin
            if (show.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                Map<String, Object> metrics = showAnalyticsService.getShowPerformanceMetrics(showId);
                return new ResponseEntity<>(metrics, HttpStatus.OK);
            } else {
                return new ResponseEntity<>("You don't have permission to view performance metrics for this show", HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/shows/{showId}/audience")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> getAudienceInsights(@PathVariable Long showId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<Show> showOpt = showService.getShowById(showId);
        
        if (showOpt.isPresent()) {
            Show show = showOpt.get();
            
            // Check if the user is the creator of the show or an admin
            if (show.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                Map<String, Object> insights = showAnalyticsService.getAudienceInsights(showId);
                return new ResponseEntity<>(insights, HttpStatus.OK);
            } else {
                return new ResponseEntity<>("You don't have permission to view audience insights for this show", HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/shows/{showId}/sales")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> getSalesAnalytics(@PathVariable Long showId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<Show> showOpt = showService.getShowById(showId);
        
        if (showOpt.isPresent()) {
            Show show = showOpt.get();
            
            // Check if the user is the creator of the show or an admin
            if (show.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                Map<String, Object> analytics = showAnalyticsService.getSalesAnalytics(showId);
                return new ResponseEntity<>(analytics, HttpStatus.OK);
            } else {
                return new ResponseEntity<>("You don't have permission to view sales analytics for this show", HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/shows/{showId}/promotions")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> getPromotionAnalytics(@PathVariable Long showId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<Show> showOpt = showService.getShowById(showId);
        
        if (showOpt.isPresent()) {
            Show show = showOpt.get();
            
            // Check if the user is the creator of the show or an admin
            if (show.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                Map<String, Object> analytics = showAnalyticsService.getPromotionAnalytics(showId);
                return new ResponseEntity<>(analytics, HttpStatus.OK);
            } else {
                return new ResponseEntity<>("You don't have permission to view promotion analytics for this show", HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/shows/{showId}/booking-trends")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> getBookingTrends(
            @PathVariable Long showId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<Show> showOpt = showService.getShowById(showId);
        
        if (showOpt.isPresent()) {
            Show show = showOpt.get();
            
            // Check if the user is the creator of the show or an admin
            if (show.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                Map<String, Object> trends = showAnalyticsService.getBookingTrends(showId, startDate, endDate);
                return new ResponseEntity<>(trends, HttpStatus.OK);
            } else {
                return new ResponseEntity<>("You don't have permission to view booking trends for this show", HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/shows/{showId}/revenue-breakdown")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> getRevenueBreakdown(@PathVariable Long showId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<Show> showOpt = showService.getShowById(showId);
        
        if (showOpt.isPresent()) {
            Show show = showOpt.get();
            
            // Check if the user is the creator of the show or an admin
            if (show.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                Map<String, Object> breakdown = showAnalyticsService.getRevenueBreakdown(showId);
                return new ResponseEntity<>(breakdown, HttpStatus.OK);
            } else {
                return new ResponseEntity<>("You don't have permission to view revenue breakdown for this show", HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/shows/{showId}/occupancy")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> getOccupancyRates(@PathVariable Long showId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<Show> showOpt = showService.getShowById(showId);
        
        if (showOpt.isPresent()) {
            Show show = showOpt.get();
            
            // Check if the user is the creator of the show or an admin
            if (show.getCreatedBy().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                Map<String, Object> occupancy = showAnalyticsService.getOccupancyRates(showId);
                return new ResponseEntity<>(occupancy, HttpStatus.OK);
            } else {
                return new ResponseEntity<>("You don't have permission to view occupancy rates for this show", HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
        }
    }
}