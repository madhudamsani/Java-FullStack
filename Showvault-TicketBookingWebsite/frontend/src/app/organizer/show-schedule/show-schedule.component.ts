import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ShowService } from '../../services/show.service';
import { Show } from '../../models/show.model';
import { ShowSchedule, Venue } from '../../models/show-interfaces.model';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-show-schedule',
  templateUrl: './show-schedule.component.html',
  styleUrls: ['./show-schedule.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, DecimalPipe]
})
export class ShowScheduleComponent implements OnInit {
  showId!: number;
  show: Show | null = null;
  schedules: ShowSchedule[] = [];
  venues: Venue[] = [];
  
  scheduleForm: FormGroup;
  selectedSchedule: ShowSchedule | null = null;
  isLoading = true;
  isSubmitting = false;
  error = '';
  success = '';
  showForm = false;
  lastSubmittedValues: any = null;
  createAnother = false;
  timeSlots: FormArray;
  
  // Validation messages
  validationMessages = {
    dateConflict: false,
    venueConflict: false,
    capacityExceeded: false,
    timeSlotConflict: false,
    timeSlotEmpty: false,
    timeSlotBuffer: false
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private showService: ShowService,
    private fb: FormBuilder
  ) {
    // Initialize with one empty time slot
    this.timeSlots = this.fb.array([this.fb.control('', Validators.required)]);
    
    this.scheduleForm = this.fb.group({
      showDate: ['', Validators.required],
      basePrice: ['', [Validators.required, Validators.min(0)]],
      venue: ['', Validators.required],
      totalSeats: ['', [Validators.required, Validators.min(1)]],
      timeSlots: this.timeSlots
    });
  }
  
  // Helper methods for time slots
  get timeSlotsArray(): FormArray {
    return this.scheduleForm.get('timeSlots') as FormArray;
  }
  
  addTimeSlot(): void {
    this.timeSlotsArray.push(this.fb.control('', Validators.required));
  }
  
  removeTimeSlot(index: number): void {
    if (this.timeSlotsArray.length > 1) {
      this.timeSlotsArray.removeAt(index);
    }
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.showId = +id;
        this.loadShow();
        this.loadSchedules();
        this.loadVenues();
      }
    });
  }

  loadShow(): void {
    this.showService.getShowById(this.showId).subscribe({
      next: (show) => {
        this.show = show;
      },
      error: (error) => {
        this.error = `Failed to load show: ${error.message}`;
        console.error('Error loading show:', error);
      }
    });
  }

  loadSchedules(): void {
    this.isLoading = true;
    this.showService.getSchedules(this.showId).subscribe({
      next: (schedules) => {
        this.schedules = schedules;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = `Failed to load schedules: ${error.message}`;
        console.error('Error loading schedules:', error);
        this.isLoading = false;
      }
    });
  }

  loadVenues(): void {
    this.showService.getVenues().subscribe({
      next: (venues) => {
        this.venues = venues;
      },
      error: (error) => {
        this.error = `Failed to load venues: ${error.message}`;
        console.error('Error loading venues:', error);
      }
    });
  }

  openScheduleForm(schedule?: ShowSchedule, createAnother: boolean = false): void {
    this.selectedSchedule = schedule || null;
    this.createAnother = createAnother;
    
    // Reset validation messages
    this.resetValidationMessages();
    
    // Reset time slots to just one when editing or creating new
    this.resetTimeSlots();
    
    if (schedule) {
      // Editing existing schedule - only one time slot for existing schedule
      this.scheduleForm.patchValue({
        showDate: schedule.showDate,
        basePrice: schedule.basePrice,
        venue: schedule.venue?.id,
        totalSeats: schedule.totalSeats
      });
      
      // Set the first time slot to the schedule's time
      this.timeSlotsArray.at(0).setValue(schedule.showTime);
    } else if (createAnother && this.lastSubmittedValues) {
      // Creating another with previous values
      this.scheduleForm.patchValue({
        showDate: this.lastSubmittedValues.showDate,
        basePrice: this.lastSubmittedValues.basePrice,
        venue: '', // Reset venue for new selection
        totalSeats: this.lastSubmittedValues.totalSeats
      });
      
      // Initialize with a single empty time slot
      this.timeSlotsArray.at(0).setValue('');
    } else {
      // Brand new schedule
      this.scheduleForm.reset();
    }
    
    this.showForm = true;
  }

  closeScheduleForm(): void {
    this.showForm = false;
    this.selectedSchedule = null;
    this.createAnother = false;
    this.scheduleForm.reset();
    this.resetTimeSlots();
    this.resetValidationMessages();
  }
  
  resetTimeSlots(): void {
    // Clear existing time slots
    while (this.timeSlotsArray.length > 0) {
      this.timeSlotsArray.removeAt(0);
    }
    
    // Add a single empty time slot
    this.timeSlotsArray.push(this.fb.control('', Validators.required));
  }
  
  resetValidationMessages(): void {
    this.validationMessages = {
      dateConflict: false,
      venueConflict: false,
      capacityExceeded: false,
      timeSlotConflict: false,
      timeSlotEmpty: false,
      timeSlotBuffer: false
    };
    this.error = '';
  }



  onSubmit(): void {
    if (this.scheduleForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.scheduleForm.controls).forEach(key => {
        if (key === 'timeSlots') {
          const timeSlots = this.scheduleForm.get('timeSlots') as FormArray;
          timeSlots.controls.forEach(control => control.markAsTouched());
        } else {
          this.scheduleForm.get(key)?.markAsTouched();
        }
      });
      return;
    }
    
    // Check if all time slots are filled
    if (this.timeSlotsArray.controls.some(control => !control.value)) {
      this.validationMessages.timeSlotEmpty = true;
      this.error = 'Please fill all time slots or remove empty ones';
      // Mark all time slots as touched
      this.timeSlotsArray.controls.forEach(control => control.markAsTouched());
      return;
    }
    
    this.isSubmitting = true;
    this.error = '';
    this.success = '';
    this.resetValidationMessages();
    
    const formValue = this.scheduleForm.value;
    const selectedVenue = this.venues.find(v => v.id === +formValue.venue);
    
    if (!selectedVenue) {
      this.error = 'Please select a valid venue';
      this.isSubmitting = false;
      return;
    }
    
    // Validate time slots to ensure no duplicates
    const timeSlots = formValue.timeSlots;
    if (new Set(timeSlots).size !== timeSlots.length) {
      this.validationMessages.timeSlotConflict = true;
      this.error = 'There are duplicate time slots. Please use unique times';
      this.isSubmitting = false;
      return;
    }
    
    // Check sufficient time buffer between slots based on show duration
    if (timeSlots.length > 1 && this.show) {
      // Get show duration and add 30 minutes buffer
      const showDuration = this.show.duration || 120; // Default to 120 minutes if not specified
      const requiredBuffer = showDuration + 30; // Show duration + 30 minutes buffer
      
      // Sort the time slots
      const sortedTimeSlots = [...timeSlots].sort();
      
      for (let i = 0; i < sortedTimeSlots.length - 1; i++) {
        const currentTime = this.convertTimeToMinutes(sortedTimeSlots[i]);
        const nextTime = this.convertTimeToMinutes(sortedTimeSlots[i + 1]);
        
        // Check if next show starts after current show ends + buffer
        if (nextTime - currentTime < requiredBuffer) {
          this.validationMessages.timeSlotBuffer = true;
          this.error = `Each time slot must be at least ${showDuration} minutes (show duration) + 30 minutes buffer after the previous one`;
          this.isSubmitting = false;
          return;
        }
      }
    }
    
    // Store form values for potential "add another" action
    this.lastSubmittedValues = {...formValue, timeSlots: undefined};
    
    // If editing an existing schedule, there should only be one time slot
    if (this.selectedSchedule) {
      const scheduleData: any = {
        showId: this.showId,
        showDate: formValue.showDate,
        showTime: formValue.timeSlots[0], // Use the first (and only) time slot
        basePrice: +formValue.basePrice,
        venueId: selectedVenue.id,
        totalSeats: +formValue.totalSeats,
        seatsAvailable: +formValue.totalSeats,
        status: 'SCHEDULED'
      };
      
      console.log('Updating schedule data:', scheduleData);
      
      // Update existing schedule
      this.showService.updateSchedule(this.showId, this.selectedSchedule.id!, scheduleData).subscribe({
        next: (updatedSchedule) => {
          console.log('Received updated schedule:', updatedSchedule);
          
          // Ensure the schedule has all required fields
          const completeSchedule: ShowSchedule = {
            ...updatedSchedule,
            showId: this.showId,
            // Ensure showTime is present
            showTime: updatedSchedule.showTime || this.selectedSchedule!.showTime,
            // Ensure venue is complete
            venue: updatedSchedule.venue || this.selectedSchedule!.venue
          };
          
          const index = this.schedules.findIndex(s => s.id === this.selectedSchedule!.id);
          if (index !== -1) {
            this.schedules[index] = completeSchedule;
          }
          
          this.success = 'Schedule updated successfully!';
          this.isSubmitting = false;
          this.closeScheduleForm();
        },
        error: (error) => {
          this.handleScheduleError(error);
        }
      });
    } else {
      // For new schedules, create one per time slot
      // Validate all time slots first
      for (const timeSlot of timeSlots) {
        // Validate each time slot against existing schedules
        if (!this.validateTimeSlot(formValue, selectedVenue, timeSlot)) {
          this.isSubmitting = false;
          return;
        }
      }
      
      // Create an array of promises for each schedule creation
      const scheduleCreationPromises = timeSlots.map((timeSlot: string) => {
        const scheduleData: any = {
          showId: this.showId,
          showDate: formValue.showDate,
          showTime: timeSlot,
          basePrice: +formValue.basePrice,
          venueId: selectedVenue.id,
          totalSeats: +formValue.totalSeats,
          seatsAvailable: +formValue.totalSeats,
          status: 'SCHEDULED'
        };
        
        return this.showService.addSchedule(this.showId, scheduleData).toPromise();
      });
      
      // Process all schedules
      Promise.all(scheduleCreationPromises)
        .then(newSchedules => {
          console.log('Created schedules:', newSchedules);
          
          // Add all new schedules to the list
          newSchedules.forEach(schedule => {
            if (schedule) {
              this.schedules.push(schedule);
            }
          });
          
          this.success = `Successfully created ${newSchedules.length} schedule(s)!`;
          this.isSubmitting = false;
          
          const createAnother = this.createAnother;
          if (createAnother) {
            // Keep form open but reset venue selection for creating another schedule
            this.openScheduleForm(undefined, true);
          } else {
            this.closeScheduleForm();
          }
        })
        .catch(error => {
          this.handleScheduleError(error);
        });
    }
  }
  
  /**
   * Validates a specific time slot against existing schedules
   * Checks both exact time conflicts and overlapping schedules considering duration and buffer
   */
  validateTimeSlot(formValue: any, selectedVenue: Venue, timeSlot: string): boolean {
    // 1. Check if this venue already has a schedule at this exact date and time (direct conflict)
    const exactConflict = this.schedules.find(s => 
      s.venue?.id === selectedVenue.id && 
      s.showDate === formValue.showDate &&
      s.showTime === timeSlot
    );
    
    if (exactConflict) {
      this.validationMessages.venueConflict = true;
      this.error = `This venue already has a schedule at ${timeSlot} on this date`;
      return false;
    }
    
    // 2. Check for overlapping schedules considering show duration and buffer time
    const newShowTime = this.convertTimeToMinutes(timeSlot);
    const showDuration = this.show?.duration || 120; // Default 2 hours if not specified
    const bufferTime = 30; // 30 min buffer between shows
    
    // Calculate end time for the new show (in minutes since start of day)
    const newShowEndTime = newShowTime + showDuration;
    
    // Check all existing schedules at the same venue and date for overlaps
    const overlappingSchedule = this.schedules.find(s => {
      // Only check schedules at the same venue and date
      if (s.venue?.id !== selectedVenue.id || s.showDate !== formValue.showDate) {
        return false;
      }
      
      const existingShowTime = this.convertTimeToMinutes(s.showTime);
      const existingShowDuration = this.show?.duration || 120;
      const existingShowEndTime = existingShowTime + existingShowDuration;
      
      // Check if shows overlap (including buffer time)
      // New show starts before existing show ends (+ buffer)
      const newStartsBeforeExistingEnds = newShowTime < (existingShowEndTime + bufferTime);
      // New show ends (+ buffer) after existing show starts
      const newEndsAfterExistingStarts = (newShowEndTime + bufferTime) > existingShowTime;
      
      // If both conditions are true, there's an overlap
      return newStartsBeforeExistingEnds && newEndsAfterExistingStarts;
    });
    
    if (overlappingSchedule) {
      this.validationMessages.venueConflict = true;
      this.error = `Schedule conflict detected! Your new schedule at ${timeSlot} overlaps with an existing show at ${overlappingSchedule.showTime}. Shows require ${showDuration} minutes duration plus ${bufferTime} minutes buffer between them.`;
      return false;
    }
    
    return true;
  }
  
  /**
   * Handles errors from schedule creation/update
   */
  handleScheduleError(error: any): void {
    // Parse the error message to check for specific validation failures
    const errorMsg = error.message || error.error?.message || 'An unknown error occurred';
    
    if (errorMsg.includes('conflict') && errorMsg.includes('venue')) {
      this.validationMessages.venueConflict = true;
      
      // More specific handling of different conflict types
      if (errorMsg.includes('overlap') || errorMsg.includes('buffer')) {
        // This is a schedule overlap error with buffer time
        this.error = errorMsg; // Use the specific error message from the backend
      } else if (errorMsg.includes('Duplicate time slot')) {
        // This is an exact time conflict
        this.error = errorMsg; // Use the specific error message from the backend
      } else {
        // General conflict case
        this.error = 'This venue already has a schedule at or near the selected time';
      }
      
      // If the backend provided suggested times, show them
      if (error.error?.suggestedTimes && error.error.suggestedTimes.length > 0) {
        this.error += '\n\nSuggested alternative times: ' + 
          error.error.suggestedTimes.join(', ');
      }
    } else if (errorMsg.includes('capacity')) {
      this.validationMessages.capacityExceeded = true;
      this.error = 'The requested number of seats exceeds the venue capacity';
    } else {
      this.error = `Failed to ${this.selectedSchedule ? 'update' : 'create'} schedule: ${errorMsg}`;
    }
    
    console.error(`Error ${this.selectedSchedule ? 'updating' : 'creating'} schedule:`, error);
    this.isSubmitting = false;
  }
  
  /**
   * Validates the schedule before submission
   */
  validateSchedule(formValue: any, selectedVenue: Venue): boolean {
    // This method is primarily used for validating common elements across all time slots
    
    // Check if total seats exceeds venue capacity
    if (selectedVenue.capacity && formValue.totalSeats > selectedVenue.capacity) {
      this.validationMessages.capacityExceeded = true;
      this.error = `The requested number of seats (${formValue.totalSeats}) exceeds the venue capacity (${selectedVenue.capacity})`;
      return false;
    }
    
    // Time slot specific validations are now handled in validateTimeSlot
    
    return true;
  }

  // Bulk schedule creation method has been removed in favor of "Add Another" approach



  deleteSchedule(schedule: ShowSchedule): void {
    if (confirm(`Are you sure you want to delete this schedule?`)) {
      this.showService.deleteSchedule(this.showId, schedule.id!).subscribe({
        next: () => {
          this.schedules = this.schedules.filter(s => s.id !== schedule.id);
          this.success = 'Schedule deleted successfully!';
        },
        error: (error) => {
          this.error = `Failed to delete schedule: ${error.message}`;
          console.error('Error deleting schedule:', error);
        }
      });
    }
  }

  configureSeating(schedule: ShowSchedule): void {
    this.router.navigate(['/organizer/shows', this.showId, 'schedules', schedule.id, 'venue-mapping']);
  }

  formatDateTime(date: string, time?: string): string {
    if (!date) return 'N/A';
    
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    if (time) {
      // Format time to be more readable if it's in ISO format
      let displayTime = time;
      
      // Check if time is in ISO format (contains T or has seconds)
      if (time.includes('T') || time.split(':').length > 2) {
        try {
          // Try to parse and format the time
          const timeParts = time.split('T')[1] || time;
          const timeObj = new Date(`1970-01-01T${timeParts}`);
          displayTime = timeObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
        } catch (e) {
          console.warn('Could not parse time:', time);
          // Keep original time if parsing fails
        }
      }
      
      return `${formattedDate} at ${displayTime}`;
    }
    
    return formattedDate;
  }

  getStatusClass(status?: string): string {
    switch (status) {
      case 'SCHEDULED':
        return 'badge bg-success';
      case 'CANCELLED':
        return 'badge bg-danger';
      case 'COMPLETED':
        return 'badge bg-secondary';
      default:
        return 'badge bg-primary';
    }
  }

  /**
   * Converts time string (HH:MM) to minutes for easier comparison
   */
  convertTimeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  // Helper methods for schedule organization (removed bulk methods)

  // Helper methods for better schedule organization
  getSchedulesByDate(): { [date: string]: ShowSchedule[] } {
    const schedulesByDate: { [date: string]: ShowSchedule[] } = {};
    
    this.schedules.forEach(schedule => {
      const date = schedule.showDate;
      if (!schedulesByDate[date]) {
        schedulesByDate[date] = [];
      }
      schedulesByDate[date].push(schedule);
    });
    
    // Sort schedules within each date by time
    Object.keys(schedulesByDate).forEach(date => {
      schedulesByDate[date].sort((a, b) => (a.showTime || '').localeCompare(b.showTime || ''));
    });
    
    return schedulesByDate;
  }

  getSchedulesByVenue(): { [venueId: string]: ShowSchedule[] } {
    const schedulesByVenue: { [venueId: string]: ShowSchedule[] } = {};
    
    this.schedules.forEach(schedule => {
      const venueId = schedule.venue?.id?.toString() || 'unknown';
      if (!schedulesByVenue[venueId]) {
        schedulesByVenue[venueId] = [];
      }
      schedulesByVenue[venueId].push(schedule);
    });
    
    return schedulesByVenue;
  }

  getUniqueScheduleDates(): string[] {
    const dates = [...new Set(this.schedules.map(s => s.showDate))];
    return dates.sort();
  }

  getSchedulesForDate(date: string): ShowSchedule[] {
    return this.schedules
      .filter(s => s.showDate === date)
      .sort((a, b) => (a.showTime || '').localeCompare(b.showTime || ''));
  }
}