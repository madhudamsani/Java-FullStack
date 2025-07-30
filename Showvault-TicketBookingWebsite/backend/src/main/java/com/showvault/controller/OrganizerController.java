package com.showvault.controller;

import com.showvault.model.Show;
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
@RequestMapping("/api/organizer")
public class OrganizerController {

    @Autowired
    private ShowService showService;

    @Autowired
    private UserService userService;

    @Autowired
    private ShowAnalyticsService showAnalyticsService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> getDashboardStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        System.out.println("OrganizerController: getDashboardStats called with startDate=" + startDate + ", endDate=" + endDate);
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            System.out.println("OrganizerController: Authentication is null");
            return new ResponseEntity<>("Authentication required", HttpStatus.UNAUTHORIZED);
        }
        
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof UserDetailsImpl)) {
            System.out.println("OrganizerController: Principal is not UserDetailsImpl but " + principal.getClass().getName());
            return new ResponseEntity<>("Invalid authentication", HttpStatus.UNAUTHORIZED);
        }
        
        UserDetailsImpl userDetails = (UserDetailsImpl) principal;
        System.out.println("OrganizerController: User ID from token: " + userDetails.getId());
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            System.out.println("OrganizerController: Found user: " + user.getUsername() + " with ID: " + user.getId());
            
            Map<String, Object> stats;
            if (startDate != null && endDate != null) {
                stats = showAnalyticsService.getOrganizerDashboardStats(user, startDate, endDate);
            } else {
                stats = showAnalyticsService.getOrganizerDashboardStats(user);
            }
            
            System.out.println("OrganizerController: Returning stats with " + (stats != null ? stats.size() : 0) + " entries");
            return new ResponseEntity<>(stats, HttpStatus.OK);
        } else {
            System.out.println("OrganizerController: User not found for ID: " + userDetails.getId());
            return new ResponseEntity<>("User not found", HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/shows")
    @PreAuthorize("hasRole('ORGANIZER')")
    public ResponseEntity<List<Show>> getMyShows() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        if (userOpt.isPresent()) {
            List<Show> shows = showService.getShowsByCreator(userOpt.get());
            return new ResponseEntity<>(shows, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/sales-report")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> getSalesReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) Long showId) {
        
        System.out.println("OrganizerController: getSalesReport called with dateFrom=" + dateFrom + ", dateTo=" + dateTo + ", showId=" + showId);
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            System.out.println("OrganizerController: Authentication is null");
            return new ResponseEntity<>("Authentication required", HttpStatus.UNAUTHORIZED);
        }
        
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof UserDetailsImpl)) {
            System.out.println("OrganizerController: Principal is not UserDetailsImpl but " + principal.getClass().getName());
            return new ResponseEntity<>("Invalid authentication", HttpStatus.UNAUTHORIZED);
        }
        
        UserDetailsImpl userDetails = (UserDetailsImpl) principal;
        System.out.println("OrganizerController: User ID from token: " + userDetails.getId());
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            System.out.println("OrganizerController: Found user: " + user.getUsername() + " with ID: " + user.getId());
            
            // If showId is provided, verify the show belongs to this organizer
            if (showId != null) {
                Optional<Show> showOpt = showService.getShowById(showId);
                if (showOpt.isPresent()) {
                    Show show = showOpt.get();
                    if (!show.getCreatedBy().getId().equals(user.getId()) && 
                            !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                        System.out.println("OrganizerController: User does not have permission to view show " + showId);
                        return new ResponseEntity<>("You don't have permission to view sales for this show", HttpStatus.FORBIDDEN);
                    }
                } else {
                    System.out.println("OrganizerController: Show not found with ID: " + showId);
                    return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
                }
            }
            
            Map<String, Object> salesReport = showAnalyticsService.getSalesReport(user, dateFrom, dateTo, showId);
            System.out.println("OrganizerController: Returning sales report with " + (salesReport != null ? salesReport.size() : 0) + " entries");
            return new ResponseEntity<>(salesReport, HttpStatus.OK);
        } else {
            System.out.println("OrganizerController: User not found for ID: " + userDetails.getId());
            return new ResponseEntity<>("User not found", HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/audience-demographics")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> getAudienceDemographics(
            @RequestParam(required = false) Long showId) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            // If showId is provided, verify the show belongs to this organizer
            if (showId != null) {
                Optional<Show> showOpt = showService.getShowById(showId);
                if (showOpt.isPresent()) {
                    Show show = showOpt.get();
                    if (!show.getCreatedBy().getId().equals(user.getId()) && 
                            !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                        return new ResponseEntity<>("You don't have permission to view audience data for this show", HttpStatus.FORBIDDEN);
                    }
                } else {
                    return new ResponseEntity<>("Show not found", HttpStatus.NOT_FOUND);
                }
            }
            
            Map<String, Object> demographics = showAnalyticsService.getAudienceDemographics(user, showId);
            return new ResponseEntity<>(demographics, HttpStatus.OK);
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
}