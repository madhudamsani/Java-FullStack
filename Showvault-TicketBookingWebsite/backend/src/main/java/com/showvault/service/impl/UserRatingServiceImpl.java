package com.showvault.service.impl;

import com.showvault.model.Show;
import com.showvault.model.UserRating;
import com.showvault.model.User;
import com.showvault.repository.UserRatingRepository;
import com.showvault.service.UserRatingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UserRatingServiceImpl implements UserRatingService {

    @Autowired
    private UserRatingRepository userRatingRepository;

    @Override
    public List<UserRating> getUserRatings(User user) {
        return userRatingRepository.findByUserOrderByCreatedAtDesc(user);
    }

    @Override
    public List<UserRating> getShowRatings(Show show) {
        return userRatingRepository.findByShow(show);
    }

    @Override
    public Optional<UserRating> getUserRating(Long id) {
        return userRatingRepository.findById(id);
    }

    @Override
    public Optional<UserRating> getUserRatingByUserAndShow(User user, Show show) {
        return userRatingRepository.findByUserAndShow(user, show);
    }

    @Override
    @Transactional
    public UserRating addRating(User user, Show show, Integer rating, String review) {
        // Check if user has already rated this show
        Optional<UserRating> existingRating = userRatingRepository.findByUserAndShow(user, show);
        
        if (existingRating.isPresent()) {
            // Update existing rating
            UserRating ratingEntity = existingRating.get();
            ratingEntity.setRating(rating);
            ratingEntity.setReview(review);
            return userRatingRepository.save(ratingEntity);
        } else {
            // Create new rating
            UserRating newRating = new UserRating(user, show, rating, review);
            return userRatingRepository.save(newRating);
        }
    }

    @Override
    @Transactional
    public UserRating updateRating(Long id, Integer rating, String review) {
        Optional<UserRating> ratingOpt = userRatingRepository.findById(id);
        
        if (ratingOpt.isPresent()) {
            UserRating ratingEntity = ratingOpt.get();
            ratingEntity.setRating(rating);
            ratingEntity.setReview(review);
            return userRatingRepository.save(ratingEntity);
        }
        
        return null;
    }

    @Override
    @Transactional
    public boolean deleteRating(Long id) {
        if (userRatingRepository.existsById(id)) {
            userRatingRepository.deleteById(id);
            return true;
        }
        return false;
    }

    @Override
    public Double getAverageRatingForShow(Show show) {
        return userRatingRepository.getAverageRatingForShow(show);
    }

    @Override
    public Long getRatingCountForShow(Show show) {
        return userRatingRepository.getCountForShow(show);
    }

    @Override
    public boolean hasUserRatedShow(User user, Show show) {
        return userRatingRepository.existsByUserAndShow(user, show);
    }
}