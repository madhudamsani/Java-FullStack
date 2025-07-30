package com.showvault.repository;

import com.showvault.model.Venue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VenueRepository extends JpaRepository<Venue, Long> {
    
    List<Venue> findByCity(String city);
    
    List<Venue> findByCountry(String country);
    
    @Query("SELECT v FROM Venue v WHERE v.capacity >= ?1")
    List<Venue> findByMinimumCapacity(Integer capacity);
    
    @Query("SELECT DISTINCT v.city FROM Venue v ORDER BY v.city")
    List<String> findAllCities();
    
    @Query("SELECT DISTINCT v.country FROM Venue v ORDER BY v.country")
    List<String> findAllCountries();
    
    @Query("SELECT v FROM Venue v WHERE LOWER(v.name) LIKE LOWER(CONCAT('%', ?1, '%')) OR LOWER(v.city) LIKE LOWER(CONCAT('%', ?1, '%'))")
    List<Venue> searchVenues(String searchTerm);
}