package com.showvault.controller;

import com.showvault.model.SystemHealth;
import com.showvault.service.SystemHealthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin/system")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSystemHealthController {

    @Autowired
    private SystemHealthService systemHealthService;

    @GetMapping("/health")
    public ResponseEntity<?> getSystemHealth() {
        SystemHealth healthData = systemHealthService.getSystemHealth();
        return new ResponseEntity<>(healthData, HttpStatus.OK);
    }

    @GetMapping("/logs")
    public ResponseEntity<?> getSystemLogs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String service) {
        
        // Calculate offset for pagination
        int offset = (page - 1) * limit;
        
        List<Map<String, Object>> logs = systemHealthService.getSystemLogs(offset, limit, level, service);
        long totalLogs = systemHealthService.countSystemLogs(level, service);
        
        Map<String, Object> response = new HashMap<>();
        response.put("logs", logs);
        response.put("total", totalLogs);
        
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PostMapping("/maintenance")
    public ResponseEntity<?> toggleMaintenanceMode(@RequestBody Map<String, Boolean> request) {
        Boolean enabled = request.get("enabled");
        if (enabled == null) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
        
        systemHealthService.setMaintenanceMode(enabled);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("maintenanceMode", enabled);
        response.put("message", enabled ? "Maintenance mode enabled" : "Maintenance mode disabled");
        
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PostMapping("/cache/clear")
    public ResponseEntity<?> clearSystemCache() {
        systemHealthService.clearSystemCache();
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "System cache cleared successfully");
        
        return new ResponseEntity<>(response, HttpStatus.OK);
    }
}