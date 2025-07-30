package com.showvault.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.showvault.service.CapacitySynchronizationService;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin")
public class CapacitySynchronizationController {

    @Autowired
    private CapacitySynchronizationService capacitySynchronizationService;
    
    /**
     * Endpoint to manually trigger capacity synchronization
     * Requires admin role
     * 
     * @return Response with synchronization result
     */
    @PostMapping("/synchronize-capacities")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> synchronizeCapacities() {
        try {
            String result = capacitySynchronizationService.synchronizeCapacitiesManually();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error synchronizing capacities: " + e.getMessage());
        }
    }
}