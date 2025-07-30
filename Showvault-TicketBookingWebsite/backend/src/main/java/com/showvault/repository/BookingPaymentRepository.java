package com.showvault.repository;

import com.showvault.model.BookingPayment;
import com.showvault.model.PaymentMethod;
import com.showvault.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingPaymentRepository extends JpaRepository<BookingPayment, Long> {
    
    List<BookingPayment> findByBookingId(Long bookingId);
    
    List<BookingPayment> findByStatus(PaymentStatus status);
    
    List<BookingPayment> findByMethod(PaymentMethod method);
    
    List<BookingPayment> findByTransactionId(String transactionId);
    
    @Query("SELECT bp FROM BookingPayment bp WHERE bp.booking.user.id = ?1")
    List<BookingPayment> findByUserId(Long userId);
    
    @Query("SELECT bp FROM BookingPayment bp WHERE bp.paymentDate BETWEEN ?1 AND ?2")
    List<BookingPayment> findByPaymentDateBetween(LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT SUM(bp.amount) FROM BookingPayment bp WHERE bp.status = 'COMPLETED' AND bp.paymentDate BETWEEN ?1 AND ?2")
    Double getTotalRevenueForPeriod(LocalDateTime startDate, LocalDateTime endDate);
    
    Optional<BookingPayment> findByBookingIdAndStatus(Long bookingId, PaymentStatus status);
}