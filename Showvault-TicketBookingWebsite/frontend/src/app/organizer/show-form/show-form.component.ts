import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Show, ShowStatus } from '../../models/show.model';
import { VenueService } from '../../services/venue.service';
import { ShowService } from '../../services/show.service';
import { BookingService } from '../../services/booking.service';
import { FileBrowserService, FileInfo } from '../../services/file-browser.service';
import { Venue as VenueModel, VenueCapacityInfo } from '../../models/venue.model';
import { Venue as ScheduleVenue, ShowSchedule } from '../../models/show-interfaces.model';
declare var bootstrap: any;

interface ImageFile {
  name: string;
  path: string;
  size: string;
  type: string;
}

interface FolderInfo {
  name: string;
  path: string;
}

@Component({
  selector: 'app-show-form',
  templateUrl: './show-form.component.html',
  styleUrls: ['./show-form.component.css']
})
export class ShowFormComponent implements OnInit {
  show: Show | null = null;
  showId: number | null = null;
  isEditMode = false;
  isViewMode = false;

  showForm: FormGroup;
  showTypes = ['Movie', 'Theatrical', 'Concert', 'Event', 'Other'];
  showStatuses = Object.values(ShowStatus);
  venues: VenueModel[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  error = ''; // For form-level error messages
  
  // Flag to enable or disable multiple time slots
  enableMultipleTimeSlots = false;
  
  // Update mode for edit operations: 'details-only' or 'all'
  updateMode: string = 'all';

  // Image browser properties
  imagePreview: string | null = null;
  selectedImage: string | null = null;
  currentFolder = 'assets/images';
  loadingImages = false;
  refreshingImages = false;
  availableImages: ImageFile[] = [];
  availableFolders: FolderInfo[] = [];
  imageBrowserModal: any;


  constructor(
    private fb: FormBuilder,
    private venueService: VenueService,
    private showService: ShowService,
    private bookingService: BookingService,
    private fileBrowserService: FileBrowserService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.showForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      type: ['', Validators.required],
      posterUrl: ['', [this.imageUrlValidator]],
      trailerUrl: [''],
      description: ['', [Validators.required, Validators.minLength(20)]],
      duration: [120, [Validators.required, Validators.min(1)]],
      genre: [''],
      language: [''],
      status: [ShowStatus.UPCOMING],
      // Schedule fields
      venue: ['', Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required],
      price: [10, [Validators.required, Validators.min(0)]],
      totalSeats: [100, [Validators.required, Validators.min(1)]],
      // Time slots array for multiple time slots
      timeSlots: this.fb.array([])
    });
    
    // Add venue change listener to update seat validation
    this.showForm.get('venue')?.valueChanges.subscribe(venueId => {
      this.updateSeatValidation(venueId);
    });
  }

  ngOnInit(): void {
    this.loadVenues();
    
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.showId = +id;
        
        // Check if we're in edit mode or view mode
        const url = this.router.url;
        if (url.includes('/edit/')) {
          this.isEditMode = true;
        } else if (!url.includes('/create')) {
          this.isViewMode = true;
        }
        
        this.loadShow(this.showId);
      }
    });
  }
  
  loadShow(id: number): void {
    this.isLoading = true;
    this.showService.getShowById(id).subscribe({
      next: (show) => {
        console.log('Loaded show data:', show);
        console.log('Show createdBy:', show.createdBy);
        this.show = show;
        this.populateForm();
        
        // If in view mode, disable all form controls
        if (this.isViewMode) {
          this.showForm.disable();
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = `Failed to load show: ${error.message}`;
        this.isLoading = false;
      }
    });
  }

  loadVenues(): void {
    this.isLoading = true;
    this.venueService.getAllVenues().subscribe({
      next: (venues) => {
        this.venues = venues;
        console.log('Loaded venues:', venues.map(v => ({ id: v.id, name: v.name, capacity: v.capacity })));
        this.isLoading = false;
        
        // Update validation for any already selected venue
        const selectedVenueId = this.showForm.get('venue')?.value;
        if (selectedVenueId) {
          this.updateSeatValidation(selectedVenueId);
        }
      },
      error: (error) => {
        console.error('Error loading venues:', error);
        this.errorMessage = 'Failed to load venues. Please try again.';
        this.isLoading = false;
      }
    });
  }

  populateForm(): void {
    if (!this.show) return;
    
    this.showForm.patchValue({
      title: this.show.title,
      type: this.show.type,
      posterUrl: this.show.posterUrl || this.show.image,
      trailerUrl: this.show.trailerUrl,
      description: this.show.description || '',
      duration: this.show.duration || 120,
      genre: this.show.genre || '',
      language: this.show.language || '',
      status: this.show.status || ShowStatus.UPCOMING
    });

    // First try to get schedule data from the schedules array
    if (this.show.schedules && this.show.schedules.length > 0) {
      const firstSchedule = this.show.schedules[0];
      console.log('Populating form from schedule:', firstSchedule);
      
      this.showForm.patchValue({
        venue: firstSchedule.venue?.id || '',
        date: firstSchedule.showDate,
        time: firstSchedule.showTime,
        price: firstSchedule.basePrice,
        totalSeats: firstSchedule.totalSeats
      });
    } 
    // Fallback to direct properties for backward compatibility
    else {
      console.log('Populating form from direct properties');
      
      this.showForm.patchValue({
        venue: this.show.venue || '',
        date: this.show.date || '',
        time: this.show.time || '',
        price: this.show.price || 10,
        totalSeats: this.show.totalSeats || 100
      });
    }
  }

  onSubmit(): void {
    if (this.showForm.valid) {
      // Validate time slots if multiple time slots are enabled and we're updating schedules
      if (this.updateMode !== 'details-only' && this.enableMultipleTimeSlots && this.timeSlots.length > 1) {
        const timeSlotErrors = this.validateTimeSlots();
        if (timeSlotErrors.length > 0) {
          // Show the first error
          this.error = `Time slot conflict: ${timeSlotErrors[0].message}`;
          
          // Scroll to the error message
          setTimeout(() => {
            const errorElement = document.querySelector('.alert-danger');
            if (errorElement) {
              errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
          
          return;
        }
      }
      
      this.isLoading = true;
      this.error = '';
      const formValue = this.showForm.getRawValue(); // Use getRawValue to include disabled fields
      
      // Find the full venue object from the venues array
      const selectedVenue = this.venues.find(v => v.id === formValue.venue);
      
      // Create a venue object that satisfies the ScheduleVenue interface requirements
      const venueForSchedule: ScheduleVenue = selectedVenue ? {
        id: selectedVenue.id,
        name: selectedVenue.name || '',
        city: selectedVenue.city || '',
        country: selectedVenue.country || '',
        capacity: selectedVenue.capacity || 0,
        address: selectedVenue.address || '', // Required by ScheduleVenue
        state: selectedVenue.state || '',
        amenities: selectedVenue.amenities || []
      } : {
        id: formValue.venue,
        name: '',
        city: '',
        country: '',
        capacity: 0,
        address: '', // Required by ScheduleVenue
        state: '',
        amenities: []
      };
      
      // Create schedules array based on whether multiple time slots are enabled
      let schedules: any[] = [];
      
      if (this.enableMultipleTimeSlots && this.timeSlots.length > 0) {
        // Create a schedule for each time slot
        schedules = this.timeSlots.controls.map((timeSlotControl) => {
          const timeSlot = timeSlotControl.value;
          return {
            venue: venueForSchedule,
            venueId: parseInt(formValue.venue), 
            showDate: formValue.date,
            showTime: timeSlot.showTime,
            basePrice: formValue.price,
            totalSeats: formValue.totalSeats,
            availableSeats: this.show?.availableSeats || formValue.totalSeats,
            showId: this.show?.id || 0,
            status: 'SCHEDULED'
          };
        });
      } else {
        // Create a single schedule with the default time
        const schedule: any = {
          venue: venueForSchedule,
          venueId: parseInt(formValue.venue),
          showDate: formValue.date,
          showTime: formValue.time,
          basePrice: formValue.price,
          totalSeats: formValue.totalSeats,
          availableSeats: this.show?.availableSeats || formValue.totalSeats,
          showId: this.show?.id || 0,
          status: 'SCHEDULED'
        };
        schedules = [schedule];
      }
      
      // Create the show data with the schedules
      const showData: any = {
        title: formValue.title,
        type: formValue.type,
        posterUrl: formValue.posterUrl,
        trailerUrl: formValue.trailerUrl,
        description: formValue.description,
        duration: formValue.duration,
        genre: formValue.genre,
        language: formValue.language,
        status: formValue.status,
        // Include both direct fields for backward compatibility
        venue: parseInt(formValue.venue),
        date: formValue.date,
        time: formValue.time,
        price: formValue.price,
        totalSeats: formValue.totalSeats,
        availableSeats: this.show?.availableSeats || formValue.totalSeats,
        // Add all schedules
        schedules: schedules
      };

      // Only include id and createdBy for edit mode
      if (this.isEditMode && this.show) {
        showData.id = this.show.id;
        showData.createdBy = this.show.createdBy;
      }
      
      let request$: Observable<Show>;
      
      // Determine which API to call based on mode
      if (this.isEditMode && this.showId) {
        if (this.updateMode === 'details-only') {
          // Extract only show details for details-only update
          const showDetails = {
            id: this.show?.id,
            title: formValue.title,
            type: formValue.type,
            posterUrl: formValue.posterUrl,
            trailerUrl: formValue.trailerUrl,
            description: formValue.description,
            duration: formValue.duration,
            genre: formValue.genre,
            language: formValue.language,
            status: formValue.status,
            createdBy: this.show?.createdBy
          };
          
          console.log('Updating only show details:', showDetails);
          request$ = this.showService.updateShowDetailsOnly(this.showId, showDetails);
        } else {
          // Full update including schedules
          console.log('Submitting full show data with ' + schedules.length + ' schedules:', showData);
          request$ = this.showService.updateShow(this.showId, showData);
        }
      } else {
        // Create new show
        console.log('Creating new show with ' + schedules.length + ' schedules:', showData);
        request$ = this.showService.createShow(showData);
      }

      request$.subscribe({
        next: (response: Show) => {
          let successMsg = '';
          
          if (this.isEditMode) {
            if (this.updateMode === 'details-only') {
              successMsg = `Show "${response.title}" details have been updated successfully.`;
            } else {
              const scheduleCount = schedules.length;
              successMsg = `Show "${response.title}" has been updated successfully with ${scheduleCount} time slot${scheduleCount > 1 ? 's' : ''}.`;
            }
          } else {
            const scheduleCount = schedules.length;
            successMsg = `Show "${response.title}" has been created successfully with ${scheduleCount} time slot${scheduleCount > 1 ? 's' : ''}.`;
          }
          
          this.successMessage = successMsg;
          
          // Clear seat map cache if this is an edit operation and capacity might have changed
          if (this.isEditMode && response.schedules && response.schedules.length > 0 && response.id) {
            console.log('Clearing seat map cache due to show update...');
            response.schedules.forEach((schedule: any) => {
              if (schedule.id && response.id) {
                this.bookingService.clearSeatMapCache(response.id, schedule.id).subscribe({
                  next: (cacheResponse) => {
                    console.log(`Cache cleared for schedule ${schedule.id}:`, cacheResponse);
                  },
                  error: (cacheError) => {
                    console.warn(`Failed to clear cache for schedule ${schedule.id}:`, cacheError);
                    // Don't show error to user as this is not critical
                  }
                });
              }
            });
          }
          
          this.isLoading = false;
          
          setTimeout(() => {
            // Navigate to schedule management if user wants to add more venues
            if (confirm('Show created successfully! Would you like to add more venues/schedules now?')) {
              this.router.navigate(['/organizer/shows', response.id, 'schedules']);
            } else {
              this.router.navigate(['/organizer/dashboard']);
            }
          }, 1500);
        },
        error: (error: Error) => {
          this.errorMessage = `Failed to ${this.isEditMode ? 'update' : 'create'} show: ${error.message}`;
          this.isLoading = false;
        }
      });
    } else {
      Object.keys(this.showForm.controls).forEach(key => {
        const control = this.showForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/organizer/dashboard']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.showForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  getErrorMessage(fieldName: string): string {
    const control = this.showForm.get(fieldName);
    if (!control) return '';

    if (control.hasError('required')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (control.hasError('minlength')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${control.errors?.['minlength'].requiredLength} characters`;
    }
    if (control.hasError('min')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be greater than ${control.errors?.['min'].min}`;
    }
    if (control.hasError('max')) {
      const maxValue = control.errors?.['max'].max;
      if (maxValue === 0) {
        return `Please select a venue with available seats or the system will generate seats automatically`;
      }
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} cannot exceed venue capacity of ${maxValue}`;
    }
    return '';
  }
  
  /**
   * Toggle multiple time slots mode
   */
  toggleMultipleTimeSlots(): void {
    this.enableMultipleTimeSlots = !this.enableMultipleTimeSlots;
    
    if (this.enableMultipleTimeSlots) {
      // Add at least one time slot
      if (this.timeSlots.length === 0) {
        this.addTimeSlot();
      }
      this.showForm.get('time')?.clearValidators();
      this.showForm.get('time')?.updateValueAndValidity();
    } else {
      // Restore required validator to 'time' field
      this.showForm.get('time')?.setValidators(Validators.required);
      this.showForm.get('time')?.updateValueAndValidity();
    }
    
    // Validate time slots
    this.validateAllTimeSlots();
  }
  
  /**
   * Set the update mode for edit operations
   * @param mode 'details-only' to update only show details, 'all' to update everything
   */
  setUpdateMode(mode: string): void {
    this.updateMode = mode;
    
    // If updating details only, disable schedule fields
    if (mode === 'details-only') {
      // Disable schedule-related fields
      this.showForm.get('venue')?.disable();
      this.showForm.get('date')?.disable();
      this.showForm.get('time')?.disable();
      this.showForm.get('price')?.disable();
      this.showForm.get('totalSeats')?.disable();
      
      // Disable multiple time slots and clear them
      this.enableMultipleTimeSlots = false;
      this.timeSlots.clear();
    } else {
      // Re-enable schedule-related fields
      this.showForm.get('venue')?.enable();
      this.showForm.get('date')?.enable();
      this.showForm.get('time')?.enable();
      this.showForm.get('price')?.enable();
      this.showForm.get('totalSeats')?.enable();
    }
  }
  
  /**
   * Validate time slots to ensure they don't conflict with each other
   * Ensures each time slot is at least (show duration + 30 minutes buffer) after the previous one
   * @returns Array of validation errors, empty if no errors
   */
  validateTimeSlots(): {slot: number, message: string}[] {
    const errors: {slot: number, message: string}[] = [];
    
    if (!this.enableMultipleTimeSlots || this.timeSlots.length <= 1) {
      return errors;
    }
    
    // Get the show duration from the form
    const duration = this.showForm.get('duration')?.value;
    if (!duration) {
      errors.push({slot: 0, message: 'Show duration is required to validate time slots'});
      return errors;
    }
    
    // Buffer time in minutes
    const bufferTime = 30;
    // Minimum time between shows in minutes
    const minTimeBetweenShows = parseInt(duration) + bufferTime;
    
    // Get all time values and sort them
    const timeValues: {index: number, time: string}[] = [];
    
    this.timeSlots.controls.forEach((control, index) => {
      const timeValue = control.get('showTime')?.value;
      if (timeValue) {
        timeValues.push({index, time: timeValue});
      }
    });
    
    // Sort time values chronologically
    timeValues.sort((a, b) => {
      return a.time.localeCompare(b.time);
    });
    
    // Check for conflicts
    for (let i = 1; i < timeValues.length; i++) {
      const prevTime = timeValues[i-1].time;
      const currTime = timeValues[i].time;
      
      // Convert times to minutes since midnight for easy comparison
      const prevMinutes = this.timeToMinutes(prevTime);
      const currMinutes = this.timeToMinutes(currTime);
      
      // Calculate difference in minutes
      const timeDiff = currMinutes - prevMinutes;
      
      // If time difference is less than minimum required, add error
      if (timeDiff < minTimeBetweenShows) {
        errors.push({
          slot: timeValues[i].index,
          message: `This time slot is too close to a previous show. There must be at least ${minTimeBetweenShows} minutes (show duration + 30 min buffer) between shows.`
        });
      }
    }
    
    return errors;
  }
  
  /**
   * Convert time string (HH:MM or HH:MM:SS) to minutes since midnight
   */
  timeToMinutes(timeStr: string): number {
    // Handle both HH:MM and HH:MM:SS formats
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return hours * 60 + minutes;
  }
  
  /**
   * Get the time slots form array
   */
  get timeSlots(): FormArray {
    return this.showForm.get('timeSlots') as FormArray;
  }
  
  /**
   * Add a new time slot to the form array
   */
  addTimeSlot(): void {
    // Use the current 'time' value as the default for the first time slot if available
    const defaultTime = this.timeSlots.length === 0 ? this.showForm.get('time')?.value : '';
    
    // If there are existing time slots, suggest a time that doesn't conflict
    let suggestedTime = defaultTime;
    if (this.timeSlots.length > 0 && this.showForm.get('duration')?.value) {
      // Get the latest time slot
      const timeValues: string[] = [];
      this.timeSlots.controls.forEach(control => {
        const timeValue = control.get('showTime')?.value;
        if (timeValue) {
          timeValues.push(timeValue);
        }
      });
      
      if (timeValues.length > 0) {
        // Sort and get the latest time
        timeValues.sort();
        const latestTime = timeValues[timeValues.length - 1];
        
        // Calculate a suggested time (show duration + 30 min buffer after the latest time)
        const duration = parseInt(this.showForm.get('duration')?.value);
        const bufferTime = 30;
        const minTimeBetweenShows = duration + bufferTime;
        
        const latestMinutes = this.timeToMinutes(latestTime);
        const suggestedMinutes = latestMinutes + minTimeBetweenShows;
        
        // Convert back to HH:MM format
        const hours = Math.floor(suggestedMinutes / 60);
        const minutes = suggestedMinutes % 60;
        suggestedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
    
    const timeSlotGroup = this.fb.group({
      showTime: [suggestedTime, Validators.required]
    });
    this.timeSlots.push(timeSlotGroup);
    
    // If this is the first time slot being added, make sure multiple time slots mode is enabled
    if (this.timeSlots.length === 1) {
      this.enableMultipleTimeSlots = true;
    }
  }
  
  /**
   * Remove a time slot from the form array
   */
  removeTimeSlot(index: number): void {
    if (this.timeSlots.length > 1) {
      this.timeSlots.removeAt(index);
      // Validate remaining time slots
      this.validateAllTimeSlots();
    }
  }
  
  /**
   * Cache for time slot validation errors
   * Key: time slot index, Value: validation error message
   */
  timeSlotErrors: Map<number, string> = new Map();
  
  /**
   * Validate all time slots and cache the results
   */
  validateAllTimeSlots(): void {
    // Clear previous errors
    this.timeSlotErrors.clear();
    
    // Get validation errors
    const errors = this.validateTimeSlots();
    
    // Cache errors by slot index
    errors.forEach(error => {
      this.timeSlotErrors.set(error.slot, error.message);
    });
  }
  
  /**
   * Check if a specific time slot has a conflict
   */
  hasTimeSlotConflict(index: number): boolean {
    // First check if we have validation enabled for time slots
    if (!this.enableMultipleTimeSlots || this.timeSlots.length <= 1) {
      return false;
    }
    
    // Also check if the time value actually exists - to avoid unnecessary errors
    const timeValue = this.timeSlots.at(index).get('showTime')?.value;
    if (!timeValue) {
      return false;
    }
    
    return this.timeSlotErrors.has(index);
  }
  
  /**
   * Get the text describing the minimum gap required between shows
   */
  getMinimumGapText(): string {
    const duration = this.showForm.get('duration')?.value;
    if (!duration) return '30 minutes';
    
    const minGap = parseInt(duration) + 30;
    return `${minGap} minutes (${duration} min show + 30 min buffer)`;
  }
  
  /**
   * Suggest a non-conflicting time for a time slot
   */
  suggestNonConflictingTime(index: number): void {
    if (!this.showForm.get('duration')?.value) return;
    
    // Get all time values
    const timeValues: {index: number, time: string}[] = [];
    this.timeSlots.controls.forEach((control, i) => {
      const timeValue = control.get('showTime')?.value;
      if (timeValue && i !== index) {
        timeValues.push({index: i, time: timeValue});
      }
    });
    
    // Sort time values chronologically
    timeValues.sort((a, b) => a.time.localeCompare(b.time));
    
    // Duration and buffer
    const duration = parseInt(this.showForm.get('duration')?.value);
    const bufferTime = 30;
    const minTimeBetweenShows = duration + bufferTime;
    
    // Find a suitable gap
    let suggestedTime = '09:00'; // Default starting time
    
    if (timeValues.length > 0) {
      // Find the largest gap between existing times
      let largestGap = 0;
      let gapStartTime = '';
      
      // Check gap between start of day and first time
      const firstTimeMinutes = this.timeToMinutes(timeValues[0].time);
      if (firstTimeMinutes >= minTimeBetweenShows) {
        largestGap = firstTimeMinutes;
        gapStartTime = '00:00';
      }
      
      // Check gaps between consecutive times
      for (let i = 0; i < timeValues.length - 1; i++) {
        const currentTimeMinutes = this.timeToMinutes(timeValues[i].time);
        const nextTimeMinutes = this.timeToMinutes(timeValues[i + 1].time);
        const gap = nextTimeMinutes - currentTimeMinutes;
        
        if (gap > largestGap && gap >= minTimeBetweenShows * 2) {
          largestGap = gap;
          gapStartTime = timeValues[i].time;
        }
      }
      
      // Check gap between last time and end of day
      const lastTimeMinutes = this.timeToMinutes(timeValues[timeValues.length - 1].time);
      const endOfDayGap = 24 * 60 - lastTimeMinutes;
      if (endOfDayGap > largestGap && endOfDayGap >= minTimeBetweenShows) {
        largestGap = endOfDayGap;
        gapStartTime = timeValues[timeValues.length - 1].time;
      }
      
      // If we found a suitable gap, suggest a time in the middle of it
      if (largestGap >= minTimeBetweenShows * 2) {
        const gapStartMinutes = this.timeToMinutes(gapStartTime);
        const suggestedMinutes = gapStartMinutes + minTimeBetweenShows + Math.floor((largestGap - minTimeBetweenShows * 2) / 2);
        
        // Convert back to HH:MM format
        const hours = Math.floor(suggestedMinutes / 60) % 24;
        const minutes = suggestedMinutes % 60;
        suggestedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      } else {
        // If no suitable gap found, suggest a time after the last time
        const lastTimeMinutes = this.timeToMinutes(timeValues[timeValues.length - 1].time);
        const suggestedMinutes = lastTimeMinutes + minTimeBetweenShows;
        
        // Convert back to HH:MM format
        const hours = Math.floor(suggestedMinutes / 60) % 24;
        const minutes = suggestedMinutes % 60;
        suggestedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
    
    // Update the time slot
    this.timeSlots.at(index).get('showTime')?.setValue(suggestedTime);
    
    // Revalidate all time slots
    this.validateAllTimeSlots();
  }
  
  /**
   * Clear all time slots
   */
  clearTimeSlots(): void {
    while (this.timeSlots.length !== 0) {
      this.timeSlots.removeAt(0);
    }
  }

  /**
   * Get the capacity of the currently selected venue
   */
  getSelectedVenueCapacity(): number {
    const selectedVenueId = this.showForm.get('venue')?.value;
    if (!selectedVenueId) return 0;
    
    const selectedVenue = this.venues.find(v => v.id === selectedVenueId);
    return selectedVenue ? selectedVenue.capacity : 0;
  }

  /**
   * Update seat validation when venue changes
   */
  private updateSeatValidation(venueId: number): void {
    const totalSeatsControl = this.showForm.get('totalSeats');
    if (!totalSeatsControl || !venueId || this.venues.length === 0) return;

    const selectedVenue = this.venues.find(v => v.id === venueId);
    if (selectedVenue) {
      console.log('Updating seat validation for venue:', selectedVenue.name, 'capacity:', selectedVenue.capacity);
      
      // Only apply max capacity validation if venue has a positive capacity
      // If capacity is 0, the backend will generate seats automatically
      if (selectedVenue.capacity > 0) {
        console.log('Applying max capacity validation:', selectedVenue.capacity);
        totalSeatsControl.setValidators([
          Validators.required,
          Validators.min(1),
          Validators.max(selectedVenue.capacity)
        ]);
        
        // If current value exceeds capacity, adjust it
        if (totalSeatsControl.value > selectedVenue.capacity) {
          totalSeatsControl.setValue(selectedVenue.capacity);
        }
      } else {
        console.log('Venue has 0 capacity, applying basic validation only');
        // For venues with 0 capacity, only apply basic validation
        // The backend will handle seat generation and validation
        totalSeatsControl.setValidators([
          Validators.required,
          Validators.min(1)
          // No max validator - let backend handle seat generation
        ]);
      }
      
      totalSeatsControl.updateValueAndValidity();
      console.log('Validation updated, current errors:', totalSeatsControl.errors);
    }
  }

  /**
   * Custom validator for image URLs
   * Validates that the URL points to a supported image format
   */
  imageUrlValidator(control: any) {
    if (!control.value) {
      return null; // Allow empty values (optional field)
    }

    const url = control.value.toLowerCase();
    
    // Allow assets paths (relative paths starting with assets/)
    if (url.startsWith('assets/')) {
      return null; // Valid assets path
    }
    
    // Check if it's a valid URL format
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(url)) {
      return { invalidUrl: { message: 'Please enter a valid URL starting with http:// or https:// or use assets/images/filename.jpg for local images' } };
    }

    // Supported image formats
    const supportedFormats = [
      '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.avif'
    ];

    // Check if URL ends with a supported image format
    const hasValidExtension = supportedFormats.some(format => 
      url.includes(format) || url.includes(format.replace('.', '%2E'))
    );

    // Also check for common image hosting patterns (even without explicit extensions)
    const imageHostingPatterns = [
      'images.unsplash.com',
      'imgur.com',
      'cloudinary.com',
      'amazonaws.com',
      'googleusercontent.com',
      'wikimedia.org',
      'tmdb.org',
      'media-amazon.com'
    ];

    const isFromImageHost = imageHostingPatterns.some(pattern => url.includes(pattern));

    if (!hasValidExtension && !isFromImageHost) {
      return { 
        invalidImageFormat: { 
          message: 'Please provide a URL to an image file (jpg, jpeg, png, webp, gif, svg, bmp, avif) or from a supported image hosting service' 
        } 
      };
    }

    return null; // Valid
  }

  /**
   * Get supported image formats for display
   */
  getSupportedImageFormats(): string {
    return 'JPG, JPEG, PNG, WebP, GIF, SVG, BMP, AVIF';
  }

  /**
   * Helper method to get available local images
   */
  getAvailableLocalImages(): string[] {
    return [
      'assets/images/hariharaveeramallu.jpg',
      'assets/images/placeholder-movie.jpg',
      'assets/images/placeholder-venue.jpg'
    ];
  }

  /**
   * Use a local image (helper for organizers)
   */
  useLocalImage(imageName: string): void {
    const imagePath = `assets/images/${imageName}`;
    this.showForm.patchValue({ posterUrl: imagePath });
    this.updateImagePreview(imagePath);
  }

  /**
   * Open the image browser modal
   */
  openImageBrowser(): void {
    this.loadAvailableImages();
    if (!this.imageBrowserModal) {
      this.imageBrowserModal = new bootstrap.Modal(document.getElementById('imageBrowserModal')!);
    }
    this.imageBrowserModal.show();
  }



  /**
   * Load available images from assets folder
   */
  loadAvailableImages(): void {
    this.loadingImages = true;
    
    this.fileBrowserService.browseDirectory(this.currentFolder).subscribe({
      next: (files: FileInfo[]) => {
        // Separate files and folders
        this.availableImages = files
          .filter(file => file.type === 'file' && file.mimeType?.startsWith('image/'))
          .map(file => ({
            name: file.name,
            path: file.path,
            size: file.size,
            type: file.mimeType || 'image/jpeg'
          }));

        this.availableFolders = files
          .filter(file => file.type === 'folder')
          .map(folder => ({
            name: folder.name,
            path: folder.path
          }));

        this.loadingImages = false;
      },
      error: (error) => {
        console.error('Error loading images:', error);
        this.errorMessage = 'Failed to load images. Please try again.';
        this.loadingImages = false;
      }
    });
  }

  /**
   * Navigate to a folder
   */
  navigateToFolder(folderPath: string): void {
    this.currentFolder = folderPath;
    this.loadAvailableImages();
  }

  /**
   * Get current folder name
   */
  getCurrentFolderName(): string {
    return this.currentFolder.split('/').pop() || '';
  }

  /**
   * Select an image
   */
  selectImage(imagePath: string): void {
    this.selectedImage = imagePath;
  }

  /**
   * Use the selected image
   */
  useSelectedImage(): void {
    if (this.selectedImage) {
      this.showForm.patchValue({ posterUrl: this.selectedImage });
      this.updateImagePreview(this.selectedImage);
      this.selectedImage = null;
    }
  }

  /**
   * Update image preview
   */
  updateImagePreview(imagePath: string): void {
    this.imagePreview = imagePath;
  }

  /**
   * Clear image preview
   */
  clearImagePreview(): void {
    this.imagePreview = null;
    this.showForm.patchValue({ posterUrl: '' });
  }

  /**
   * Refresh images list by regenerating the JSON file
   */
  refreshImagesList(): void {
    this.refreshingImages = true;
    this.errorMessage = '';
    
    // Call the refresh service method
    this.fileBrowserService.refreshImagesList().subscribe({
      next: (result) => {
        console.log('Images list refreshed:', result);
        this.successMessage = `Images refreshed! Found ${result.totalScanned} items.`;
        
        // Reload the current folder
        this.loadAvailableImages();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error refreshing images:', error);
        this.errorMessage = 'Failed to refresh images list. Please try again.';
      },
      complete: () => {
        this.refreshingImages = false;
      }
    });
  }

}