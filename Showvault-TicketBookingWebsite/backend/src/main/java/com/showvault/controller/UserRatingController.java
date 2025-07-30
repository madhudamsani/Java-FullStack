package com.showvault.controller;

import com.showvault.model.Show;
import com.showvault.model.UserRating;
import com.showvault.model.User;
import com.showvault.security.services.UserDetailsImpl;
import com.showvault.service.ShowService;
import com.showvault.service.UserRatingService;
import com.showvault.service.UserService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/ratings")
public class UserRatingController {

    @Autowired
    private UserRatingService userRatingService;

    @Autowired
    private UserService userService;

    @Autowired
    private ShowService showService;

    @GetMapping
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<List<UserRating>> getUserRatings() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        if (userOpt.isPresent()) {
            List<UserRating> ratings = userRatingService.getUserRatings(userOpt.get());
            return new ResponseEntity<>(ratings, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/show/{showId}")
    public ResponseEntity<List<UserRating>> getShowRatings(@PathVariable Long showId) {
        Optional<Show> showOpt = showService.getShowById(showId);
        
        if (showOpt.isPresent()) {
            List<UserRating> ratings = userRatingService.getShowRatings(showOpt.get());
            return new ResponseEntity<>(ratings, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<UserRating> getRatingById(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<UserRating> ratingOpt = userRatingService.getUserRating(id);
        
        if (ratingOpt.isPresent()) {
            UserRating rating = ratingOpt.get();
            
            // Check if the rating belongs to the current user or if the user is an admin
            if (rating.getUser().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                return new ResponseEntity<>(rating, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping("/show/{showId}")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> addRating(
            @PathVariable Long showId,
            @RequestBody Map<String, Object> ratingData) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        Optional<Show> showOpt = showService.getShowById(showId);
        
        if (userOpt.isPresent() && showOpt.isPresent()) {
            User user = userOpt.get();
            Show show = showOpt.get();
            
            // Check if user has already rated this show
            if (userRatingService.hasUserRatedShow(user, show)) {
                return new ResponseEntity<>("User has already rated this show", HttpStatus.BAD_REQUEST);
            }
            
            Integer rating = (Integer) ratingData.get("rating");
            String review = (String) ratingData.get("review");
            
            if (rating == null || rating < 1 || rating > 5) {
                return new ResponseEntity<>("Rating must be between 1 and 5", HttpStatus.BAD_REQUEST);
            }
            
            UserRating newRating = userRatingService.addRating(user, show, rating, review);
            return new ResponseEntity<>(newRating, HttpStatus.CREATED);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> updateRating(
            @PathVariable Long id,
            @RequestBody Map<String, Object> ratingData) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<UserRating> ratingOpt = userRatingService.getUserRating(id);
        
        if (ratingOpt.isPresent()) {
            UserRating rating = ratingOpt.get();
            
            // Check if the rating belongs to the current user or if the user is an admin
            if (rating.getUser().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                Integer ratingValue = (Integer) ratingData.get("rating");
                String review = (String) ratingData.get("review");
                
                if (ratingValue == null || ratingValue < 1 || ratingValue > 5) {
                    return new ResponseEntity<>("Rating must be between 1 and 5", HttpStatus.BAD_REQUEST);
                }
                
                UserRating updatedRating = userRatingService.updateRating(id, ratingValue, review);
                return new ResponseEntity<>(updatedRating, HttpStatus.OK);
            } else {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> deleteRating(@PathVariable Long id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<UserRating> ratingOpt = userRatingService.getUserRating(id);
        
        if (ratingOpt.isPresent()) {
            UserRating rating = ratingOpt.get();
            
            // Check if the rating belongs to the current user or if the user is an admin
            if (rating.getUser().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                
                boolean deleted = userRatingService.deleteRating(id);
                if (deleted) {
                    return new ResponseEntity<>(HttpStatus.NO_CONTENT);
                } else {
                    return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
                }
            } else {
                return new ResponseEntity<>(HttpStatus.FORBIDDEN);
            }
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/show/{showId}/average")
    public ResponseEntity<Map<String, Object>> getShowRatingStats(@PathVariable Long showId) {
        Optional<Show> showOpt = showService.getShowById(showId);
        
        if (showOpt.isPresent()) {
            Show show = showOpt.get();
            Double averageRating = userRatingService.getAverageRatingForShow(show);
            Long ratingCount = userRatingService.getRatingCountForShow(show);
            
            Map<String, Object> stats = Map.of(
                "averageRating", averageRating != null ? averageRating : 0.0,
                "ratingCount", ratingCount
            );
            
            return new ResponseEntity<>(stats, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/show/{showId}/check")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<Boolean> checkUserRated(@PathVariable Long showId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        Optional<Show> showOpt = showService.getShowById(showId);
        
        if (userOpt.isPresent() && showOpt.isPresent()) {
            User user = userOpt.get();
            Show show = showOpt.get();
            
            boolean hasRated = userRatingService.hasUserRatedShow(user, show);
            return new ResponseEntity<>(hasRated, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }
}