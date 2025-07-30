package com.showvault.dto;

import com.showvault.model.Show;
import com.showvault.model.Show.ShowStatus;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
public class ShowDTO {
    private Long id;
    private String title;
    private String description;
    private String type;
    private Integer duration;
    private String genre;
    private String language;
    private String posterUrl;
    private String trailerUrl;
    private ShowStatus status;
    private Long createdById;
    private String createdByUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ShowScheduleDTO> schedules = new ArrayList<>();
    
    public ShowDTO(Show show) {
        this.id = show.getId();
        this.title = show.getTitle();
        this.description = show.getDescription();
        this.type = show.getType();
        this.duration = show.getDuration();
        this.genre = show.getGenre();
        this.language = show.getLanguage();
        this.posterUrl = show.getPosterUrl();
        this.trailerUrl = show.getTrailerUrl();
        this.status = show.getStatus();
        this.createdById = show.getCreatedBy() != null ? show.getCreatedBy().getId() : null;
        this.createdByUsername = show.getCreatedBy() != null ? show.getCreatedBy().getUsername() : null;
        this.createdAt = show.getCreatedAt();
        this.updatedAt = show.getUpdatedAt();
        
        // Convert schedules to DTOs
        if (show.getSchedules() != null) {
            this.schedules = show.getSchedules().stream()
                    .map(ShowScheduleDTO::new)
                    .collect(Collectors.toList());
        }
    }
}