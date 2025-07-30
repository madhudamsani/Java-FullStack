package com.showvault.repository;

import com.showvault.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByUsername(String username);
    
    Optional<User> findByEmail(String email);
    
    boolean existsByUsername(String username);
    
    boolean existsByEmail(String email);
    
    long countByActive(Boolean active);
    
    long countByCreatedAtAfter(LocalDateTime date);
    
    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.name = ?1")
    long countUsersByRoleName(String roleName);
    
    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.name = ?1")
    java.util.List<User> findUsersByRoleName(String roleName);
    
    @Query("SELECT u FROM User u WHERE " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', ?1, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', ?1, '%')) OR " +
           "LOWER(u.firstName) LIKE LOWER(CONCAT('%', ?1, '%')) OR " +
           "LOWER(u.lastName) LIKE LOWER(CONCAT('%', ?1, '%'))")
    java.util.List<User> searchUsers(String searchTerm);
}