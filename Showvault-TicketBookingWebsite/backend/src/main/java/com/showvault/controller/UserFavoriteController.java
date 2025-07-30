package com.showvault.controller;

import com.showvault.model.Show;
import com.showvault.model.UserFavorite;
import com.showvault.model.User;
import com.showvault.security.services.UserDetailsImpl;
import com.showvault.service.ShowService;
import com.showvault.service.UserFavoriteService;
import com.showvault.service.UserService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/favorites")
public class UserFavoriteController {

    @Autowired
    private UserFavoriteService userFavoriteService;

    @Autowired
    private UserService userService;

    @Autowired
    private ShowService showService;

    @GetMapping
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<List<Show>> getUserFavorites() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        if (userOpt.isPresent()) {
            List<Show> favorites = userFavoriteService.getUserFavoriteShows(userOpt.get());
            return new ResponseEntity<>(favorites, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping("/{showId}")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> addFavorite(@PathVariable Long showId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        Optional<Show> showOpt = showService.getShowById(showId);
        
        if (userOpt.isPresent() && showOpt.isPresent()) {
            User user = userOpt.get();
            Show show = showOpt.get();
            
            if (userFavoriteService.isFavorite(user, show)) {
                return new ResponseEntity<>("Show is already in favorites", HttpStatus.BAD_REQUEST);
            }
            
            UserFavorite favorite = userFavoriteService.addFavorite(user, show);
            return new ResponseEntity<>(favorite, HttpStatus.CREATED);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @DeleteMapping("/{showId}")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<?> removeFavorite(@PathVariable Long showId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        Optional<Show> showOpt = showService.getShowById(showId);
        
        if (userOpt.isPresent() && showOpt.isPresent()) {
            User user = userOpt.get();
            Show show = showOpt.get();
            
            boolean removed = userFavoriteService.removeFavorite(user, show);
            if (removed) {
                return new ResponseEntity<>(HttpStatus.NO_CONTENT);
            } else {
                return new ResponseEntity<>("Show is not in favorites", HttpStatus.BAD_REQUEST);
            }
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping("/check/{showId}")
    @PreAuthorize("hasRole('USER') or hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<Boolean> checkFavorite(@PathVariable Long showId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> userOpt = userService.getUserById(userDetails.getId());
        Optional<Show> showOpt = showService.getShowById(showId);
        
        if (userOpt.isPresent() && showOpt.isPresent()) {
            User user = userOpt.get();
            Show show = showOpt.get();
            
            boolean isFavorite = userFavoriteService.isFavorite(user, show);
            return new ResponseEntity<>(isFavorite, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }
}