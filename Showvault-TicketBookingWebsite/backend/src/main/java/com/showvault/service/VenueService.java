package com.showvault.service;

import com.showvault.model.Venue;
import com.showvault.repository.VenueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class VenueService {

    private final VenueRepository venueRepository;

    @Autowired
    public VenueService(VenueRepository venueRepository) {
        this.venueRepository = venueRepository;
    }

    public List<Venue> getAllVenues() {
        return venueRepository.findAll();
    }

    public Optional<Venue> getVenueById(Long id) {
        return venueRepository.findById(id);
    }

    public List<Venue> getVenuesByCity(String city) {
        return venueRepository.findByCity(city);
    }

    public List<Venue> getVenuesByCountry(String country) {
        return venueRepository.findByCountry(country);
    }

    public List<Venue> getVenuesByMinimumCapacity(Integer capacity) {
        return venueRepository.findByMinimumCapacity(capacity);
    }

    public List<String> getAllCities() {
        return venueRepository.findAllCities();
    }

    public List<String> getAllCountries() {
        return venueRepository.findAllCountries();
    }
    
    public List<Venue> searchVenues(String searchTerm) {
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return getAllVenues();
        }
        return venueRepository.searchVenues(searchTerm.trim());
    }

    @Transactional
    public Venue createVenue(Venue venue) {
        return venueRepository.save(venue);
    }

    @Transactional
    public Venue updateVenue(Venue venue) {
        return venueRepository.save(venue);
    }

    @Transactional
    public void deleteVenue(Long id) {
        venueRepository.deleteById(id);
    }
}