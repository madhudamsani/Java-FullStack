package com.showvault.service;

import com.showvault.model.Show;
import com.showvault.model.ShowReview;
import com.showvault.model.ShowSchedule;
import com.showvault.model.Booking;
import com.showvault.model.BookingStatus;
import com.showvault.model.User;
import com.showvault.model.ShowType;
import com.showvault.repository.ShowRepository;
import com.showvault.repository.ShowReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import jakarta.persistence.EntityNotFoundException;

@Service
public class ShowService {

    private final ShowRepository showRepository;
    private final ShowReviewRepository showReviewRepository;
    private final ShowTypeService showTypeService;

    @Autowired
    public ShowService(ShowRepository showRepository, ShowReviewRepository showReviewRepository, ShowTypeService showTypeService) {
        this.showRepository = showRepository;
        this.showReviewRepository = showReviewRepository;
        this.showTypeService = showTypeService;
    }

    @Transactional(readOnly = true)
    public List<Show> getAllShows() {
        try {
            // Use a specification to exclude deleted shows
            Specification<Show> spec = (root, query, cb) -> {
                return cb.or(
                    cb.equal(root.get("isDeleted"), false),
                    cb.isNull(root.get("isDeleted"))
                );
            };
            
            List<Show> shows = showRepository.findAll(spec);
            initializeShowCollections(shows);
            return shows;
        } catch (Exception e) {
            System.err.println("Error in getAllShows: " + e.getMessage());
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
    
    /**
     * Gets all shows except those with the specified status
     * @param statusToExclude The status to exclude from results
     * @return List of shows excluding those with the specified status
     */
    @Transactional(readOnly = true)
    public List<Show> getAllShowsExcept(Show.ShowStatus statusToExclude) {
        try {
            // Use a specification to exclude deleted shows and shows with the specified status
            Specification<Show> spec = (root, query, cb) -> {
                return cb.and(
                    cb.or(
                        cb.equal(root.get("isDeleted"), false),
                        cb.isNull(root.get("isDeleted"))
                    ),
                    cb.notEqual(root.get("status"), statusToExclude)
                );
            };
            
            List<Show> shows = showRepository.findAll(spec);
            initializeShowCollections(shows);
            return shows;
        } catch (Exception e) {
            System.err.println("Error in getAllShowsExcept: " + e.getMessage());
            e.printStackTrace();
            return new ArrayList<>();
        }
    }

    @Transactional(readOnly = true)
    public Optional<Show> getShowById(Long id) {
        Optional<Show> showOpt = showRepository.findById(id);
        
        // Initialize lazy-loaded collections if show is present
        if (showOpt.isPresent()) {
            Show show = showOpt.get();
            
            // Initialize createdBy
            if (show.getCreatedBy() != null) {
                show.getCreatedBy().getUsername(); // Force initialization
            }
            
            // Initialize schedules
            if (show.getSchedules() != null) {
                show.getSchedules().size(); // This will initialize the collection
            }
        }
        
        return showOpt;
    }
    
    /**
     * Get a show by ID, including deleted shows
     * @param id The ID of the show
     * @param includeDeleted Whether to include deleted shows
     * @return Optional containing the show if found
     */
    @Transactional(readOnly = true)
    public Optional<Show> getShowById(Long id, boolean includeDeleted) {
        Optional<Show> showOpt = showRepository.findById(id);
        
        if (showOpt.isPresent()) {
            Show show = showOpt.get();
            
            // If the show is deleted and we don't want deleted shows, return empty
            if (show.getIsDeleted() && !includeDeleted) {
                return Optional.empty();
            }
            
            // Initialize lazy-loaded collections
            if (show.getCreatedBy() != null) {
                show.getCreatedBy().getUsername(); // Force initialization
            }
            
            if (show.getSchedules() != null) {
                show.getSchedules().size(); // This will initialize the collection
            }
        }
        
        return showOpt;
    }

    @Transactional(readOnly = true)
    public List<Show> getShowsByStatus(Show.ShowStatus status) {
        List<Show> shows = showRepository.findByStatus(status);
        initializeShowCollections(shows);
        return shows;
    }

    @Transactional(readOnly = true)
    public List<Show> getShowsByGenre(String genre) {
        List<Show> shows = showRepository.findByGenre(genre);
        initializeShowCollections(shows);
        return shows;
    }

    @Transactional(readOnly = true)
    public List<Show> getShowsByLanguage(String language) {
        List<Show> shows = showRepository.findByLanguage(language);
        initializeShowCollections(shows);
        return shows;
    }

    @Transactional(readOnly = true)
    public List<Show> getShowsByCreator(User creator) {
        List<Show> shows = showRepository.findByCreatedById(creator.getId());
        initializeShowCollections(shows);
        return shows;
    }
    
    // Helper method to initialize lazy-loaded collections
    private void initializeShowCollections(List<Show> shows) {
        for (Show show : shows) {
            // Initialize createdBy
            if (show.getCreatedBy() != null) {
                show.getCreatedBy().getUsername(); // Force initialization
            }
            
            // Initialize schedules
            if (show.getSchedules() != null) {
                show.getSchedules().size(); // This will initialize the collection
            }
        }
    }

    @Transactional(readOnly = true)
    public List<Show> searchShowsByTitle(String title) {
        try {
            List<Show> shows = showRepository.findByTitleContainingIgnoreCase(title);
            initializeShowCollections(shows);
            return shows;
        } catch (Exception e) {
            System.err.println("Error in searchShowsByTitle: " + e.getMessage());
            e.printStackTrace();
            return new ArrayList<>();
        }
    }

    public List<String> getAllGenres() {
        return showRepository.findAllGenres();
    }

    public List<String> getAllLanguages() {
        return showRepository.findAllLanguages();
    }

    @Transactional
    public Show createShow(Show show) {
        prepareShowForSave(show);
        return showRepository.save(show);
    }

    /**
     * Updates only the show details without affecting schedules
     * @param show The show with updated details
     * @return The updated show
     */
    @Transactional
    public Show updateShowDetailsOnly(Show show) {
        // Get the existing show with all its schedules
        Show existingShow = showRepository.findById(show.getId())
                .orElseThrow(() -> new EntityNotFoundException("Show not found with id: " + show.getId()));
        
        // Update only show details, keep original schedules
        existingShow.setTitle(show.getTitle());
        existingShow.setType(normalizeShowType(show.getType()));
        existingShow.setPosterUrl(show.getPosterUrl());
        existingShow.setTrailerUrl(show.getTrailerUrl());
        existingShow.setDescription(show.getDescription());
        existingShow.setDuration(show.getDuration());
        existingShow.setGenre(show.getGenre());
        existingShow.setLanguage(show.getLanguage());
        existingShow.setStatus(show.getStatus());
        
        // Save the updated show with original schedules preserved
        return showRepository.save(existingShow);
    }

    @Transactional
    public Show updateShow(Show show) {
        prepareShowForSave(show);
        // Process schedules to ensure endTime is calculated
        if (show.getSchedules() != null) {
            for (ShowSchedule schedule : show.getSchedules()) {
                // If endTime is null but startTime exists, calculate endTime
                if (schedule.getEndTime() == null && schedule.getStartTime() != null) {
                    if (show.getDuration() != null) {
                        schedule.setEndTime(schedule.getStartTime().plusMinutes(show.getDuration()));
                    } else {
                        schedule.setEndTime(schedule.getStartTime().plusHours(2)); // Default 2 hours
                    }
                }
            }
        }
        return showRepository.save(show);
    }

    /**
     * Checks if a show has active bookings
     * @param showId The ID of the show to check
     * @return true if the show has active bookings, false otherwise
     */
    @Transactional(readOnly = true)
    public boolean hasActiveBookings(Long showId) {
        Optional<Show> showOpt = showRepository.findById(showId);
        if (showOpt.isEmpty()) {
            return false;
        }
        
        Show show = showOpt.get();
        if (show.getSchedules() == null || show.getSchedules().isEmpty()) {
            return false;
        }
        
        for (ShowSchedule schedule : show.getSchedules()) {
            if (schedule.getBookings() != null) {
                for (Booking booking : schedule.getBookings()) {
                    // Check if booking is active (not cancelled, refunded, or expired)
                    if (booking.getStatus() == BookingStatus.CONFIRMED || 
                        booking.getStatus() == BookingStatus.PENDING || 
                        booking.getStatus() == BookingStatus.COMPLETED) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * Counts active bookings for a show
     * @param showId The ID of the show
     * @return The number of active bookings
     */
    @Transactional(readOnly = true)
    public int countActiveBookings(Long showId) {
        Optional<Show> showOpt = showRepository.findById(showId);
        if (showOpt.isEmpty()) {
            return 0;
        }
        
        Show show = showOpt.get();
        if (show.getSchedules() == null || show.getSchedules().isEmpty()) {
            return 0;
        }
        
        int activeBookingsCount = 0;
        for (ShowSchedule schedule : show.getSchedules()) {
            if (schedule.getBookings() != null) {
                for (Booking booking : schedule.getBookings()) {
                    // Count active bookings
                    if (booking.getStatus() == BookingStatus.CONFIRMED || 
                        booking.getStatus() == BookingStatus.PENDING || 
                        booking.getStatus() == BookingStatus.COMPLETED) {
                        activeBookingsCount++;
                    }
                }
            }
        }
        
        return activeBookingsCount;
    }
    
    /**
     * Hard deletes a show (completely removes it from the database)
     * @param id The ID of the show to delete
     */
    @Transactional
    public void hardDeleteShow(Long id) {
        showRepository.deleteById(id);
    }
    
    /**
     * Soft deletes a show (marks it as deleted but keeps it in the database)
     * @param id The ID of the show to delete
     * @param reason The reason for deletion
     * @return The updated show
     */
    @Transactional
    public Show softDeleteShow(Long id, String reason) {
        Optional<Show> showOpt = showRepository.findById(id);
        if (showOpt.isEmpty()) {
            throw new IllegalArgumentException("Show not found with ID: " + id);
        }
        
        Show show = showOpt.get();
        show.setIsDeleted(true);
        show.setDeletionReason(reason);
        show.setStatus(Show.ShowStatus.CANCELLED);
        
        // Update all schedules to cancelled
        if (show.getSchedules() != null) {
            for (ShowSchedule schedule : show.getSchedules()) {
                schedule.setStatus(ShowSchedule.ScheduleStatus.CANCELLED);
            }
        }
        
        return showRepository.save(show);
    }
    
    /**
     * Deletes a show (either soft or hard delete based on configuration)
     * @param id The ID of the show to delete
     * @param reason The reason for deletion (for soft delete)
     * @return true if the show was deleted, false otherwise
     */
    @Transactional
    public boolean deleteShow(Long id, String reason) {
        // For backward compatibility with existing code
        return softDeleteShow(id, reason) != null;
    }
    
    /**
     * Legacy method for backward compatibility
     * @param id The ID of the show to delete
     */
    @Transactional
    public void deleteShow(Long id) {
        softDeleteShow(id, "Deleted by organizer");
    }

    @Transactional
    public boolean updateShowStatus(Long showId, Show.ShowStatus newStatus) {
        Optional<Show> showOpt = showRepository.findById(showId);
        
        if (showOpt.isPresent()) {
            Show show = showOpt.get();
            show.setStatus(newStatus);
            showRepository.save(show);
            return true;
        }
        
        return false;
    }

    @Transactional(readOnly = true)
    public List<ShowReview> getShowReviews(Long showId) {
        return showReviewRepository.findByShowId(showId);
    }

    @Transactional
    public ShowReview addReview(ShowReview review) {
        return showReviewRepository.save(review);
    }

    @Transactional(readOnly = true)
    public List<Show> getRecommendedShows() {
        // Get popular upcoming shows
        List<Show> recommendedShows = showRepository.findByStatus(Show.ShowStatus.UPCOMING);
        recommendedShows.sort((s1, s2) -> {
            double rating1 = calculateAverageRating(s1.getId());
            double rating2 = calculateAverageRating(s2.getId());
            return Double.compare(rating2, rating1); // Sort by rating descending
        });
        
        // Return top 10 shows or all if less than 10
        int limit = Math.min(recommendedShows.size(), 10);
        return recommendedShows.subList(0, limit);
    }

    @Transactional(readOnly = true)
    public List<Show> getSimilarShows(Long showId) {
        Optional<Show> showOpt = showRepository.findById(showId);
        if (!showOpt.isPresent()) {
            return new ArrayList<>();
        }

        Show show = showOpt.get();
        
        // Find shows with similar genre or type
        List<Show> similarShows = showRepository.findByGenreOrType(
            show.getGenre(), 
            show.getType(),
            show.getId() // Exclude current show
        );
        
        // Sort by similarity score
        similarShows.sort((s1, s2) -> {
            int score1 = calculateSimilarityScore(show, s1);
            int score2 = calculateSimilarityScore(show, s2);
            return Integer.compare(score2, score1); // Sort by score descending
        });
        
        // Return top 5 similar shows or all if less than 5
        int limit = Math.min(similarShows.size(), 5);
        return similarShows.subList(0, limit);
    }

    private double calculateAverageRating(Long showId) {
        List<ShowReview> reviews = showReviewRepository.findByShowId(showId);
        if (reviews.isEmpty()) {
            return 0.0;
        }
        double sum = reviews.stream()
            .mapToDouble(ShowReview::getRating)
            .sum();
        return sum / reviews.size();
    }

    private int calculateSimilarityScore(Show show1, Show show2) {
        int score = 0;
        
        // Add points for matching attributes
        if (show1.getGenre() != null && show1.getGenre().equals(show2.getGenre())) {
            score += 3;
        }
        if (show1.getType() != null && show1.getType().equals(show2.getType())) {
            score += 2;
        }
        if (show1.getLanguage() != null && show1.getLanguage().equals(show2.getLanguage())) {
            score += 1;
        }
        
        return score;
    }

    @Transactional(readOnly = true)
    public Page<Show> filterShows(
        String type, String genre, String search, String dateFrom, String dateTo,
        String venue, Double priceMin, Double priceMax, String sort,
        String status, String excludeStatus, int page, int size) {
        
        // Create a specification for filtering
        Specification<Show> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            if (search != null && !search.isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("title")), 
                    "%" + search.toLowerCase() + "%"));
            }
            
            // Filter by status if provided
            if (status != null && !status.isEmpty()) {
                try {
                    Show.ShowStatus showStatus = Show.ShowStatus.valueOf(status.toUpperCase());
                    predicates.add(cb.equal(root.get("status"), showStatus));
                } catch (IllegalArgumentException e) {
                    System.out.println("Invalid status: " + status);
                }
            }
            
            // Exclude specific status if provided
            if (excludeStatus != null && !excludeStatus.isEmpty()) {
                try {
                    Show.ShowStatus showStatus = Show.ShowStatus.valueOf(excludeStatus.toUpperCase());
                    predicates.add(cb.notEqual(root.get("status"), showStatus));
                } catch (IllegalArgumentException e) {
                    System.out.println("Invalid excludeStatus: " + excludeStatus);
                }
            }
            
            if (type != null && !type.isEmpty() && !type.equalsIgnoreCase("all")) {
                // Handle exact type matching (case insensitive)
                predicates.add(cb.equal(cb.lower(root.get("type")), 
                    type.toLowerCase()));
            }
            
            if (genre != null && !genre.isEmpty()) {
                predicates.add(cb.equal(cb.lower(root.get("genre")), 
                    genre.toLowerCase()));
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        
        // Create sort order
        Sort sortOrder = Sort.unsorted();
        if (sort != null && !sort.isEmpty()) {
            switch (sort.toLowerCase()) {
                case "title":
                    sortOrder = Sort.by(Sort.Direction.ASC, "title");
                    break;
                case "date":
                    sortOrder = Sort.by(Sort.Direction.ASC, "createdAt");
                    break;
                case "rating":
                    // Custom sorting for rating will be handled in memory
                    break;
            }
        }
        
        // Create pageable request
        Pageable pageable = PageRequest.of(page, size, sortOrder);
        
        // Get initial page of results
        Page<Show> showPage = showRepository.findAll((Specification<Show>) spec, pageable);
        List<Show> shows = new ArrayList<>(showPage.getContent());
        
        // Apply additional filters that can't be done in the database
        if (venue != null && !venue.isEmpty() ||
            dateFrom != null || dateTo != null ||
            priceMin != null || priceMax != null) {
            
            shows = filterShowsInMemory(shows, venue, dateFrom, dateTo, priceMin, priceMax);
        }
        
        // Apply rating sort if needed
        if (sort != null && sort.equalsIgnoreCase("rating")) {
            shows.sort((s1, s2) -> {
                double rating1 = calculateAverageRating(s1.getId());
                double rating2 = calculateAverageRating(s2.getId());
                return Double.compare(rating2, rating1); // Higher rating first
            });
        }
        
        // Create a new page object with filtered results
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), shows.size());
        
        return new PageImpl<>(
            shows.subList(start, end),
            pageable,
            shows.size()
        );
    }
    
    private List<Show> filterShowsInMemory(
        List<Show> shows, String venue, String dateFrom, String dateTo,
        Double priceMin, Double priceMax) {
        
        Stream<Show> showStream = shows.stream();
        
        if (venue != null && !venue.isEmpty()) {
            showStream = showStream.filter(show -> 
                show.getSchedules().stream()
                    .anyMatch(schedule -> schedule.getVenue().getName().equalsIgnoreCase(venue))
            );
        }
        
        if (dateFrom != null || dateTo != null) {
            LocalDate fromDate = dateFrom != null ? LocalDate.parse(dateFrom) : LocalDate.MIN;
            LocalDate toDate = dateTo != null ? LocalDate.parse(dateTo) : LocalDate.MAX;
            
            showStream = showStream.filter(show ->
                show.getSchedules().stream()
                    .anyMatch(schedule -> {
                        LocalDate scheduleDate = schedule.getShowDate();
                        return !scheduleDate.isBefore(fromDate) && !scheduleDate.isAfter(toDate);
                    })
            );
        }
        
        if (priceMin != null || priceMax != null) {
            BigDecimal minPrice = priceMin != null ? BigDecimal.valueOf(priceMin) : BigDecimal.valueOf(Double.MIN_VALUE);
            BigDecimal maxPrice = priceMax != null ? BigDecimal.valueOf(priceMax) : BigDecimal.valueOf(Double.MAX_VALUE);
            
            showStream = showStream.filter(show ->
                show.getSchedules().stream()
                    .anyMatch(schedule -> 
                        schedule.getBasePrice().compareTo(minPrice) >= 0 && 
                        schedule.getBasePrice().compareTo(maxPrice) <= 0
                    )
            );
        }
        
        return showStream.collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<Show> filterShowsByCreator(
        User creator, String status, String search, String dateFrom, String dateTo,
        int page, int size) {
        
        // Create a specification for filtering shows by creator
        Specification<Show> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            // Always filter by creator
            predicates.add(cb.equal(root.get("createdBy"), creator));
            
            if (search != null && !search.isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("title")), 
                    "%" + search.toLowerCase() + "%"));
            }
            
            if (status != null && !status.isEmpty() && !status.equalsIgnoreCase("all")) {
                try {
                    Show.ShowStatus showStatus = Show.ShowStatus.valueOf(status.toUpperCase());
                    predicates.add(cb.equal(root.get("status"), showStatus));
                } catch (IllegalArgumentException e) {
                    // Invalid status, ignore this filter
                }
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        
        // Create sort order (default by creation date descending)
        Sort sortOrder = Sort.by(Sort.Direction.DESC, "createdAt");
        
        // Create pageable request
        Pageable pageable = PageRequest.of(page, size, sortOrder);
        
        // Get page of results
        Page<Show> showPage = showRepository.findAll(spec, pageable);
        
        // Initialize lazy-loaded collections
        initializeShowCollections(showPage.getContent());
        
        return showPage;
    }
    
    /**
     * Normalize show type for backward compatibility
     * Converts "Theater" to "Theatrical" and validates type
     * @param type The input type
     * @return Normalized type
     */
    public String normalizeShowType(String type) {
        return showTypeService.normalizeShowType(type);
    }
    
    /**
     * Prepare show for saving by normalizing its type
     * @param show The show to prepare
     */
    private void prepareShowForSave(Show show) {
        if (show.getType() != null) {
            show.setType(normalizeShowType(show.getType()));
        }
    }
}