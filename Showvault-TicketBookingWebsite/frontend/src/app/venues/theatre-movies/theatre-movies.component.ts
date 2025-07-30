import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VenueService } from '../../services/venue.service';
import { ShowService } from '../../services/show.service';
import { ImageService } from '../../services/image.service';
import { Venue } from '../../models/venue.model';
import { Show, ShowSchedule } from '../../models/show.model';
import { format, parseISO } from 'date-fns';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgClass, NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-theatre-movies',
  templateUrl: './theatre-movies.component.html',
  styleUrls: ['./theatre-movies.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, NgClass, NgIf, NgFor]
})
export class TheatreMoviesComponent implements OnInit {
  venue: Venue | null = null;
  loading = false;
  error = '';
  schedules: ShowSchedule[] = [];
  showsByDate: Map<string, Map<number, Show>> = new Map();
  selectedDate: string | null = null;
  availableDates: string[] = [];
  allShows: Show[] = [];
  viewMode: 'all' | 'byDate' = 'all'; // Default to 'all' view
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private venueService: VenueService,
    private showService: ShowService,
    private imageService: ImageService
  ) { }
  
  /**
   * Get image URL with fallback to appropriate default image
   * @param imageUrl The original image URL
   * @param type The type of content (show, movie, concert, etc.)
   * @param title Optional title for searching specific content images
   * @returns A valid image URL
   */
  getImageUrl(imageUrl: string | null | undefined, type: string, title: string = ''): string {
    return this.imageService.getImageUrl(imageUrl, type, '', title);
  }
  
  /**
   * Enhance show images by trying to get specific movie posters
   * This method directly sets the image properties on the show object
   * @param show The show object
   */
  enhanceShowImage(show: Show): void {
    if (!show) return;
    
    console.log(`Enhancing image for show: ${show.title} (type: ${show.type})`);
    
    // Check if show already has a valid image URL
    const currentImageUrl = show.posterUrl || show.imageUrl || show.image || '';
    console.log(`Current image URL for ${show.title}: ${currentImageUrl}`);
    
    // If no current image, set a default one immediately
    if (!currentImageUrl) {
      const defaultImage = this.getImageUrl(null, show.type || 'Show', show.title);
      console.log(`Setting default image for ${show.title}: ${defaultImage}`);
      show.posterUrl = defaultImage;
      show.imageUrl = defaultImage;
      show.image = defaultImage;
    }
    
    // Always try to get a specific movie poster, regardless of current image state
    this.imageService.getSpecificMovieImage(
      show.title, 
      show.type || 'Show', 
      show.genre || '', 
      currentImageUrl
    ).subscribe({
      next: (imageUrl) => {
        if (!imageUrl) {
          console.warn(`No image URL returned for ${show.title}, keeping current image`);
          return;
        }
        
        console.log(`Setting enhanced image URL for ${show.title} to: ${imageUrl}`);
        
        // Set all image properties for consistency
        // Use direct property assignment to ensure change detection
        show.posterUrl = imageUrl;
        show.imageUrl = imageUrl;
        show.image = imageUrl;
        
        // Force change detection by creating a small change in the array
        // This is a hack but can help with rendering updates
        const index = this.allShows.findIndex(s => s.id === show.id);
        if (index !== -1) {
          // Create a new reference to trigger change detection
          this.allShows[index] = {...show};
        }
      },
      error: (error) => {
        console.error(`Error enhancing image for ${show.title}:`, error);
        // If there's an error and no current image, make sure we at least have a fallback image
        if (!currentImageUrl) {
          const fallbackImage = this.getImageUrl(null, show.type || 'Show', show.title);
          console.log(`Using fallback image for ${show.title}: ${fallbackImage}`);
          show.posterUrl = fallbackImage;
          show.imageUrl = fallbackImage;
          show.image = fallbackImage;
        }
      }
    });
  }

  ngOnInit(): void {
    this.loading = true;
    const venueId = Number(this.route.snapshot.paramMap.get('id'));
    
    console.log('Theatre Movies Component initialized with venue ID:', venueId);
    
    if (isNaN(venueId)) {
      this.error = 'Invalid venue ID';
      this.loading = false;
      return;
    }

    // Set default view mode
    this.viewMode = 'all';
    
    // Set a timeout to prevent infinite loading
    setTimeout(() => {
      if (this.loading) {
        console.warn('Loading timeout reached, resetting loading state');
        this.loading = false;
        if (!this.error) {
          this.error = 'Loading took too long. Please try refreshing the page.';
        }
      }
    }, 15000); // 15 seconds timeout
    
    this.loadVenueDetails(venueId);
  }

  loadVenueDetails(venueId: number): void {
    this.venueService.getVenueById(venueId).subscribe({
      next: (venue) => {
        this.venue = venue;
        this.loadSchedulesForVenue(venueId);
      },
      error: (error) => {
        console.error('Error loading venue details:', error);
        this.error = 'Failed to load venue details. Please try again later.';
        this.loading = false;
      }
    });
  }
  
  /**
   * Force enhancement of all show images
   * This can be called to refresh images if they're not loading properly
   */
  forceEnhanceAllImages(): void {
    console.log('Force enhancing all show images');
    
    // Enhance images for all shows
    this.allShows.forEach(show => {
      this.enhanceShowImage(show);
    });
    
    // Also enhance images for shows in date view
    if (this.selectedDate) {
      const showsForDate = this.getShowsForDate(this.selectedDate);
      showsForDate.forEach(show => {
        this.enhanceShowImage(show);
      });
    }
  }

  loadSchedulesForVenue(venueId: number): void {
    console.log('Loading schedules for venue ID:', venueId);
    this.venueService.getSchedulesByVenueId(venueId).subscribe({
      next: (schedules) => {
        console.log('Received schedules from backend:', schedules);
        
        // Validate and sanitize schedule data
        if (Array.isArray(schedules)) {
          // Filter out any invalid schedules
          this.schedules = schedules.filter(schedule => {
            // Check if schedule has required properties
            if (!schedule || !schedule.showId || !schedule.showDate) {
              console.warn('Invalid schedule found, filtering out:', schedule);
              return false;
            }
            
            // Ensure availableSeats is a number
            if (schedule.availableSeats !== undefined && typeof schedule.availableSeats !== 'number') {
              console.warn(`Converting availableSeats from ${typeof schedule.availableSeats} to number:`, schedule.availableSeats);
              schedule.availableSeats = parseInt(schedule.availableSeats as any, 10) || 0;
            }
            
            // Ensure totalSeats is a number
            if (schedule.totalSeats !== undefined && typeof schedule.totalSeats !== 'number') {
              console.warn(`Converting totalSeats from ${typeof schedule.totalSeats} to number:`, schedule.totalSeats);
              schedule.totalSeats = parseInt(schedule.totalSeats as any, 10) || 0;
            }
            
            return true;
          });
          
          console.log('Sanitized schedules:', this.schedules);
          console.log('Extracting shows from schedules...');
          this.extractAllShows();
          console.log('Processing schedules...');
          this.processSchedules();
          
          // Force enhance all images after a short delay to ensure DOM is updated
          setTimeout(() => {
            this.forceEnhanceAllImages();
          }, 500);
          
          this.loading = false;
        } else {
          console.error('Received invalid schedules data (not an array):', schedules);
          this.error = 'Invalid schedule data received. Please try again later.';
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error loading schedules for venue:', error);
        this.error = 'Failed to load movie schedules. Please try again later.';
        this.loading = false;
      }
    });
  }

  processSchedules(): void {
    // Group schedules by date and show
    const showsByDate = new Map<string, Map<number, Show>>();
    const uniqueDates = new Set<string>();
    
    this.schedules.forEach(schedule => {
      if (schedule.showDate) {
        // Add date to unique dates
        uniqueDates.add(schedule.showDate);
        
        // Group shows by date
        if (!showsByDate.has(schedule.showDate)) {
          showsByDate.set(schedule.showDate, new Map<number, Show>());
        }
        
        // Add show to the date group if it doesn't exist
        const showsForDate = showsByDate.get(schedule.showDate)!;
        const showId = schedule.showId;
        
        if (showId && !showsForDate.has(showId)) {
          // Find the show in allShows by ID
          const show = this.allShows.find(s => s.id === showId);
          if (show) {
            // Make sure the show has enhanced images
            if (!show.posterUrl && !show.imageUrl && !show.image) {
              console.log(`Enhancing image for show in date view: ${show.title}`);
              this.enhanceShowImage(show);
            }
            showsForDate.set(showId, show);
          }
        }
      }
    });
    
    this.showsByDate = showsByDate;
    this.availableDates = Array.from(uniqueDates).sort();
    
    // Select the first date by default
    if (this.availableDates.length > 0) {
      this.selectedDate = this.availableDates[0];
    }
  }

  // Extract all unique shows from schedules
  extractAllShows(): void {
    // First, fetch all shows referenced in schedules
    const uniqueShowIds = new Set<number>();
    
    console.log('Extracting show IDs from schedules:', this.schedules);
    
    this.schedules.forEach(schedule => {
      console.log('Processing schedule:', schedule);
      if (schedule.showId) {
        console.log('Adding show ID to unique set:', schedule.showId);
        uniqueShowIds.add(schedule.showId);
      } else {
        console.warn('Schedule missing showId:', schedule);
      }
    });
    
    console.log('Unique show IDs found:', Array.from(uniqueShowIds));
    
    // Clear existing shows to prevent duplicates
    this.allShows = [];
    
    // For each unique show ID, fetch the show details
    const showPromises: Promise<void>[] = [];
    
    uniqueShowIds.forEach(showId => {
      console.log('Fetching details for show ID:', showId);
      const promise = new Promise<void>((resolve) => {
        this.showService.getShowById(showId).subscribe({
          next: (show) => {
            console.log('Received show details:', show);
            
            // Set default image URLs if none exist
            if (!show.posterUrl && !show.imageUrl && !show.image) {
              const defaultImage = this.getImageUrl(null, show.type, show.title);
              console.log(`Setting default image for ${show.title}: ${defaultImage}`);
              show.posterUrl = defaultImage;
              show.imageUrl = defaultImage;
              show.image = defaultImage;
            }
            
            // Add show to the array first so it appears with at least a default image
            this.allShows.push(show);
            
            // Then enhance the image asynchronously
            this.enhanceShowImage(show);
            
            resolve();
          },
          error: (error) => {
            console.error(`Error fetching show ${showId}:`, error);
            resolve();
          }
        });
      });
      
      showPromises.push(promise);
    });
    
    // When all shows are fetched, process the schedules
    Promise.all(showPromises).then(() => {
      console.log('All shows fetched:', this.allShows);
    });
  }

  // Get all schedules for a specific show
  getSchedulesForShow(showId: number): ShowSchedule[] {
    return this.schedules.filter(s => s.showId === showId);
  }

  // Get the next available date for a show
  getNextAvailableDateForShow(showId: number): string | null {
    const showSchedules = this.getSchedulesForShow(showId);
    if (showSchedules.length === 0) return null;
    
    // Sort schedules by date
    showSchedules.sort((a, b) => {
      if (!a.showDate || !b.showDate) return 0;
      return a.showDate.localeCompare(b.showDate);
    });
    
    return showSchedules[0].showDate || null;
  }

  selectDate(date: string): void {
    this.selectedDate = date;
  }

  setViewMode(mode: 'all' | 'byDate'): void {
    this.viewMode = mode;
    
    // Force enhance images when switching view modes
    setTimeout(() => {
      this.forceEnhanceAllImages();
    }, 100);
  }

  getShowsForDate(date: string): Show[] {
    if (!date) {
      console.warn('Attempted to get shows for a null or undefined date');
      return [];
    }
    
    try {
      const showsMap = this.showsByDate.get(date);
      if (!showsMap) {
        console.warn(`No shows found for date: ${date}`);
        return [];
      }
      
      const shows = Array.from(showsMap.values());
      console.log(`Found ${shows.length} shows for date ${date}`);
      return shows;
    } catch (error) {
      console.error(`Error getting shows for date ${date}:`, error);
      return [];
    }
  }

  getSchedulesForShowAndDate(showId: number, date: string): ShowSchedule[] {
    if (!this.schedules || !Array.isArray(this.schedules)) {
      console.warn('Schedules is not an array when filtering for show and date');
      return [];
    }
    
    try {
      return this.schedules.filter(s => {
        // Ensure we have valid schedule objects
        if (!s || typeof s !== 'object') {
          return false;
        }
        
        // Check if showId and showDate match
        return s.showId === showId && s.showDate === date;
      });
    } catch (error) {
      console.error('Error filtering schedules for show and date:', error);
      return [];
    }
  }

  formatDate(dateString: string): string {
    try {
      const date = parseISO(dateString);
      return format(date, 'EEEE, MMMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  }

  formatShortDate(dateString: string): string {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM d');
    } catch (error) {
      return dateString;
    }
  }

  selectShow(showId: number): void {
    this.router.navigate(['/shows', showId]);
  }

  bookShow(showId: number, scheduleId: number): void {
    this.router.navigate(['/booking/seat-selection'], { 
      queryParams: { 
        showId: showId,
        scheduleId: scheduleId
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/venues']);
  }
  
  /**
   * Refresh the current page
   * This can be used when the page is stuck loading or encounters an error
   */
  refreshPage(): void {
    console.log('Refreshing page...');
    this.loading = true;
    this.error = '';
    
    // Get the current venue ID
    const venueId = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(venueId)) {
      this.error = 'Invalid venue ID';
      this.loading = false;
      return;
    }
    
    // Clear existing data
    this.schedules = [];
    this.allShows = [];
    this.showsByDate = new Map();
    this.availableDates = [];
    this.selectedDate = null;
    
    // Reload venue details
    this.loadVenueDetails(venueId);
  }
}