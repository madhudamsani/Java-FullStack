import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ShowService } from '../../services/show.service';
import { LocationService, GeoLocation } from '../../services/location.service';
import { ImageService } from '../../services/image.service';
import { Show, ShowSchedule, Venue } from '../../models/show.model';
import { format, parseISO } from 'date-fns';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';

interface VenueWithDistance extends Venue {
  distance?: number;
  averageRating?: number;
  realTimeAvailability?: {
    [key: string]: number; // scheduleId -> available seats
  };
  latitude?: number;
  longitude?: number;
}

interface FilterOptions {
  location?: string;
  distance?: number;
  showTime?: 'morning' | 'afternoon' | 'evening';
  priceRange?: { min: number; max: number };
  amenities?: string[];
}

interface ShowTimeCategory {
  morning: string[];
  afternoon: string[];
  evening: string[];
}

@Component({
  selector: 'app-theater-selection',
  templateUrl: './theater-selection.component.html',
  styleUrls: ['./theater-selection.component.css']
})
export class TheaterSelectionComponent implements OnInit, OnDestroy {
  show: Show | null = null;
  loading = false;
  error = '';
  venues: VenueWithDistance[] = [];
  schedulesByVenue: Map<number, ShowSchedule[]> = new Map();
  selectedVenue: VenueWithDistance | null = null;
  selectedDate: string | null = null;
  selectedSchedule: ShowSchedule | null = null;
  availableDates: string[] = [];
  
  filterOptions: FilterOptions = {
    priceRange: { min: 0, max: 1000 }
  };
  sortBy: 'distance' | 'price' | 'rating' = 'distance';
  userLocation: GeoLocation | null = null;
  
  availableAmenities: string[] = [
    'Parking',
    'Food Court',
    'IMAX',
    'Dolby Atmos',
    '4DX'
  ];

  readonly showTimeCategories: ShowTimeCategory = {
    morning: ['09:00', '10:00', '11:00', '12:00'],
    afternoon: ['13:00', '14:00', '15:00', '16:00', '17:00'],
    evening: ['18:00', '19:00', '20:00', '21:00', '22:00']
  };

  private locationSearch$ = new Subject<string>();
  private subscriptions: Subscription[] = [];
  private seatAvailabilityInterval: any;
  private fetchingSchedules = new Set<number>();
  
  // UI state properties
  descriptionExpanded = false;

  // Helper methods for tracking schedule fetching
  private isScheduleBeingFetched(scheduleId: number): boolean {
    return this.fetchingSchedules.has(scheduleId);
  }

  private markScheduleAsFetching(scheduleId: number): void {
    this.fetchingSchedules.add(scheduleId);
  }

  private unmarkScheduleAsFetching(scheduleId: number): void {
    this.fetchingSchedules.delete(scheduleId);
  }

  /**
   * Get image URL with fallback to appropriate default image
   * Public wrapper for imageService.getImageUrl
   * @param imageUrl The original image URL
   * @param type The type of content (show, movie, concert, etc.)
   * @param subType Optional subtype for more specific images (action, rock, ballet, etc.)
   * @param title Optional title for searching specific content images
   * @returns A valid image URL
   */
  getImageUrl(imageUrl: string | undefined | null, type: string = 'show', subType: string = '', title: string = ''): string {
    return this.imageService.getImageUrl(imageUrl, type, subType, title);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private showService: ShowService,
    private locationService: LocationService,
    private imageService: ImageService
  ) {
    // Set up location search with debounce
    const locationSub = this.locationSearch$
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(query => this.searchLocation(query));
    
    this.subscriptions.push(locationSub);
  }

  ngOnInit(): void {
    this.loading = true;
    const showId = Number(this.route.snapshot.paramMap.get('id'));
    
    console.log('Theater Selection Component initialized with show ID:', showId);
    
    if (isNaN(showId)) {
      this.error = 'Invalid show ID';
      this.loading = false;
      return;
    }

    // Ensure we're not using any cached data
    localStorage.removeItem('cached_seat_availability');
    
    this.loadShowDetails(showId);
    this.setupSeatAvailabilityPolling();
    
    // Always select the first available date once data is loaded
    setTimeout(() => {
      if (this.availableDates.length > 0) {
        console.log('Automatically selecting first available date:', this.availableDates[0]);
        this.selectDate(this.availableDates[0]);
      }
    }, 500);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.seatAvailabilityInterval) {
      clearInterval(this.seatAvailabilityInterval);
    }
    // Clear fetching schedules tracking
    this.fetchingSchedules.clear();
  }

  private setupSeatAvailabilityPolling(): void {
    // Poll for seat availability every 5 seconds for real-time updates
    this.seatAvailabilityInterval = setInterval(() => {
      if (this.selectedDate && this.venues.length > 0) {
        this.updateSeatAvailability();
      }
    }, 5000); // 5 seconds for better real-time updates
  }

  private updateSeatAvailability(): void {
    console.log('Silently updating seat availability for all venues and schedules...');
    
    this.venues.forEach(venue => {
      const schedules = this.schedulesByVenue.get(venue.id!);
      if (schedules) {
        schedules.forEach(schedule => {
          if (schedule.showDate === this.selectedDate) {
            // Store schedule data in localStorage for the seat map endpoint to use
            try {
              localStorage.setItem(`schedule_${schedule.id}`, JSON.stringify({
                showId: schedule.showId,
                basePrice: schedule.basePrice
              }));
            } catch (e) {
              console.error('Error storing schedule data in localStorage:', e);
            }
            
            // Make real API call to get the latest availability from MySQL
            // This is a background update - we preserve existing data during the call
            this.showService.getScheduleAvailability(schedule.id!).subscribe({
              next: (availability) => {
                console.log(`Raw API response for schedule ${schedule.id}:`, availability, typeof availability);
                console.log(`Full availability object:`, JSON.stringify(availability, null, 2));
                
                // Convert to number if it's not already
                let seatCount = 0;
                if (typeof availability === 'number') {
                  seatCount = availability;
                } else if (typeof availability === 'string') {
                  seatCount = parseInt(availability, 10);
                } else if (availability && typeof availability === 'object') {
                  // Check various possible properties
                  seatCount = availability.count || 
                             availability.availableSeats || 
                             availability.available || 
                             availability.seats || 
                             availability.value || 0;
                  console.log(`Extracted from object - count: ${availability.count}, availableSeats: ${availability.availableSeats}, available: ${availability.available}, seats: ${availability.seats}, value: ${availability.value}`);
                }
                
                console.log(`Processed seat count for schedule ${schedule.id}: ${seatCount}`);
                
                // Ensure venue has a realTimeAvailability object
                if (!venue.realTimeAvailability) {
                  venue.realTimeAvailability = {};
                }
                
                // Update the real-time availability with actual value from API
                venue.realTimeAvailability[schedule.id!] = seatCount;
                
                // Update seat availability properties (background update)
                if ('seatsAvailable' in schedule) {
                  schedule.seatsAvailable = seatCount;
                }
                schedule.availableSeats = seatCount;
                
                console.log(`Background update - venue ${venue.name}, schedule ${schedule.id}: ${seatCount} seats available from MySQL`);
              },
              error: (error) => {
                console.error(`Error in background update for venue ${venue.name}, schedule ${schedule.id}:`, error);
                // Don't update on error - preserve existing data
                // Only log the error, don't change the displayed values
              }
            });
          }
        });
      }
    });
  }

  onLocationSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.locationSearch$.next(query);
  }

  private searchLocation(query: string): void {
    if (!query.trim()) return;

    this.locationService.geocodeAddress(query).subscribe({
      next: (location) => {
        this.userLocation = location;
        this.updateVenueDistances();
        this.applyFiltersAndSort();
      },
      error: (error) => {
        console.error('Error searching location:', error);
        this.error = 'Could not find the specified location';
      }
    });
  }

  getUserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Get address from coordinates
          this.locationService.reverseGeocode(location.lat, location.lng).subscribe({
            next: (geoLocation) => {
              this.userLocation = geoLocation;
              this.filterOptions.location = geoLocation.address;
              this.updateVenueDistances();
              this.applyFiltersAndSort();
            },
            error: (error) => {
              console.error('Error reverse geocoding:', error);
              this.error = 'Could not determine your address';
            }
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          this.error = 'Could not get your location. Please enter it manually.';
        }
      );
    } else {
      this.error = 'Geolocation is not supported by your browser';
    }
  }

  private updateVenueDistances(): void {
    if (!this.userLocation) return;

    this.venues = this.venues.map(venue => ({
      ...venue,
      distance: this.calculateDistance(
        this.userLocation!.lat,
        this.userLocation!.lng,
        venue.latitude!,
        venue.longitude!
      )
    }));
  }

  loadShowDetails(showId: number): void {
    this.showService.getShowById(showId).subscribe({
      next: (show) => {
        this.show = show;
        
        // Enhance show image using ImageService
        this.enhanceShowImage();
        
        if (show.schedules && show.schedules.length > 0) {
          const uniqueVenues = new Map<number, VenueWithDistance>();
          show.schedules.forEach(schedule => {
            if (schedule.venue) {
              if (!schedule.venue.imageUrl) {
                schedule.venue.imageUrl = 'assets/images/placeholder-venue.jpg';
              }
              uniqueVenues.set(schedule.venue.id!, schedule.venue);
            }
          });
          this.venues = Array.from(uniqueVenues.values());

          const schedules = show.schedules;
          
          // Log initial schedule data for debugging
          console.log('Initial schedules data:', schedules.map(s => ({
            id: s.id,
            availableSeats: s.availableSeats,
            seatsAvailable: (s as any).seatsAvailable,
            showTime: s.showTime,
            showDate: s.showDate
          })));
          
          // Ensure all schedules have the necessary data
          schedules.forEach(schedule => {
            if ((schedule.availableSeats === undefined || schedule.availableSeats === null)) {
              console.warn(`Schedule ${schedule.id} missing seat availability information, requesting from API`);
              // Try to get real-time availability from the API
              this.showService.getScheduleAvailability(schedule.id!).subscribe({
                next: (availability) => {
                  console.log(`Raw API response for schedule ${schedule.id}:`, availability, typeof availability);
                  console.log(`Full availability object:`, JSON.stringify(availability, null, 2));
                  
                  // Convert to number if it's not already
                  let seatCount = 0;
                  if (typeof availability === 'number') {
                    seatCount = availability;
                  } else if (typeof availability === 'string') {
                    seatCount = parseInt(availability, 10);
                  } else if (availability && typeof availability === 'object') {
                    // Check various possible properties
                    seatCount = availability.count || 
                               availability.availableSeats || 
                               availability.available || 
                               availability.seats || 
                               availability.value || 0;
                    console.log(`Extracted from object - count: ${availability.count}, availableSeats: ${availability.availableSeats}, available: ${availability.available}, seats: ${availability.seats}, value: ${availability.value}`);
                  }
                  
                  console.log(`Processed seat count for schedule ${schedule.id}: ${seatCount}`);
                  
                  if ('seatsAvailable' in schedule) {
                    schedule.seatsAvailable = seatCount;
                  }
                  schedule.availableSeats = seatCount;
                  console.log(`Updated schedule ${schedule.id} with seat availability: ${seatCount}`);
                },
                error: (error) => {
                  console.error(`Failed to get availability for schedule ${schedule.id}:`, error);
                  // Set to 0 to avoid infinite loading
                  schedule.availableSeats = 0;
                }
              });
            } else {
              console.log(`Schedule ${schedule.id} already has seat availability: ${schedule.availableSeats}`);
            }
          });
          
          setTimeout(() => this.processSchedules(schedules), 0);
        } else {
          this.error = 'No schedules available for this show';
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading show details:', error);
        this.error = 'Failed to load show details. Please try again later.';
        this.loading = false;
      }
    });
  }

  /**
   * Enhance show images by trying to get specific movie posters
   */
  enhanceShowImage(): void {
    if (this.show) {
      console.log(`Enhancing image for show: ${this.show.title} (type: ${this.show.type})`);
      
      // Always try to get a specific movie poster, regardless of current image state
      this.imageService.getSpecificMovieImage(
        this.show.title, 
        this.show.type || 'Show', 
        this.show.genre || '', 
        this.show.posterUrl || this.show.imageUrl || this.show.image || this.show.poster_url || ''
      ).subscribe(imageUrl => {
        if (this.show) {
          console.log(`Setting image URL for ${this.show.title} to: ${imageUrl}`);
          // Set all image properties for consistency
          this.show.imageUrl = imageUrl;
          this.show.image = imageUrl;
          this.show.posterUrl = imageUrl;
          this.show.poster_url = imageUrl;
        }
      });
    }
  }

  processSchedules(schedules: ShowSchedule[]): void {
    this.schedulesByVenue = new Map();
    const uniqueDates = new Set<string>();
    
    const chunkSize = 100;
    const processChunk = (startIndex: number) => {
      const endIndex = Math.min(startIndex + chunkSize, schedules.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        const schedule = schedules[i];
        if (schedule.venue) {
          uniqueDates.add(schedule.showDate);
          
          if (!this.schedulesByVenue.has(schedule.venue.id!)) {
            this.schedulesByVenue.set(schedule.venue.id!, []);
          }
          this.schedulesByVenue.get(schedule.venue.id!)!.push(schedule);
          
          // Store schedule data in localStorage for the seat map endpoint to use
          try {
            localStorage.setItem(`schedule_${schedule.id}`, JSON.stringify({
              showId: schedule.showId,
              basePrice: schedule.basePrice
            }));
            console.log(`Stored schedule ${schedule.id} data in localStorage`);
          } catch (e) {
            console.error('Error storing schedule data in localStorage:', e);
          }
        }
      }
      
      if (endIndex < schedules.length) {
        setTimeout(() => processChunk(endIndex), 0);
      } else {
        this.availableDates = Array.from(uniqueDates).sort();
        this.applyFiltersAndSort();
      }
    };
    
    processChunk(0);
  }

  applyFiltersAndSort(): void {
    let filteredVenues = [...this.venues];

    // Apply location-based filters
    if (this.filterOptions.distance && this.userLocation) {
      filteredVenues = filteredVenues.filter(venue => 
        venue.distance && venue.distance <= this.filterOptions.distance!
      );
    }

    // Apply amenity filters
    if (this.filterOptions.amenities?.length) {
      filteredVenues = filteredVenues.filter(venue =>
        this.filterOptions.amenities!.every(amenity => 
          venue.amenities?.includes(amenity)
        )
      );
    }

    // Apply price range filter
    if (this.filterOptions.priceRange && 
        (this.filterOptions.priceRange.min > 0 || this.filterOptions.priceRange.max < 1000)) {
      filteredVenues = filteredVenues.filter(venue => {
        const schedules = this.schedulesByVenue.get(venue.id!);
        if (!schedules?.length) return false;
        
        // Check if any schedule's price falls within the range
        return schedules.some(schedule => 
          schedule.basePrice >= this.filterOptions.priceRange!.min &&
          schedule.basePrice <= this.filterOptions.priceRange!.max
        );
      });
    }

    // Apply show time filter
    if (this.filterOptions.showTime && this.selectedDate) {
      filteredVenues = filteredVenues.filter(venue => {
        const schedules = this.getSchedulesForVenueAndDate(venue.id!, this.selectedDate!);
        return schedules.some(schedule => 
          this.getShowTimeCategory(schedule.showTime!) === this.filterOptions.showTime
        );
      });
    }

    // Apply sorting
    switch (this.sortBy) {
      case 'distance':
        if (this.userLocation) {
          filteredVenues.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }
        break;
      
      case 'price':
        filteredVenues.sort((a, b) => {
          const aSchedules = this.schedulesByVenue.get(a.id!) || [];
          const bSchedules = this.schedulesByVenue.get(b.id!) || [];
          const aMinPrice = Math.min(...aSchedules.map(s => s.basePrice));
          const bMinPrice = Math.min(...bSchedules.map(s => s.basePrice));
          return aMinPrice - bMinPrice;
        });
        break;
      
      case 'rating':
        filteredVenues.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
    }

    this.venues = filteredVenues;
  }

  getFilteredSchedules(venue: VenueWithDistance): ShowSchedule[] {
    if (!this.selectedDate) return [];
    
    let schedules = this.getSchedulesForVenueAndDate(venue.id!, this.selectedDate);
    
    if (this.filterOptions.showTime) {
      schedules = schedules.filter(schedule => 
        this.getShowTimeCategory(schedule.showTime!) === this.filterOptions.showTime
      );
    }
    
    if (this.filterOptions.priceRange) {
      schedules = schedules.filter(schedule =>
        schedule.basePrice >= this.filterOptions.priceRange!.min &&
        schedule.basePrice <= this.filterOptions.priceRange!.max
      );
    }
    
    return schedules;
  }

  hasAvailableSchedules(venue: VenueWithDistance): boolean {
    return this.getFilteredSchedules(venue).some(schedule => 
      this.getScheduleAvailableSeats(schedule) > 0
    );
  }

  getScheduleAvailableSeats(schedule: ShowSchedule | null): number {
    if (!schedule) return 0;
    
    const venueId = schedule.venue?.id;
    if (!venueId) return 0;
    
    const venue = this.venues.find(v => v.id === venueId);
    
    // Always prioritize real-time availability data from the API (from background updates)
    if (venue?.realTimeAvailability && venue.realTimeAvailability[schedule.id!] !== undefined) {
      return venue.realTimeAvailability[schedule.id!];
    }
    
    // Return existing seat data if available
    if (schedule.availableSeats !== undefined && schedule.availableSeats !== null) {
      return schedule.availableSeats;
    }
    
    // If no data available and not currently fetching, trigger a fetch
    if (!this.isScheduleBeingFetched(schedule.id!)) {
      this.markScheduleAsFetching(schedule.id!);
      
      // Store schedule data in localStorage for the seat map endpoint to use
      try {
        localStorage.setItem(`schedule_${schedule.id}`, JSON.stringify({
          showId: schedule.showId,
          basePrice: schedule.basePrice
        }));
      } catch (e) {
        console.error('Error storing schedule data in localStorage:', e);
      }
      
      this.showService.getScheduleAvailability(schedule.id!).subscribe({
        next: (availability) => {
          console.log(`Raw API response for schedule ${schedule.id}:`, availability, typeof availability);
          console.log(`Full availability object:`, JSON.stringify(availability, null, 2));
          
          // Convert to number if it's not already
          let seatCount = 0;
          if (typeof availability === 'number') {
            seatCount = availability;
          } else if (typeof availability === 'string') {
            seatCount = parseInt(availability, 10);
          } else if (availability && typeof availability === 'object') {
            // Check various possible properties
            seatCount = availability.count || 
                       availability.availableSeats || 
                       availability.available || 
                       availability.seats || 
                       availability.value || 0;
            console.log(`Extracted from object - count: ${availability.count}, availableSeats: ${availability.availableSeats}, available: ${availability.available}, seats: ${availability.seats}, value: ${availability.value}`);
          }
          
          console.log(`Processed seat count for schedule ${schedule.id}: ${seatCount}`);
          
          // Update both the schedule and venue real-time availability
          schedule.availableSeats = seatCount;
          
          // Only update venue if it exists
          if (venue) {
            // Ensure venue has a realTimeAvailability object
            if (!venue.realTimeAvailability) {
              venue.realTimeAvailability = {};
            }
            
            // Store the real-time availability
            venue.realTimeAvailability[schedule.id!] = seatCount;
            
            console.log(`Loaded availability for schedule ${schedule.id}: ${seatCount} seats`);
          }
          
          this.unmarkScheduleAsFetching(schedule.id!);
        },
        error: (error) => {
          console.error(`Failed to get availability for schedule ${schedule.id}:`, error);
          // Set to 0 instead of undefined to avoid UI issues
          schedule.availableSeats = 0;
          if (venue) {
            if (!venue.realTimeAvailability) {
              venue.realTimeAvailability = {};
            }
            venue.realTimeAvailability[schedule.id!] = 0;
          }
          
          this.unmarkScheduleAsFetching(schedule.id!);
        }
      });
    }
    
    // Return -1 to show loading state while fetching
    return -1;
  }

  resetFilters(): void {
    this.filterOptions = {
      priceRange: { min: 0, max: 1000 }
    };
    this.sortBy = 'distance';
    this.applyFiltersAndSort();
  }

  toggleAmenity(amenity: string): void {
    if (!this.filterOptions.amenities) {
      this.filterOptions.amenities = [];
    }

    const index = this.filterOptions.amenities.indexOf(amenity);
    if (index === -1) {
      this.filterOptions.amenities.push(amenity);
    } else {
      this.filterOptions.amenities.splice(index, 1);
    }

    this.applyFiltersAndSort();
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  getShowTimeCategory(time: string): 'morning' | 'afternoon' | 'evening' {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  selectVenue(venue: VenueWithDistance): void {
    console.log('Selecting venue:', venue.name);
    this.selectedVenue = venue;
    this.selectedSchedule = null;
  }

  selectDate(date: string): void {
    console.log('Selecting date:', date);
    this.selectedDate = date;
    this.selectedSchedule = null;
  }

  selectSchedule(schedule: ShowSchedule): void {
    this.selectedSchedule = schedule;
  }

  getSchedulesForSelectedVenueAndDate(): ShowSchedule[] {
    if (!this.selectedVenue || !this.selectedDate) {
      return [];
    }
    
    const venueSchedules = this.schedulesByVenue.get(this.selectedVenue.id!) || [];
    return venueSchedules.filter(s => s.showDate === this.selectedDate);
  }
  
  getSchedulesForVenueAndDate(venueId: number, date: string): ShowSchedule[] {
    if (!venueId || !date) {
      return [];
    }
    const venueSchedules = this.schedulesByVenue.get(venueId) || [];
    return venueSchedules.filter(s => s.showDate === date);
  }

  getAvailableSeats(): number {
    if (!this.selectedSchedule) return 0;
    
    // Only return actual available seats, no mock values
    return this.selectedSchedule.availableSeats || 0;
  }
  
  hasTheatersForSelectedDate(): boolean {
    if (!this.selectedDate || !this.venues || this.venues.length === 0) {
      return false;
    }
    
    for (const venue of this.venues) {
      const schedules = this.getSchedulesForVenueAndDate(venue.id!, this.selectedDate);
      if (schedules && schedules.length > 0) {
        return true;
      }
    }
    
    return false;
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

  canBook(): boolean {
    if (!this.selectedSchedule) return false;
    
    // Check if seats are available
    const availableSeats = this.getScheduleAvailableSeats(this.selectedSchedule);
    return availableSeats > 0;
  }
  
  proceedToSeatSelection(): void {
    if (!this.selectedSchedule || !this.show || !this.canBook()) {
      return;
    }
    
    // Navigate to seat selection with all necessary information
    this.router.navigate(['/booking/seat-selection'], { 
      queryParams: { 
        showId: this.show.id,
        scheduleId: this.selectedSchedule.id,
        venueId: this.selectedSchedule.venue?.id || this.selectedVenue?.id,
        showDate: this.selectedSchedule.showDate,
        showTime: this.selectedSchedule.showTime
      }
    });
  }

  goBack(): void {
    if (this.show) {
      this.router.navigate(['/shows', this.show.id]);
    } else {
      this.router.navigate(['/shows']);
    }
  }

  // New methods for enhanced show details UI
  getTotalShows(): number {
    let total = 0;
    this.schedulesByVenue.forEach(schedules => {
      total += schedules.length;
    });
    return total;
  }


}