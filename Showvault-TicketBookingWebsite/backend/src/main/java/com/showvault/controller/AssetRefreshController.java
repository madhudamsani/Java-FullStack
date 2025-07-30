package com.showvault.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/assets")
@CrossOrigin(origins = "http://localhost:4200")
public class AssetRefreshController {

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshAssets() {
        try {
            // Path to the frontend directory
            Path frontendPath = Paths.get("../frontend").toAbsolutePath().normalize();
            Path scriptPath = frontendPath.resolve("scripts/scan-assets.js");
            
            if (!Files.exists(scriptPath)) {
                return ResponseEntity.status(404)
                    .body(Map.of("error", "Scan script not found: " + scriptPath));
            }

            // Execute the Node.js script
            ProcessBuilder processBuilder = new ProcessBuilder("node", "scripts/scan-assets.js");
            processBuilder.directory(frontendPath.toFile());
            processBuilder.redirectErrorStream(true);

            Process process = processBuilder.start();
            
            // Read the output
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            // Wait for the process to complete (with timeout)
            boolean finished = process.waitFor(30, TimeUnit.SECONDS);
            
            if (!finished) {
                process.destroyForcibly();
                return ResponseEntity.status(500)
                    .body(Map.of("error", "Script execution timed out"));
            }

            int exitCode = process.exitValue();
            
            if (exitCode == 0) {
                // Parse the output to extract scan results
                String outputStr = output.toString();
                int totalScanned = extractTotalScanned(outputStr);
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("totalScanned", totalScanned);
                response.put("message", "Images list refreshed successfully");
                response.put("output", outputStr);
                
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(500)
                    .body(Map.of(
                        "error", "Script execution failed",
                        "exitCode", exitCode,
                        "output", output.toString()
                    ));
            }

        } catch (IOException e) {
            return ResponseEntity.status(500)
                .body(Map.of("error", "Failed to execute scan script: " + e.getMessage()));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return ResponseEntity.status(500)
                .body(Map.of("error", "Script execution was interrupted"));
        }
    }

    @GetMapping("/status")
    public ResponseEntity<?> getAssetStatus() {
        try {
            Path frontendPath = Paths.get("../frontend").toAbsolutePath().normalize();
            Path imagesListPath = frontendPath.resolve("src/assets/images-list.json");
            
            Map<String, Object> status = new HashMap<>();
            
            if (Files.exists(imagesListPath)) {
                status.put("imagesListExists", true);
                status.put("lastModified", Files.getLastModifiedTime(imagesListPath).toString());
                status.put("size", Files.size(imagesListPath));
            } else {
                status.put("imagesListExists", false);
                status.put("message", "Images list not found. Run refresh to generate.");
            }
            
            return ResponseEntity.ok(status);
            
        } catch (IOException e) {
            return ResponseEntity.status(500)
                .body(Map.of("error", "Failed to check asset status: " + e.getMessage()));
        }
    }

    private int extractTotalScanned(String output) {
        // Extract total scanned from output like "📊 Total items scanned: 5"
        try {
            String[] lines = output.split("\n");
            for (String line : lines) {
                if (line.contains("Total items scanned:")) {
                    String[] parts = line.split(":");
                    if (parts.length > 1) {
                        String numberStr = parts[1].trim();
                        return Integer.parseInt(numberStr);
                    }
                }
            }
        } catch (NumberFormatException e) {
            // Ignore parsing errors
        }
        return 0;
    }
}