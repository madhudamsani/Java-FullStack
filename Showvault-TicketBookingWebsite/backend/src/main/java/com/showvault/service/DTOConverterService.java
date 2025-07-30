package com.showvault.service;

import com.showvault.dto.BookingDTO;
import com.showvault.dto.SeatBookingDTO;
import com.showvault.dto.SeatDTO;
import com.showvault.dto.ShowDTO;
import com.showvault.dto.ShowScheduleDTO;
import com.showvault.dto.ShowReviewDTO;
import com.showvault.model.Booking;
import com.showvault.model.Seat;
import com.showvault.model.SeatBooking;
import com.showvault.model.Show;
import com.showvault.model.ShowSchedule;
import com.showvault.model.ShowReview;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DTOConverterService {

    public SeatDTO convertToDTO(Seat seat) {
        return new SeatDTO(seat);
    }
    
    public List<SeatDTO> convertToDTO(List<Seat> seats) {
        return seats.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public SeatBookingDTO convertToDTO(SeatBooking seatBooking) {
        return new SeatBookingDTO(seatBooking);
    }
    
    public List<SeatBookingDTO> convertSeatBookingsToDTO(List<SeatBooking> seatBookings) {
        return seatBookings.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public BookingDTO convertToBookingDTO(Booking booking) {
        return new BookingDTO(booking);
    }
    
    public List<BookingDTO> convertBookingsToDTO(List<Booking> bookings) {
        return bookings.stream()
                .map(this::convertToBookingDTO)
                .collect(Collectors.toList());
    }
    
    public ShowDTO convertToShowDTO(Show show) {
        return new ShowDTO(show);
    }
    
    public List<ShowDTO> convertShowsToDTO(List<Show> shows) {
        return shows.stream()
                .map(this::convertToShowDTO)
                .collect(Collectors.toList());
    }
    
    public ShowScheduleDTO convertToShowScheduleDTO(ShowSchedule schedule) {
        return new ShowScheduleDTO(schedule);
    }
    
    public List<ShowScheduleDTO> convertShowSchedulesToDTO(List<ShowSchedule> schedules) {
        return schedules.stream()
                .map(this::convertToShowScheduleDTO)
                .collect(Collectors.toList());
    }
    
    public ShowReview convertToShowReview(ShowReviewDTO dto) {
        ShowReview review = new ShowReview(); // This constructor sets createdAt to LocalDateTime.now()
        review.setId(dto.getId());
        review.setShowId(dto.getShowId());
        review.setUserId(dto.getUserId());
        review.setUserName(dto.getUserName());
        review.setRating(dto.getRating());
        review.setComment(dto.getComment());
        
        // Only set createdAt from DTO if it's not null (for existing reviews)
        if (dto.getCreatedAt() != null) {
            review.setCreatedAt(dto.getCreatedAt());
        }
        
        // Only set updatedAt from DTO if it's not null
        if (dto.getUpdatedAt() != null) {
            review.setUpdatedAt(dto.getUpdatedAt());
        } else if (dto.getId() != null) {
            // If this is an update to an existing review, set updatedAt to now
            review.setUpdatedAt(LocalDateTime.now());
        }
        
        return review;
    }

    public ShowReviewDTO convertToShowReviewDTO(ShowReview review) {
        ShowReviewDTO dto = new ShowReviewDTO();
        dto.setId(review.getId());
        dto.setShowId(review.getShowId());
        dto.setUserId(review.getUserId());
        dto.setUserName(review.getUserName());
        dto.setRating(review.getRating());
        dto.setComment(review.getComment());
        dto.setCreatedAt(review.getCreatedAt());
        dto.setUpdatedAt(review.getUpdatedAt());
        return dto;
    }

    public List<ShowReviewDTO> convertToShowReviewDTOs(List<ShowReview> reviews) {
        return reviews.stream()
                .map(this::convertToShowReviewDTO)
                .collect(Collectors.toList());
    }
}