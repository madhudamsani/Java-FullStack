package com.showvault.service.impl;

import com.showvault.model.Show;
import com.showvault.model.UserFavorite;
import com.showvault.model.User;
import com.showvault.repository.UserFavoriteRepository;
import com.showvault.service.UserFavoriteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class UserFavoriteServiceImpl implements UserFavoriteService {

    @Autowired
    private UserFavoriteRepository userFavoriteRepository;

    @Override
    public List<UserFavorite> getUserFavorites(User user) {
        return userFavoriteRepository.findByUserOrderByCreatedAtDesc(user);
    }

    @Override
    public List<Show> getUserFavoriteShows(User user) {
        List<UserFavorite> favorites = userFavoriteRepository.findByUserOrderByCreatedAtDesc(user);
        return favorites.stream()
                .map(UserFavorite::getShow)
                .collect(Collectors.toList());
    }

    @Override
    public Optional<UserFavorite> getUserFavorite(Long id) {
        return userFavoriteRepository.findById(id);
    }

    @Override
    public Optional<UserFavorite> getUserFavoriteByUserAndShow(User user, Show show) {
        return userFavoriteRepository.findByUserAndShow(user, show);
    }

    @Override
    @Transactional
    public UserFavorite addFavorite(User user, Show show) {
        // Check if already a favorite
        if (userFavoriteRepository.existsByUserAndShow(user, show)) {
            Optional<UserFavorite> existingFavorite = userFavoriteRepository.findByUserAndShow(user, show);
            return existingFavorite.orElse(null);
        }
        
        // Create new favorite
        UserFavorite favorite = new UserFavorite(user, show);
        return userFavoriteRepository.save(favorite);
    }

    @Override
    @Transactional
    public boolean removeFavorite(User user, Show show) {
        if (userFavoriteRepository.existsByUserAndShow(user, show)) {
            userFavoriteRepository.deleteByUserAndShow(user, show);
            return true;
        }
        return false;
    }

    @Override
    public boolean isFavorite(User user, Show show) {
        return userFavoriteRepository.existsByUserAndShow(user, show);
    }
}