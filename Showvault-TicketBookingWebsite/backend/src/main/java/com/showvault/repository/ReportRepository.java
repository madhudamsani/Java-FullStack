package com.showvault.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.showvault.model.User;
import com.showvault.model.Booking;
import com.showvault.model.Show;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Repository
public interface ReportRepository {

    // User report queries
    @Query(value = "SELECT COUNT(*) FROM users", nativeQuery = true)
    int getTotalUsers();
    
    @Query(value = "SELECT COUNT(*) FROM users WHERE status = 'active'", nativeQuery = true)
    int getActiveUsers();
    
    @Query(value = "SELECT COUNT(*) FROM users WHERE created_at >= :startDate", nativeQuery = true)
    int getNewUsers(@Param("startDate") LocalDate startDate);
    
    @Query(value = "SELECT role, COUNT(*) as count FROM users GROUP BY role", nativeQuery = true)
    List<Map<String, Object>> getUsersByRole();
    
    @Query(value = "SELECT DATE_FORMAT(login_date, '%Y-%m-%d') as date, COUNT(*) as logins " +
           "FROM user_logins " +
           "WHERE login_date BETWEEN :startDate AND :endDate " +
           "GROUP BY DATE_FORMAT(login_date, '%Y-%m-%d') " +
           "ORDER BY login_date", nativeQuery = true)
    List<Map<String, Object>> getUserActivity(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    @Query(value = "SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count " +
           "FROM users " +
           "WHERE created_at BETWEEN :startDate AND :endDate " +
           "GROUP BY DATE_FORMAT(created_at, '%Y-%m') " +
           "ORDER BY month", nativeQuery = true)
    List<Map<String, Object>> getUserGrowthByMonth(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    @Query(value = "SELECT u.id, u.name, u.email, u.role, COUNT(b.id) as bookings, MAX(b.created_at) as lastActive " +
           "FROM users u " +
           "JOIN bookings b ON u.id = b.user_id " +
           "WHERE b.created_at BETWEEN :startDate AND :endDate " +
           "GROUP BY u.id, u.name, u.email, u.role " +
           "ORDER BY bookings DESC " +
           "LIMIT 5", nativeQuery = true)
    List<Map<String, Object>> getMostActiveUsers(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    // Sales report queries
    @Query(value = "SELECT SUM(total_amount) FROM bookings WHERE status = 'COMPLETED' AND created_at BETWEEN :startDate AND :endDate", nativeQuery = true)
    Double getTotalRevenue(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    @Query(value = "SELECT COUNT(*) FROM tickets t JOIN bookings b ON t.booking_id = b.id WHERE b.status = 'COMPLETED' AND b.created_at BETWEEN :startDate AND :endDate", nativeQuery = true)
    int getTicketsSold(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    @Query(value = "SELECT s.id as showId, s.title as showTitle, SUM(b.total_amount) as revenue " +
           "FROM shows s " +
           "JOIN bookings b ON s.id = b.show_id " +
           "WHERE b.status = 'COMPLETED' AND b.created_at BETWEEN :startDate AND :endDate " +
           "GROUP BY s.id, s.title " +
           "ORDER BY revenue DESC", nativeQuery = true)
    List<Map<String, Object>> getRevenueByShow(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    @Query(value = "SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(total_amount) as revenue " +
           "FROM bookings " +
           "WHERE status = 'COMPLETED' AND created_at BETWEEN :startDate AND :endDate " +
           "GROUP BY DATE_FORMAT(created_at, '%Y-%m') " +
           "ORDER BY month", nativeQuery = true)
    List<Map<String, Object>> getRevenueByMonth(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    @Query(value = "SELECT s.id as id, s.title as name, u.name as organizer, COUNT(t.id) as ticketsSold, SUM(b.total_amount) as revenue, " +
           "SUM(b.total_amount)/COUNT(t.id) as averagePrice " +
           "FROM shows s " +
           "JOIN bookings b ON s.id = b.show_id " +
           "JOIN tickets t ON b.id = t.booking_id " +
           "JOIN users u ON s.organizer_id = u.id " +
           "WHERE b.status = 'COMPLETED' AND b.created_at BETWEEN :startDate AND :endDate " +
           "GROUP BY s.id, s.title, u.name " +
           "ORDER BY ticketsSold DESC " +
           "LIMIT 5", nativeQuery = true)
    List<Map<String, Object>> getTopSellingShows(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    @Query(value = "SELECT s.category, SUM(b.total_amount) as revenue " +
           "FROM shows s " +
           "JOIN bookings b ON s.id = b.show_id " +
           "WHERE b.status = 'COMPLETED' AND b.created_at BETWEEN :startDate AND :endDate " +
           "GROUP BY s.category", nativeQuery = true)
    List<Map<String, Object>> getRevenueByCategory(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    @Query(value = "SELECT b.payment_method as method, SUM(b.total_amount) as revenue " +
           "FROM bookings b " +
           "WHERE b.status = 'COMPLETED' AND b.created_at BETWEEN :startDate AND :endDate " +
           "GROUP BY b.payment_method", nativeQuery = true)
    List<Map<String, Object>> getRevenueByPaymentMethod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}