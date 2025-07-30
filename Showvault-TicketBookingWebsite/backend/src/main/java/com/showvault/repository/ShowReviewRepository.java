package com.showvault.repository;

import com.showvault.model.ShowReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShowReviewRepository extends JpaRepository<ShowReview, Long> {
    List<ShowReview> findByShowId(Long showId);
    List<ShowReview> findByUserId(Long userId);
}