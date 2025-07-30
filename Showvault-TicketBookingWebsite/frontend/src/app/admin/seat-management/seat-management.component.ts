import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { FileBrowserService, FileInfo } from '../../services/file-browser.service';

declare var bootstrap: any;

interface VenueSeatInfo {
  venueId: number;
  venueName: string;
  configuredCapacity: number;
  actualSeatCount: number;
  hasSeats: boolean;
  capacityMatch: boolean;
  seatCategoryBreakdown?: {
    VIP: number;
    PREMIUM: number;
    STANDARD: number;
  };
  totalSchedules: number;
  scheduleUsage: any;
}

interface VenueWithoutSeatsDetail {
  venueId: number;
  venueName: string;
  city: string;
  country: string;
  capacity: number;
  address: string;
  hasSchedules: boolean;
  scheduleCount: number;
}

interface VenueCapacityMismatchDetail {
  venueId: number;
  venueName: string;
  city: string;
  configuredCapacity: number;
  actualSeatCount: number;
  difference: number;
}

interface ScheduleExceedingCapacityDetail {
  scheduleId: number;
  showTitle: string;
  venueName: string;
  venueId: number;
  showDate: string;
  scheduledSeats: number;
  venueSeatCount: number;
  excess: number;
}

interface SeatManagementStats {
  totalVenues: number;
  venuesWithSeats: number;
  venuesWithoutSeats: number;
  totalSeats: number;
  capacityMismatches: number;
  totalSchedules: number;
  schedulesExceedingCapacity: number;
  venuesWithoutSeatsDetails: VenueWithoutSeatsDetail[];
  venuesWithCapacityMismatchesDetails: VenueCapacityMismatchDetail[];
  schedulesExceedingCapacityDetails: ScheduleExceedingCapacityDetail[];
}

interface CreateVenueRequest {
  name: string;
  address: string;
  city: string;
  country: string;
  capacity: number;
  imageUrl?: string;
}

@Component({
  selector: 'app-seat-management',
  templateUrl: './seat-management.component.html',
  styleUrls: ['./seat-management.component.css']
})
export class SeatManagementComponent implements OnInit {
  private apiUrl = `${environment.apiUrl}/seat-management`;
  private venueApiUrl = `${environment.apiUrl}/venues`;
  
  stats: SeatManagementStats | null = null;
  venues: any[] = [];
  selectedVenue: VenueSeatInfo | null = null;
  loading = false;
  error = '';
  success = '';
  
  // Detail view toggles
  showVenuesWithoutSeatsDetails = false;
  showCapacityMismatchDetails = false;
  showScheduleExcessDetails = false;
  
  // Venue creation form
  venueForm: FormGroup;
  showCreateVenueForm = false;
  creatingVenue = false;
  
  // Image browser properties
  venueImagePreview: string | null = null;
  venueImageBrowserModal: any;
  availableImages: any[] = [];
  availableFolders: any[] = [];
  currentFolder = 'assets/images';
  loadingImages = false;
  refreshingImages = false;
  
  venueTypes = [
    { value: 'THEATER', label: 'Theater' },
    { value: 'CINEMA', label: 'Cinema' },
    { value: 'AUDITORIUM', label: 'Auditorium' },
    { value: 'CONCERT_HALL', label: 'Concert Hall' },
    { value: 'STADIUM', label: 'Stadium' },
    { value: 'ARENA', label: 'Arena' }
  ];

  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private fileBrowserService: FileBrowserService
  ) {
    this.venueForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      country: ['', [Validators.required, Validators.minLength(2)]],
      capacity: ['', [Validators.required, Validators.min(1), Validators.max(100000)]],
      imageUrl: ['']
    });
  }

  ngOnInit(): void {
    this.loadStatistics();
    this.loadVenues();
  }

  loadStatistics(): void {
    this.loading = true;
    this.http.get<SeatManagementStats>(`${this.apiUrl}/statistics`).subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load statistics: ' + error.message;
        this.loading = false;
      }
    });
  }

  loadVenues(): void {
    this.http.get<any[]>(`${environment.apiUrl}/venues`).subscribe({
      next: (venues) => {
        this.venues = venues;
      },
      error: (error) => {
        this.error = 'Failed to load venues: ' + error.message;
      }
    });
  }

  loadVenueInfo(venueId: string | number): void {
    if (!venueId) return;
    
    this.loading = true;
    this.error = '';
    
    this.http.get<VenueSeatInfo>(`${this.apiUrl}/venue/${venueId}/info`).subscribe({
      next: (info) => {
        this.selectedVenue = info;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load venue info: ' + error.message;
        this.loading = false;
      }
    });
  }

  generateSeats(venueId: number): void {
    if (!confirm('This will generate seats for the venue. Continue?')) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.http.post<any>(`${this.apiUrl}/venue/${venueId}/generate-seats`, {}).subscribe({
      next: (response) => {
        this.success = response.message;
        this.loadVenueInfo(venueId);
        this.loadStatistics();
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to generate seats: ' + (error.error || error.message);
        this.loading = false;
      }
    });
  }

  validateSeats(venueId: number, requestedSeats: number): void {
    this.http.post<any>(`${this.apiUrl}/venue/${venueId}/validate-seats?requestedSeats=${requestedSeats}`, {}).subscribe({
      next: (response) => {
        if (response.valid) {
          this.success = `Validation successful: ${response.message}`;
        } else {
          this.error = `Validation failed: ${response.message}`;
        }
      },
      error: (error) => {
        this.error = 'Validation error: ' + error.message;
      }
    });
  }

  getScheduleUsageArray(): any[] {
    if (!this.selectedVenue?.scheduleUsage) return [];
    
    return Object.keys(this.selectedVenue.scheduleUsage).map(key => ({
      id: key,
      ...this.selectedVenue!.scheduleUsage[key]
    }));
  }

  clearMessages(): void {
    this.error = '';
    this.success = '';
  }

  // Detail view toggle methods
  toggleVenuesWithoutSeatsDetails(): void {
    this.showVenuesWithoutSeatsDetails = !this.showVenuesWithoutSeatsDetails;
  }

  toggleCapacityMismatchDetails(): void {
    this.showCapacityMismatchDetails = !this.showCapacityMismatchDetails;
  }

  toggleScheduleExcessDetails(): void {
    this.showScheduleExcessDetails = !this.showScheduleExcessDetails;
  }

  // Navigation helper to select a specific venue
  selectVenueFromDetails(venueId: number): void {
    // Find the venue in the dropdown and select it
    const venueSelect = document.getElementById('venueSelect') as HTMLSelectElement;
    if (venueSelect) {
      venueSelect.value = venueId.toString();
      this.loadVenueInfo(venueId);
      
      // Scroll to venue details section
      setTimeout(() => {
        const venueDetailsElement = document.querySelector('.venue-details-section');
        if (venueDetailsElement) {
          venueDetailsElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }

  // Venue creation methods
  toggleCreateVenueForm(): void {
    this.showCreateVenueForm = !this.showCreateVenueForm;
    if (!this.showCreateVenueForm) {
      this.venueForm.reset();
      this.clearVenueImagePreview();
    }
    this.clearMessages();
  }

  createVenue(): void {
    if (this.venueForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.creatingVenue = true;
    this.error = '';
    this.success = '';

    const formValue = this.venueForm.value;
    const venueData: CreateVenueRequest = {
      name: formValue.name,
      address: formValue.address,
      city: formValue.city,
      country: formValue.country,
      capacity: parseInt(formValue.capacity),
      imageUrl: formValue.imageUrl || ''
    };

    console.log('Creating venue with data:', venueData);

    this.http.post<any>(this.venueApiUrl, venueData).subscribe({
      next: (response) => {
        this.success = `Venue "${venueData.name}" created successfully!`;
        this.venueForm.reset();
        this.clearVenueImagePreview();
        this.showCreateVenueForm = false;
        this.loadVenues();
        this.loadStatistics();
        this.creatingVenue = false;
      },
      error: (error) => {
        console.error('Venue creation error:', error);
        this.error = 'Failed to create venue: ' + (error.error?.message || error.error || error.message);
        this.creatingVenue = false;
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.venueForm.controls).forEach(key => {
      const control = this.venueForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.venueForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.venueForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['minlength']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['min']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${field.errors['min'].min}`;
      }
      if (field.errors['max']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at most ${field.errors['max'].max}`;
      }
    }
    return '';
  }

  // Image browser methods
  openVenueImageBrowser(): void {
    this.loadAvailableImages();
    if (!this.venueImageBrowserModal) {
      this.venueImageBrowserModal = new bootstrap.Modal(document.getElementById('venueImageBrowserModal')!);
    }
    this.venueImageBrowserModal.show();
  }

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
        this.error = 'Failed to load images. Please try again.';
        this.loadingImages = false;
      }
    });
  }

  navigateToFolder(folderPath: string): void {
    this.currentFolder = folderPath;
    this.loadAvailableImages();
  }

  getCurrentFolderName(): string {
    const parts = this.currentFolder.split('/');
    return parts[parts.length - 1];
  }

  selectVenueImage(imagePath: string): void {
    this.venueForm.patchValue({ imageUrl: imagePath });
    this.venueImagePreview = imagePath;
    this.venueImageBrowserModal.hide();
  }

  clearVenueImagePreview(): void {
    this.venueImagePreview = null;
    this.venueForm.patchValue({ imageUrl: '' });
  }

  refreshImagesList(): void {
    this.refreshingImages = true;
    this.error = '';
    
    this.fileBrowserService.refreshImagesList().subscribe({
      next: (result) => {
        console.log('Images list refreshed:', result);
        this.success = `Images refreshed! Found ${result.totalScanned} items.`;
        
        // Reload the current folder
        this.loadAvailableImages();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.success = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error refreshing images:', error);
        this.error = 'Failed to refresh images list. Please try again.';
      },
      complete: () => {
        this.refreshingImages = false;
      }
    });
  }
}