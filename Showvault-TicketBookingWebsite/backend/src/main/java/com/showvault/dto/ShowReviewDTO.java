package com.showvault.dto;

import com.showvault.model.ShowReview;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
public class ShowReviewDTO {
    private Long id;
    private Long showId;
    private Long userId;
    private String userName;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ShowReviewDTO(ShowReview review) {
        this.id = review.getId();
        this.showId = review.getShowId();
        this.userId = review.getUserId();
        this.userName = review.getUserName();
        this.rating = review.getRating();
        this.comment = review.getComment();
        this.createdAt = review.getCreatedAt();
        this.updatedAt = review.getUpdatedAt();
    }
}