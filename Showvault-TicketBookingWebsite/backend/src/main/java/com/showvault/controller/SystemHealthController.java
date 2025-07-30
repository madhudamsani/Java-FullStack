package com.showvault.controller;

import com.showvault.model.SystemHealth;
import com.showvault.service.SystemHealthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin/system-health")
@PreAuthorize("hasRole('ADMIN')")
public class SystemHealthController {

    @Autowired
    private SystemHealthService systemHealthService;

    @GetMapping
    public ResponseEntity<SystemHealth> getSystemHealth() {
        SystemHealth health = systemHealthService.getSystemHealth();
        return new ResponseEntity<>(health, HttpStatus.OK);
    }

    @GetMapping("/jvm")
    public ResponseEntity<Map<String, Object>> getJvmMetrics() {
        Map<String, Object> metrics = systemHealthService.getJvmMetrics();
        return new ResponseEntity<>(metrics, HttpStatus.OK);
    }

    @GetMapping("/database")
    public ResponseEntity<Map<String, Object>> getDatabaseMetrics() {
        Map<String, Object> metrics = systemHealthService.getDatabaseMetrics();
        return new ResponseEntity<>(metrics, HttpStatus.OK);
    }

    @GetMapping("/api")
    public ResponseEntity<Map<String, Object>> getApiMetrics() {
        Map<String, Object> metrics = systemHealthService.getApiMetrics();
        return new ResponseEntity<>(metrics, HttpStatus.OK);
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, String>> getStatus() {
        Map<String, String> status = Map.of("status", systemHealthService.getStatus());
        return new ResponseEntity<>(status, HttpStatus.OK);
    }

    @GetMapping("/uptime")
    public ResponseEntity<Map<String, String>> getUptime() {
        Map<String, String> uptime = Map.of("uptime", systemHealthService.getUptime());
        return new ResponseEntity<>(uptime, HttpStatus.OK);
    }

    @GetMapping("/cpu")
    public ResponseEntity<Map<String, Double>> getCpuUsage() {
        Map<String, Double> cpu = Map.of("cpuUsage", systemHealthService.getCpuUsage());
        return new ResponseEntity<>(cpu, HttpStatus.OK);
    }

    @GetMapping("/memory")
    public ResponseEntity<Map<String, Double>> getMemoryUsage() {
        Map<String, Double> memory = Map.of("memoryUsage", systemHealthService.getMemoryUsage());
        return new ResponseEntity<>(memory, HttpStatus.OK);
    }

    @GetMapping("/disk")
    public ResponseEntity<Map<String, Double>> getDiskUsage() {
        Map<String, Double> disk = Map.of("diskUsage", systemHealthService.getDiskUsage());
        return new ResponseEntity<>(disk, HttpStatus.OK);
    }

    @GetMapping("/connections")
    public ResponseEntity<Map<String, Integer>> getActiveConnections() {
        Map<String, Integer> connections = Map.of("activeConnections", systemHealthService.getActiveConnections());
        return new ResponseEntity<>(connections, HttpStatus.OK);
    }

    @GetMapping("/response-time")
    public ResponseEntity<Map<String, Integer>> getAverageResponseTime() {
        Map<String, Integer> responseTime = Map.of("averageResponseTime", systemHealthService.getAverageResponseTime());
        return new ResponseEntity<>(responseTime, HttpStatus.OK);
    }
}