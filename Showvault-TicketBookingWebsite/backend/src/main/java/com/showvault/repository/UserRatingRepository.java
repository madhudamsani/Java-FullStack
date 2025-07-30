package com.showvault.repository;

import com.showvault.model.Show;
import com.showvault.model.UserRating;
import com.showvault.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRatingRepository extends JpaRepository<UserRating, Long> {
    
    List<UserRating> findByUser(User user);
    
    List<UserRating> findByUserOrderByCreatedAtDesc(User user);
    
    List<UserRating> findByShow(Show show);
    
    Optional<UserRating> findByUserAndShow(User user, Show show);
    
    boolean existsByUserAndShow(User user, Show show);
    
    @Query("SELECT AVG(r.rating) FROM UserRating r WHERE r.show = ?1")
    Double getAverageRatingForShow(Show show);
    
    @Query("SELECT COUNT(r) FROM UserRating r WHERE r.show = ?1")
    Long getCountForShow(Show show);
}