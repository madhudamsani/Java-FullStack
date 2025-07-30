package com.showvault.service;

import com.showvault.model.Show;
import com.showvault.model.UserFavorite;
import com.showvault.model.User;

import java.util.List;
import java.util.Optional;

public interface UserFavoriteService {
    
    List<UserFavorite> getUserFavorites(User user);
    
    List<Show> getUserFavoriteShows(User user);
    
    Optional<UserFavorite> getUserFavorite(Long id);
    
    Optional<UserFavorite> getUserFavoriteByUserAndShow(User user, Show show);
    
    UserFavorite addFavorite(User user, Show show);
    
    boolean removeFavorite(User user, Show show);
    
    boolean isFavorite(User user, Show show);
}