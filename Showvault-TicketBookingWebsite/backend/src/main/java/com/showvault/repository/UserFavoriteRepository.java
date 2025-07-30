package com.showvault.repository;

import com.showvault.model.Show;
import com.showvault.model.UserFavorite;
import com.showvault.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserFavoriteRepository extends JpaRepository<UserFavorite, Long> {
    
    List<UserFavorite> findByUser(User user);
    
    List<UserFavorite> findByUserOrderByCreatedAtDesc(User user);
    
    Optional<UserFavorite> findByUserAndShow(User user, Show show);
    
    boolean existsByUserAndShow(User user, Show show);
    
    void deleteByUserAndShow(User user, Show show);
}