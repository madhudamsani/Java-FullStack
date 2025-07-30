package com.showvault.service;

import com.showvault.model.Show;
import com.showvault.model.ShowSchedule;
import com.showvault.model.Venue;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.ArrayList;

@Service
public class ScheduleValidationService {

    @Autowired
    private ShowScheduleService showScheduleService;

    // Buffer time between shows (30 minutes as per requirement)
    private static final int BUFFER_MINUTES = 30;
    
    public static class ValidationResult {
        private boolean valid;
        private String errorMessage;
        private List<String> warnings;
        
        public ValidationResult(boolean valid, String errorMessage) {
            this.valid = valid;
            this.errorMessage = errorMessage;
            this.warnings = new ArrayList<>();
        }
        
        public ValidationResult(boolean valid, String errorMessage, List<String> warnings) {
            this.valid = valid;
            this.errorMessage = errorMessage;
            this.warnings = warnings != null ? warnings : new ArrayList<>();
        }
        
        // Getters
        public boolean isValid() { return valid; }
        public String getErrorMessage() { return errorMessage; }
        public List<String> getWarnings() { return warnings; }
        
        // Setters
        public void setValid(boolean valid) { this.valid = valid; }
        public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
        public void setWarnings(List<String> warnings) { this.warnings = warnings; }
        
        public void addWarning(String warning) {
            if (this.warnings == null) {
                this.warnings = new ArrayList<>();
            }
            this.warnings.add(warning);
        }
    }
    
    public static class ScheduleTimeInfo {
        private LocalTime startTime;
        private LocalTime endTime;
        private LocalTime bufferEndTime; // End time + buffer
        
        public ScheduleTimeInfo(LocalTime startTime, LocalTime endTime) {
            this.startTime = startTime;
            this.endTime = endTime;
            this.bufferEndTime = endTime.plusMinutes(BUFFER_MINUTES);
        }
        
        // Getters
        public LocalTime getStartTime() { return startTime; }
        public LocalTime getEndTime() { return endTime; }
        public LocalTime getBufferEndTime() { return bufferEndTime; }
    }

    /**
     * Validate a new schedule for conflicts and business rules
     */
    public ValidationResult validateNewSchedule(Show show, Venue venue, LocalDate showDate, 
                                              LocalTime startTime, Long excludeScheduleId) {
        List<String> warnings = new ArrayList<>();
        
        // 1. Calculate end time with show duration
        ScheduleTimeInfo newScheduleTime = calculateScheduleTimes(show, startTime);
        
        // 2. Get existing schedules for the same venue and date
        List<ShowSchedule> existingSchedules = showScheduleService.getSchedulesByVenueAndDate(venue.getId(), showDate);
        
        // 3. Filter out the schedule being updated (if any)
        if (excludeScheduleId != null) {
            existingSchedules = existingSchedules.stream()
                .filter(s -> !s.getId().equals(excludeScheduleId))
                .collect(java.util.stream.Collectors.toList());
        }
        
        // 4. Check for duplicate time slots
        ValidationResult duplicateCheck = checkDuplicateTimeSlot(existingSchedules, startTime, show.getTitle());
        if (!duplicateCheck.isValid()) {
            return duplicateCheck;
        }
        
        // 5. Check for overlapping schedules
        ValidationResult overlapCheck = checkScheduleOverlaps(existingSchedules, newScheduleTime, show.getTitle());
        if (!overlapCheck.isValid()) {
            return overlapCheck;
        }
        warnings.addAll(overlapCheck.getWarnings());
        
        // 6. Check business hour constraints
        ValidationResult businessHourCheck = checkBusinessHours(newScheduleTime);
        if (!businessHourCheck.isValid()) {
            return businessHourCheck;
        }
        warnings.addAll(businessHourCheck.getWarnings());
        
        // 7. Check venue capacity and show compatibility
        ValidationResult venueCheck = checkVenueCompatibility(venue, show);
        warnings.addAll(venueCheck.getWarnings());
        
        return new ValidationResult(true, null, warnings);
    }
    
    /**
     * Calculate schedule times with proper end time and buffer
     */
    public ScheduleTimeInfo calculateScheduleTimes(Show show, LocalTime startTime) {
        LocalTime endTime;
        
        if (show.getDuration() != null && show.getDuration() > 0) {
            endTime = startTime.plusMinutes(show.getDuration());
        } else {
            // Default duration based on show type
            int defaultDuration = getDefaultDuration(show.getType());
            endTime = startTime.plusMinutes(defaultDuration);
        }
        
        return new ScheduleTimeInfo(startTime, endTime);
    }
    
    /**
     * Check for duplicate time slots (Scenario 1)
     */
    private ValidationResult checkDuplicateTimeSlot(List<ShowSchedule> existingSchedules, 
                                                   LocalTime newStartTime, String showTitle) {
        for (ShowSchedule existing : existingSchedules) {
            if (existing.getStartTime().equals(newStartTime)) {
                String existingShowTitle = existing.getShow() != null ? existing.getShow().getTitle() : "Unknown Show";
                return new ValidationResult(false, 
                    String.format("Duplicate time slot detected! A show '%s' is already scheduled at %s. " +
                                "Please choose a different time slot.", 
                                existingShowTitle, 
                                newStartTime.format(DateTimeFormatter.ofPattern("h:mm a"))));
            }
        }
        return new ValidationResult(true, null);
    }
    
    /**
     * Check for overlapping schedules (Scenario 2)
     */
    private ValidationResult checkScheduleOverlaps(List<ShowSchedule> existingSchedules, 
                                                  ScheduleTimeInfo newSchedule, String showTitle) {
        List<String> warnings = new ArrayList<>();
        
        for (ShowSchedule existing : existingSchedules) {
            ScheduleTimeInfo existingTime = new ScheduleTimeInfo(existing.getStartTime(), existing.getEndTime());
            String existingShowTitle = existing.getShow() != null ? existing.getShow().getTitle() : "Unknown Show";
            
            // Check if new schedule overlaps with existing schedule (including buffer)
            boolean overlaps = checkTimeOverlap(newSchedule, existingTime);
            
            if (overlaps) {
                String conflictMessage = String.format(
                    "Schedule conflict detected! Your show '%s' (%s - %s) conflicts with existing show '%s' (%s - %s). " +
                    "Minimum %d minutes gap required between shows for cleanup and audience transition.",
                    showTitle,
                    newSchedule.getStartTime().format(DateTimeFormatter.ofPattern("h:mm a")),
                    newSchedule.getEndTime().format(DateTimeFormatter.ofPattern("h:mm a")),
                    existingShowTitle,
                    existingTime.getStartTime().format(DateTimeFormatter.ofPattern("h:mm a")),
                    existingTime.getEndTime().format(DateTimeFormatter.ofPattern("h:mm a")),
                    BUFFER_MINUTES
                );
                
                return new ValidationResult(false, conflictMessage);
            }
            
            // Check for tight scheduling (less than ideal gap)
            boolean tightScheduling = checkTightScheduling(newSchedule, existingTime);
            if (tightScheduling) {
                warnings.add(String.format(
                    "Tight scheduling detected with '%s'. Consider adding more time between shows for better operations.",
                    existingShowTitle
                ));
            }
        }
        
        return new ValidationResult(true, null, warnings);
    }
    
    /**
     * Check if two time ranges overlap (including buffer time)
     */
    private boolean checkTimeOverlap(ScheduleTimeInfo schedule1, ScheduleTimeInfo schedule2) {
        // Schedule 1 starts before Schedule 2 ends (with buffer) AND
        // Schedule 1 ends (with buffer) after Schedule 2 starts
        return schedule1.getStartTime().isBefore(schedule2.getBufferEndTime()) &&
               schedule1.getBufferEndTime().isAfter(schedule2.getStartTime());
    }
    
    /**
     * Check for tight scheduling (less than ideal but not conflicting)
     */
    private boolean checkTightScheduling(ScheduleTimeInfo schedule1, ScheduleTimeInfo schedule2) {
        int idealGap = BUFFER_MINUTES + 15; // 45 minutes ideal gap
        
        // Check gap between schedule1 end and schedule2 start
        if (schedule1.getEndTime().isBefore(schedule2.getStartTime())) {
            long gapMinutes = java.time.Duration.between(schedule1.getEndTime(), schedule2.getStartTime()).toMinutes();
            return gapMinutes < idealGap && gapMinutes >= BUFFER_MINUTES;
        }
        
        // Check gap between schedule2 end and schedule1 start
        if (schedule2.getEndTime().isBefore(schedule1.getStartTime())) {
            long gapMinutes = java.time.Duration.between(schedule2.getEndTime(), schedule1.getStartTime()).toMinutes();
            return gapMinutes < idealGap && gapMinutes >= BUFFER_MINUTES;
        }
        
        return false;
    }
    
    /**
     * Check business hours constraints
     */
    private ValidationResult checkBusinessHours(ScheduleTimeInfo scheduleTime) {
        List<String> warnings = new ArrayList<>();
        
        // Early morning shows (before 9 AM)
        if (scheduleTime.getStartTime().isBefore(LocalTime.of(9, 0))) {
            warnings.add("Early morning show scheduled. Ensure venue staff and audience accessibility.");
        }
        
        // Late night shows (after 11 PM)
        if (scheduleTime.getStartTime().isAfter(LocalTime.of(23, 0))) {
            warnings.add("Late night show scheduled. Check local regulations and transportation availability.");
        }
        
        // Very late shows (ending after midnight)
        if (scheduleTime.getEndTime().isAfter(LocalTime.of(23, 59)) || 
            scheduleTime.getEndTime().isBefore(LocalTime.of(6, 0))) {
            return new ValidationResult(false, 
                "Show ends too late (after midnight). Please schedule earlier or split into multiple sessions.");
        }
        
        return new ValidationResult(true, null, warnings);
    }
    
    /**
     * Check venue compatibility
     */
    private ValidationResult checkVenueCompatibility(Venue venue, Show show) {
        List<String> warnings = new ArrayList<>();
        
        // Check venue capacity vs expected audience
        if (venue.getCapacity() != null && venue.getCapacity() < 50) {
            warnings.add("Small venue capacity. Ensure it matches expected audience size.");
        }
        
        // Check show type compatibility (if venue has type restrictions)
        if (show.getType() != null) {
            switch (show.getType().toLowerCase()) {
                case "concert":
                    warnings.add("Concert scheduled. Ensure venue has proper sound equipment and acoustics.");
                    break;
                case "theater":
                    warnings.add("Theater show scheduled. Ensure venue has proper stage setup and lighting.");
                    break;
                case "movie":
                    warnings.add("Movie screening scheduled. Ensure venue has projection equipment.");
                    break;
            }
        }
        
        return new ValidationResult(true, null, warnings);
    }
    
    /**
     * Get default duration based on show type
     */
    private int getDefaultDuration(String showType) {
        if (showType == null) return 120; // Default 2 hours
        
        switch (showType.toLowerCase()) {
            case "movie":
                return 150; // 2.5 hours (including ads/trailers)
            case "concert":
                return 180; // 3 hours
            case "theater":
                return 150; // 2.5 hours
            case "event":
                return 120; // 2 hours
            default:
                return 120; // 2 hours default
        }
    }
    
    /**
     * Validate bulk time slots creation
     */
    public ValidationResult validateBulkTimeSlots(Show show, Venue venue, LocalDate showDate, 
                                                 List<LocalTime> timeSlots) {
        List<String> allWarnings = new ArrayList<>();
        
        // Sort time slots for better validation
        timeSlots.sort(LocalTime::compareTo);
        
        // Validate each time slot individually
        for (int i = 0; i < timeSlots.size(); i++) {
            LocalTime currentTime = timeSlots.get(i);
            
            // Validate against existing schedules
            ValidationResult result = validateNewSchedule(show, venue, showDate, currentTime, null);
            if (!result.isValid()) {
                return result; // Return first error
            }
            allWarnings.addAll(result.getWarnings());
            
            // Validate against other time slots in the same bulk operation
            for (int j = i + 1; j < timeSlots.size(); j++) {
                LocalTime otherTime = timeSlots.get(j);
                
                // Check for duplicates within bulk operation
                if (currentTime.equals(otherTime)) {
                    return new ValidationResult(false, 
                        String.format("Duplicate time slot %s found in your request. Please remove duplicates.", 
                                    currentTime.format(DateTimeFormatter.ofPattern("h:mm a"))));
                }
                
                // Check for overlaps within bulk operation
                ScheduleTimeInfo currentSchedule = calculateScheduleTimes(show, currentTime);
                ScheduleTimeInfo otherSchedule = calculateScheduleTimes(show, otherTime);
                
                if (checkTimeOverlap(currentSchedule, otherSchedule)) {
                    return new ValidationResult(false, 
                        String.format("Time slots %s and %s overlap. Shows need %d minutes gap for cleanup and transition.", 
                                    currentTime.format(DateTimeFormatter.ofPattern("h:mm a")),
                                    otherTime.format(DateTimeFormatter.ofPattern("h:mm a")),
                                    BUFFER_MINUTES));
                }
            }
        }
        
        return new ValidationResult(true, null, allWarnings);
    }
    
    /**
     * Get suggested alternative time slots when validation fails
     */
    public List<LocalTime> suggestAlternativeTimeSlots(Show show, Venue venue, LocalDate showDate, 
                                                      LocalTime requestedTime, int numberOfSuggestions) {
        List<LocalTime> suggestions = new ArrayList<>();
        List<ShowSchedule> existingSchedules = showScheduleService.getSchedulesByVenueAndDate(venue.getId(), showDate);
        
        // Try times around the requested time
        for (int offset = 30; offset <= 180; offset += 30) { // 30 min to 3 hour range
            if (suggestions.size() >= numberOfSuggestions) break;
            
            // Try later time
            LocalTime laterTime = requestedTime.plusMinutes(offset);
            if (isTimeSlotAvailable(show, existingSchedules, laterTime)) {
                suggestions.add(laterTime);
            }
            
            if (suggestions.size() >= numberOfSuggestions) break;
            
            // Try earlier time
            LocalTime earlierTime = requestedTime.minusMinutes(offset);
            if (earlierTime.isAfter(LocalTime.of(8, 0)) && // Not too early
                isTimeSlotAvailable(show, existingSchedules, earlierTime)) {
                suggestions.add(earlierTime);
            }
        }
        
        return suggestions;
    }
    
    /**
     * Check if a time slot is available
     */
    private boolean isTimeSlotAvailable(Show show, List<ShowSchedule> existingSchedules, LocalTime timeSlot) {
        ScheduleTimeInfo newSchedule = calculateScheduleTimes(show, timeSlot);
        
        for (ShowSchedule existing : existingSchedules) {
            ScheduleTimeInfo existingTime = new ScheduleTimeInfo(existing.getStartTime(), existing.getEndTime());
            if (checkTimeOverlap(newSchedule, existingTime)) {
                return false;
            }
        }
        
        return true;
    }
}