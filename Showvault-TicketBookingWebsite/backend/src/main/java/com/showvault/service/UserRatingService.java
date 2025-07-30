package com.showvault.service;

import com.showvault.model.Show;
import com.showvault.model.UserRating;
import com.showvault.model.User;

import java.util.List;
import java.util.Optional;

public interface UserRatingService {
    
    List<UserRating> getUserRatings(User user);
    
    List<UserRating> getShowRatings(Show show);
    
    Optional<UserRating> getUserRating(Long id);
    
    Optional<UserRating> getUserRatingByUserAndShow(User user, Show show);
    
    UserRating addRating(User user, Show show, Integer rating, String review);
    
    UserRating updateRating(Long id, Integer rating, String review);
    
    boolean deleteRating(Long id);
    
    Double getAverageRatingForShow(Show show);
    
    Long getRatingCountForShow(Show show);
    
    boolean hasUserRatedShow(User user, Show show);
}