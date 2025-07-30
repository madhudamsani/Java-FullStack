package com.showvault.util;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.FileCopyUtils;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Utility class to check and fix database consistency issues
 * Runs at application startup to ensure data integrity
 */
@Component
public class DatabaseConsistencyChecker implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        checkSeatCountConsistency();
        checkMissingSeats();
    }

    /**
     * Checks for inconsistencies between venue capacities, seat counts, and show schedule seat counts
     */
    private void checkSeatCountConsistency() {
        System.out.println("Checking seat count consistency...");

        // Check venue capacities vs actual seat counts
        List<Map<String, Object>> venueDiscrepancies = jdbcTemplate.queryForList(
                "SELECT v.id, v.name, v.capacity, COUNT(s.id) as seat_count " +
                "FROM venue v LEFT JOIN seat s ON v.id = s.venue_id " +
                "GROUP BY v.id, v.name, v.capacity " +
                "HAVING v.capacity != seat_count");

        // Check show schedule total_seats vs venue capacities
        List<Map<String, Object>> scheduleDiscrepancies = jdbcTemplate.queryForList(
                "SELECT ss.id, ss.show_id, ss.venue_id, ss.total_seats, v.capacity " +
                "FROM show_schedule ss JOIN venue v ON ss.venue_id = v.id " +
                "WHERE ss.total_seats != v.capacity");

        // Check show schedule seats_available vs (total_seats - booked seats)
        List<Map<String, Object>> availabilityDiscrepancies = jdbcTemplate.queryForList(
                "SELECT ss.id, ss.show_id, ss.venue_id, ss.total_seats, ss.seats_available, " +
                "(ss.total_seats - IFNULL((SELECT COUNT(*) FROM seat_booking sb " +
                "JOIN booking b ON sb.booking_id = b.id " +
                "WHERE b.show_schedule_id = ss.id " +
                "AND b.status NOT IN ('CANCELLED', 'EXPIRED', 'REFUNDED')), 0)) as calculated_available " +
                "FROM show_schedule ss " +
                "WHERE ss.seats_available != (ss.total_seats - IFNULL((SELECT COUNT(*) FROM seat_booking sb " +
                "JOIN booking b ON sb.booking_id = b.id " +
                "WHERE b.show_schedule_id = ss.id " +
                "AND b.status NOT IN ('CANCELLED', 'EXPIRED', 'REFUNDED')), 0))");

        if (!venueDiscrepancies.isEmpty() || !scheduleDiscrepancies.isEmpty() || !availabilityDiscrepancies.isEmpty()) {
            System.out.println("Found seat count inconsistencies:");
            System.out.println("- " + venueDiscrepancies.size() + " venues with capacity not matching seat count");
            System.out.println("- " + scheduleDiscrepancies.size() + " schedules with total_seats not matching venue capacity");
            System.out.println("- " + availabilityDiscrepancies.size() + " schedules with seats_available not matching calculation");

            // Fix the inconsistencies
            fixSeatCountInconsistencies();
        } else {
            System.out.println("No seat count inconsistencies found.");
        }
    }

    /**
     * Checks for venues that have capacity but no seats
     */
    private void checkMissingSeats() {
        System.out.println("Checking for venues with missing seats...");

        // Check for venues with capacity but no seats
        List<Map<String, Object>> venuesWithoutSeats = jdbcTemplate.queryForList(
                "SELECT v.id, v.name, v.capacity, COUNT(s.id) as seat_count " +
                "FROM venue v LEFT JOIN seat s ON v.id = s.venue_id " +
                "GROUP BY v.id, v.name, v.capacity " +
                "HAVING v.capacity > 0 AND seat_count = 0");

        if (!venuesWithoutSeats.isEmpty()) {
            System.out.println("Found " + venuesWithoutSeats.size() + " venues with capacity but no seats:");
            for (Map<String, Object> venue : venuesWithoutSeats) {
                System.out.println("- Venue ID " + venue.get("id") + ": " + venue.get("name") + 
                                  " (capacity: " + venue.get("capacity") + ", seats: " + venue.get("seat_count") + ")");
            }

            // Generate seats for these venues
            generateMissingSeats();
        } else {
            System.out.println("No venues with missing seats found.");
        }
    }

    /**
     * Fixes inconsistencies by running the SQL script
     */
    private void fixSeatCountInconsistencies() {
        try {
            System.out.println("Fixing seat count inconsistencies...");
            
            // Load the SQL script
            String sqlScript = readResourceFile("db/fix_seat_counts.sql");
            
            // Execute the script
            executeScript(sqlScript);
            
            System.out.println("Seat count inconsistencies fixed successfully.");
        } catch (Exception e) {
            System.err.println("Error fixing seat count inconsistencies: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Generates seats for venues that have capacity but no seats
     */
    private void generateMissingSeats() {
        try {
            System.out.println("Generating missing seats...");
            
            // Load the SQL script
            String sqlScript = readResourceFile("db/generate_missing_seats.sql");
            
            // Execute the script
            executeScript(sqlScript);
            
            System.out.println("Missing seats generated successfully.");
        } catch (Exception e) {
            System.err.println("Error generating missing seats: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Executes an SQL script
     */
    private void executeScript(String sqlScript) {
        // Split the script into individual statements
        String[] statements = sqlScript.split(";");
        
        // Execute each statement
        for (String statement : statements) {
            if (!statement.trim().isEmpty() && !statement.trim().startsWith("--")) {
                try {
                    jdbcTemplate.execute(statement);
                } catch (Exception e) {
                    System.err.println("Error executing SQL statement: " + statement);
                    System.err.println("Error message: " + e.getMessage());
                }
            }
        }
    }

    /**
     * Reads a resource file into a string
     */
    private String readResourceFile(String path) throws IOException {
        ClassPathResource resource = new ClassPathResource(path);
        try (Reader reader = new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)) {
            return FileCopyUtils.copyToString(reader);
        }
    }
}