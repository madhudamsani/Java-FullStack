import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ShowService } from '../../services/show.service';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { ImageService } from '../../services/image.service';
import { SeatReservationService } from '../../services/seat-reservation.service';
import { Show, SeatStatus, SeatCategory, ShowStatus } from '../../models/show.model';
import { SEAT_STATUS_METADATA, SEAT_CATEGORY_METADATA } from '../../models/seat-metadata';
import { ShowSchedule, ShowSeat, Venue } from '../../models/show-interfaces.model';
import { 
  BookingSeat, 
  BookingSummary, 
  SeatInfo, 
  SeatSelectionMap,
  SeatRow
} from '../../models/booking.model';
import { finalize } from 'rxjs/operators';
import { interval, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-seat-selection',
  templateUrl: './seat-selection.component.html',
  styleUrls: ['./seat-selection.component.css']
})
export class SeatSelectionComponent implements OnInit, OnDestroy {
  show: Show | null = null;
  schedule: ShowSchedule | null = null;
  seatMap: SeatSelectionMap | null = null;
  selectedSeats: SeatInfo[] = [];
  maxSeats = 10;
  loading = false;
  error : string | null='';
  bookingSummary: BookingSummary | null = null;
  processingBooking = false;
  
  // Make enums and metadata available to the template
  readonly SeatStatus = SeatStatus;
  readonly SEAT_STATUS_METADATA = SEAT_STATUS_METADATA;
  readonly SeatCategory = SeatCategory;
  readonly SEAT_CATEGORY_METADATA = SEAT_CATEGORY_METADATA;

  private destroy$ = new Subject<void>();
  private seatUpdateSubscription?: Subscription;
  private readonly SEAT_UPDATE_INTERVAL = 10000; // 10 seconds

  // Keep track of seat hold time
  seatHoldTimers: Map<number, any> = new Map();
  readonly HOLD_TIMEOUT = 300000; // 5 minutes in milliseconds

  // Add minimum and maximum seat selection limits
  readonly MIN_SEATS = 1;
  readonly MAX_SEATS = 10;
  
  // We'll use actual prices from the backend instead of hardcoded values
  seatPrices: { [key: string]: number } = {};

  seats: ShowSeat[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private showService: ShowService,
    private bookingService: BookingService,
    private authService: AuthService,
    private imageService: ImageService,
    private dialog: MatDialog,
    private seatReservationService: SeatReservationService
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
   * @param show The show object
   */
  enhanceShowImage(show: Show): void {
    console.log(`Enhancing image for show: ${show.title} (type: ${show.type})`);
    
    // Always try to get a specific movie poster, regardless of current image state
    this.imageService.getSpecificMovieImage(
      show.title, 
      show.type || 'Show', 
      show.genre || '', 
      show.posterUrl || show.imageUrl || show.image || ''
    ).subscribe(imageUrl => {
      console.log(`Setting image URL for ${show.title} to: ${imageUrl}`);
      // Set all image properties for consistency
      show.imageUrl = imageUrl;
      show.image = imageUrl;
      show.posterUrl = imageUrl;
    });
  }

  ngOnInit(): void {
    this.loading = true;
    
    // Get query parameters
    const showId = Number(this.route.snapshot.queryParamMap.get('showId'));
    const scheduleId = Number(this.route.snapshot.queryParamMap.get('scheduleId'));
    const venueId = Number(this.route.snapshot.queryParamMap.get('venueId') || '0');
    const showDate = this.route.snapshot.queryParamMap.get('showDate');
    const showTime = this.route.snapshot.queryParamMap.get('showTime');
    const quantity = Number(this.route.snapshot.queryParamMap.get('quantity') || '1');
    
    console.log('Seat Selection Component initialized with showId:', showId, 
                'scheduleId:', scheduleId, 
                'venueId:', venueId,
                'showDate:', showDate,
                'showTime:', showTime,
                'quantity:', quantity);
    
    if (isNaN(showId) || isNaN(scheduleId)) {
      console.error('Invalid show or schedule ID');
      this.error = 'Invalid show or schedule ID. Please go back and try again.';
      this.loading = false;
      return;
    }
    
    // Load show details
    this.showService.getShowById(showId).subscribe({
      next: (show) => {
        console.log('Show details loaded:', show);
        this.show = show;
        
        // Enhance show image
        this.enhanceShowImage(show);
        
        // If show has schedules, find the selected one
        if (show.schedules && show.schedules.length > 0) {
          this.schedule = show.schedules.find(s => s.id === scheduleId) || null;
          console.log('Found schedule:', this.schedule);
        } else {
          console.log('No schedules found in show data, creating default schedule');
          // Create a default schedule if none exists
          // Create a default venue object
          const defaultVenue: Venue = {
            name: typeof show.venue === 'string' ? show.venue : 'Default Venue',
            address: '',
            city: '',
            state: '',
            country: '',
            capacity: show.totalSeats || 100,
            amenities: []
          };
          
          this.schedule = {
            id: scheduleId,
            showId: showId,
            showDate: show.date || new Date().toISOString().split('T')[0],
            showTime: show.time || '19:00',
            basePrice: show.price || 250,
            status: 'SCHEDULED',
            venue: defaultVenue,
            seatsAvailable: show.availableSeats || 100,
            availableSeats: show.availableSeats || 100,
            totalSeats: show.totalSeats || 100
          };
        }
        
        // Load seat map
        this.loadSeatMap(scheduleId);
      },
      error: (error) => {
        console.error('Error loading show:', error);
        this.error = 'Failed to load show details. Please try again.';
        this.loading = false;
      }
    });

    // Set up periodic seat map updates
    this.setupSeatUpdates();
  }

  ngOnDestroy(): void {
    // Clear all seat hold timers
    this.seatHoldTimers.forEach((timer) => clearTimeout(timer));
    
    // Release any server-side seat reservations
    const sessionId = this.seatReservationService.getCurrentSessionId();
    if (sessionId) {
      this.seatReservationService.releaseReservations(sessionId).subscribe({
        next: () => console.log('Released seat reservations on component destroy'),
        error: (error) => console.error('Error releasing seat reservations on destroy:', error)
      });
    }
    
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSeatUpdates(): void {
    // Increase frequency of updates to ensure real-time seat availability
    const REAL_TIME_UPDATE_INTERVAL = 2000; // 2 seconds for more real-time updates
    
    this.seatUpdateSubscription = interval(REAL_TIME_UPDATE_INTERVAL)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.schedule && this.schedule.id) {
          console.log(`Refreshing seat map for schedule ${this.schedule.id} (real-time update)`);
          
          // Only update the seat statuses, not the entire map
          this.bookingService.getAvailableSeats(this.schedule.id).subscribe({
            next: (updatedSeatMap) => {
              if (!updatedSeatMap || !updatedSeatMap.rows || !this.seatMap) return;
              
              // Update venue capacity information if available
              if (updatedSeatMap.metadata && updatedSeatMap.metadata['venueCapacity']) {
                if (this.seatMap.metadata) {
                  this.seatMap.metadata['venueCapacity'] = updatedSeatMap.metadata['venueCapacity'];
                  console.log(`Updated venue capacity: ${updatedSeatMap.metadata['venueCapacity']}`);
                }
              }
              
              // Update only the seat statuses in the existing map
              updatedSeatMap.rows.forEach((updatedRow: SeatRow, rowIndex: number) => {
                if (!this.seatMap?.rows[rowIndex]) return;
                
                updatedRow.seats.forEach((updatedSeat: SeatInfo, seatIndex: number) => {
                  if (!this.seatMap?.rows[rowIndex].seats[seatIndex]) return;
                  
                  // Only update the status if the seat is not currently selected by the user
                  const isCurrentlySelected = this.selectedSeats.some(
                    selected => selected.id === this.seatMap?.rows[rowIndex].seats[seatIndex].id
                  );
                  
                  if (!isCurrentlySelected) {
                    // Check if status has changed
                    const oldStatus = this.seatMap.rows[rowIndex].seats[seatIndex].status;
                    const newStatus = updatedSeat.status as SeatStatus;
                    
                    if (oldStatus !== newStatus) {
                      console.log(`Seat ${this.seatMap.rows[rowIndex].rowLabel}${this.seatMap.rows[rowIndex].seats[seatIndex].seatNumber} status changed from ${oldStatus} to ${newStatus}`);
                      
                      // Add animation class for status change
                      const seatElement = document.querySelector(`.seat[data-row="${this.seatMap.rows[rowIndex].rowLabel}"][data-seat="${this.seatMap.rows[rowIndex].seats[seatIndex].seatNumber}"]`);
                      if (seatElement) {
                        seatElement.classList.add('status-changed');
                        setTimeout(() => {
                          seatElement.classList.remove('status-changed');
                        }, 1000);
                      }
                      
                      // Update the status
                      this.seatMap.rows[rowIndex].seats[seatIndex].status = newStatus;
                      
                      // Also update the flat seats array
                      const flatSeatIndex = this.seats.findIndex(s => 
                        s.id === this.seatMap?.rows[rowIndex].seats[seatIndex].id
                      );
                      
                      if (flatSeatIndex !== -1) {
                        this.seats[flatSeatIndex].status = newStatus;
                      }
                    }
                    
                    // Update price if it has changed
                    if (updatedSeat.price !== this.seatMap.rows[rowIndex].seats[seatIndex].price) {
                      console.log(`Seat ${this.seatMap.rows[rowIndex].rowLabel}${this.seatMap.rows[rowIndex].seats[seatIndex].seatNumber} price updated from ${this.seatMap.rows[rowIndex].seats[seatIndex].price} to ${updatedSeat.price}`);
                      this.seatMap.rows[rowIndex].seats[seatIndex].price = updatedSeat.price;
                      
                      // Update in flat seats array too
                      const flatSeatIndex = this.seats.findIndex(s => 
                        s.id === this.seatMap?.rows[rowIndex].seats[seatIndex].id
                      );
                      
                      if (flatSeatIndex !== -1) {
                        this.seats[flatSeatIndex].price = updatedSeat.price;
                      }
                    }
                  }
                });
              });
              
              console.log('Seat map updated with real-time data');
            },
            error: (error) => {
              console.error('Error updating seat map in real-time:', error);
            }
          });
        }
      });
  }
  
  /**
   * Get the theater layout class based on the venue configuration
   */
  getTheaterLayoutClass(): string {
    if (!this.seatMap || !this.seatMap.metadata) return '';
    
    const theaterLayout = this.seatMap.metadata['theaterLayout'] as string;
    if (theaterLayout === 'CURVED') {
      return 'theater-curved';
    } else if (theaterLayout === 'ANGLED') {
      return 'theater-angled';
    } else {
      return 'theater-straight';
    }
  }
  
  /**
   * Get the screen width percentage based on the venue configuration
   */
  getScreenWidth(): number {
    if (!this.seatMap || !this.seatMap.metadata) return 80;
    
    const screenWidth = this.seatMap.metadata['screenWidth'] as number;
    return screenWidth || 80;
  }
  
  /**
   * Get the row spacing based on the venue configuration
   */
  getRowSpacing(): number {
    if (!this.seatMap || !this.seatMap.metadata) return 12;
    
    const rowSpacing = this.seatMap.metadata['rowSpacing'] as number;
    return rowSpacing || 12;
  }
  
  /**
   * Count the total number of seats in a seat map
   * @param seatMap The seat map to count seats in
   * @returns The total number of seats
   */
  countTotalSeatsInMap(seatMap: any): number {
    if (!seatMap || !seatMap.rows) return 0;
    
    let totalSeats = 0;
    seatMap.rows.forEach((row: any) => {
      if (row.seats) {
        totalSeats += row.seats.length;
      }
    });
    
    return totalSeats;
  }
  
  /**
   * Count the number of available seats in a seat map
   * @param seatMap The seat map to count available seats in
   * @returns The number of available seats
   */
  countAvailableSeatsInMap(seatMap: any): number {
    if (!seatMap || !seatMap.rows) return 0;
    
    let availableSeats = 0;
    seatMap.rows.forEach((row: any) => {
      if (row.seats) {
        row.seats.forEach((seat: any) => {
          if (seat.status === 'AVAILABLE') {
            availableSeats++;
          }
        });
      }
    });
    
    return availableSeats;
  }
  
  /**
   * Get the available seats count from metadata or by counting
   * @returns The number of available seats
   */
  getAvailableSeatsCount(): number {
    // First try to get from metadata
    if (this.seatMap?.metadata?.scheduleAvailableSeats !== undefined) {
      return this.seatMap.metadata.scheduleAvailableSeats;
    }
    
    // Fall back to counting available seats in the map
    return this.countAvailableSeatsInMap(this.seatMap);
  }
  
  /**
   * Update the seats array from the current seat map
   */
  updateSeatsFromMap(): void {
    if (!this.seatMap || !this.seatMap.rows) return;
    
    // Reset the seats array
    this.seats = [];
    
    // Process each seat to ensure it has the correct price
    this.seatMap.rows.forEach((row: SeatRow) => {
      console.log(`Processing row ${row.rowLabel} with ${row.seats.length} seats`);
      
      row.seats.forEach((seat: SeatInfo) => {
        // Make sure each seat has a valid price
        if (!seat.price || seat.price <= 0) {
          // Calculate price based on category and schedule base price
          if (this.schedule && this.schedule.basePrice) {
            const basePrice = this.schedule.basePrice;
            
            // Apply multipliers based on seat category
            switch(seat.category) {
              case SeatCategory.PREMIUM:
                seat.price = basePrice * 1.5; // 50% more than base price
                break;
              case SeatCategory.VIP:
                seat.price = basePrice * 2.0; // 100% more than base price
                break;
              case SeatCategory.STANDARD:
              default:
                seat.price = basePrice;
                break;
            }
          } else {
            // Fallback to default prices
            seat.price = this.getSeatPrice(seat.category || SeatCategory.STANDARD);
          }
        }
        
        // Convert SeatInfo to ShowSeat and store in our flat array for easier access
        const showSeat: ShowSeat = {
          id: seat.id,
          row: row.rowLabel, // Add the row property from the parent row
          seatNumber: seat.seatNumber,
          status: seat.status as SeatStatus,
          price: seat.price,
          category: seat.category as SeatCategory,
          isSelected: seat.isSelected
        };
        this.seats.push(showSeat);
        
        // Update our price map
        if (seat.category) {
          this.seatPrices[seat.category] = seat.price;
        }
      });
    });
    
    console.log(`Updated seats array with ${this.seats.length} seats from seat map`);
    
    // Log the seat distribution by category
    const vipSeats = this.seats.filter(s => s.category === SeatCategory.VIP).length;
    const premiumSeats = this.seats.filter(s => s.category === SeatCategory.PREMIUM).length;
    const standardSeats = this.seats.filter(s => s.category === SeatCategory.STANDARD).length;
    
    console.log(`Updated seat distribution - VIP: ${vipSeats}, Premium: ${premiumSeats}, Standard: ${standardSeats}, Total: ${this.seats.length}`);
  }
  
  /**
   * Check if there's a discrepancy between the expected and actual seat counts
   */
  hasSeatCountDiscrepancy(): boolean {
    if (!this.seatMap || !this.seatMap.metadata) {
      return false;
    }
    
    // Safely access metadata properties with fallbacks to 0
    const expectedSeats = this.seatMap.metadata['totalSeats'] !== undefined ? this.seatMap.metadata['totalSeats'] : 0;
    const receivedSeats = this.seatMap.metadata['receivedSeats'] !== undefined ? this.seatMap.metadata['receivedSeats'] : 0;
    
    // Get venue capacity and ensure it's a number
    let venueCapacity = 0;
    const capacityValue = this.getVenueCapacity();
    if (typeof capacityValue === 'number') {
      venueCapacity = capacityValue;
    } else if (typeof capacityValue === 'string' && capacityValue !== 'Unknown' && !isNaN(Number(capacityValue))) {
      venueCapacity = Number(capacityValue);
    }
    
    // If we have metadata explicitly indicating a refresh is needed
    if (this.seatMap.metadata['needsRefresh'] === true) {
      return true;
    }
    
    // If we have significantly fewer seats than expected (less than 90%)
    if (receivedSeats > 0 && expectedSeats > 0 && receivedSeats < expectedSeats * 0.9) {
      return true;
    }
    
    // If venue capacity doesn't match total seats (with 5% tolerance)
    if (venueCapacity > 0 && expectedSeats > 0 && 
        (venueCapacity < expectedSeats * 0.95 || venueCapacity > expectedSeats * 1.05)) {
      return true;
    }
    
    return false;
  }

  /**
   * Manually refresh the seat map
   */
  refreshSeatMap(): void {
    if (!this.schedule) {
      console.error('Cannot refresh seat map: No schedule selected');
      return;
    }
    
    this.loading = true;
    this.error = null; // Clear any previous errors
    
    const scheduleId = this.schedule.id || 0;
    console.log(`Manually refreshing seat map for schedule ${scheduleId}`);
    
    // Clear the cache by adding a timestamp parameter
    const timestamp = new Date().getTime();
    
    // Call the booking service with the cache-busting parameter
    this.bookingService.getAvailableSeats(scheduleId, timestamp).subscribe({
      next: (seatMap) => {
        console.log('Received refreshed seat map:', seatMap);
        this.seatMap = seatMap;
        this.updateSeatsFromMap();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error refreshing seat map:', error);
        this.error = 'Failed to refresh seat map. Please try again.';
        this.loading = false;
      }
    });
   this.bookingService.getAvailableSeats(scheduleId).subscribe({
       next: (seatMap) => {
      
        console.log('Received refreshed seat map:', seatMap);
        
        // Check if there's an error in the metadata
        if (seatMap && seatMap.metadata && seatMap.metadata.error) {
          console.error(`Error in refreshed seat map: ${seatMap.metadata.error}`);
          this.error = `Error loading seat map: ${seatMap.metadata.error}. Please try again later.`;
          this.loading = false;
          return;
        }
        
        // Check if the seat map is empty
        if (!seatMap || !seatMap.rows || seatMap.rows.length === 0) {
          console.error('Received empty or invalid seat map from the server');
          this.error = 'No seat map available for this show. Please try a different schedule or contact support.';
          this.loading = false;
          return;
        }
        
        // Update the seat map
        this.seatMap = seatMap;
        
        // Ensure the seat map metadata has the correct venue capacity from the database
        if (this.schedule?.venue?.capacity && this.seatMap) {
          if (!this.seatMap.metadata) {
            // Create a properly typed metadata object
            this.seatMap.metadata = {
              totalSeats: 0,
              totalRows: 0,
              maxSeatsPerRow: 0,
              rowLengths: {},
              venueCapacity: this.schedule.venue.capacity
            };
          } else if (this.seatMap.metadata) {
            // Add venueCapacity to existing metadata
            this.seatMap.metadata['venueCapacity'] = this.schedule.venue.capacity;
          }
          console.log(`Updated refreshed seat map metadata with venue capacity from database: ${this.schedule.venue.capacity}`);
        }
        
        this.updateSeatsFromMap();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error refreshing seat map:', error);
        this.error = 'Failed to refresh seat map. Please try again later.';
        this.loading = false;
      }
    });
  }
  
  /**
   * Get the venue capacity from various sources
   * Returns a number or 'Unknown' as a string
   */
  getVenueCapacity(): number | string {
    // Always prioritize the venue capacity from the database
    if (this.schedule && this.schedule.venue && this.schedule.venue.capacity !== undefined && this.schedule.venue.capacity !== null) {
      return this.schedule.venue.capacity;
    }
    
    // Fall back to metadata if venue capacity is not available
    if (this.seatMap && this.seatMap.metadata && 
        this.seatMap.metadata['venueCapacity'] !== undefined && 
        this.seatMap.metadata['venueCapacity'] !== null) {
      return this.seatMap.metadata['venueCapacity'];
    }
    
    // Use total seats as a last resort
    if (this.schedule && this.schedule.totalSeats !== undefined && this.schedule.totalSeats !== null) {
      return this.schedule.totalSeats;
    }
    
    return 'Unknown';
  }
  
  /**
   * Get the seat category for a specific seat
   */
  getSeatCategory(rowLabel: string, seatNumber: number): string {
    const seat = this.getSeatFromMap(rowLabel, seatNumber);
    return seat?.category || 'STANDARD';
  }
  
  /**
   * Get the display name for a seat category
   */
  getSeatCategoryNameByPosition(rowLabel: string, seatNumber: number): string {
    const category = this.getSeatCategory(rowLabel, seatNumber);
    
    if (this.seatMap?.metadata && this.seatMap.metadata['categoryInfo']) {
      const categoryInfo = this.seatMap.metadata['categoryInfo'] as any;
      if (categoryInfo[category]) {
        return categoryInfo[category].displayName || category;
      }
    }
    
    // Fallback to default names
    switch (category) {
      case 'STANDARD': return 'Standard';
      case 'PREMIUM': return 'Premium';
      case 'VIP': return 'VIP';
      default: return category;
    }
  }
  
  /**
   * Get the price for a specific seat
   */
  getSeatPriceByPosition(rowLabel: string, seatNumber: number): number {
    const seat = this.getSeatFromMap(rowLabel, seatNumber);
    return seat?.price || 0;
  }
  
  /**
   * Show tooltip when hovering over a seat
   */
  showSeatTooltip(event: MouseEvent, rowLabel: string, seatNumber: number): void {
    const seat = this.getSeatFromMap(rowLabel, seatNumber);
    if (!seat || seat.status !== SeatStatus.AVAILABLE) return;
    
    const seatElement = event.currentTarget as HTMLElement;
    const tooltip = seatElement.querySelector('.seat-tooltip') as HTMLElement;
    
    if (tooltip) {
      tooltip.style.opacity = '1';
    }
  }
  
  /**
   * Hide tooltip when mouse leaves a seat
   */
  hideSeatTooltip(event: MouseEvent): void {
    const seatElement = event.currentTarget as HTMLElement;
    const tooltip = seatElement.querySelector('.seat-tooltip') as HTMLElement;
    
    if (tooltip) {
      tooltip.style.opacity = '0';
    }
  }
  
  loadSampleData(showId: number, scheduleId: number): void {
    // Sample show data
    this.show = {
      id: showId,
      title: 'Sample Show',
      type: 'Movie',
      image: 'assets/images/movie1.jpg',
      date: '2023-12-15',
      time: '19:00',
      venue: 'Cinema City',
      price: 250, // Base price in Indian Rupees (₹)
      description: 'Sample show description',
      duration: 120,
      status: ShowStatus.UPCOMING
    };
    
    // Sample schedule data with complete venue information
    const venueObj: Venue = { 
      id: 1, 
      name: 'Cinema City',
      address: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      capacity: 200,
      amenities: ['Parking', 'Food Court', 'Wheelchair Access'],
      imageUrl: 'assets/images/venues/cinema-city.jpg'
    };
    
    this.schedule = {
      id: scheduleId,
      showId: showId,
      showDate: '2023-12-15',
      showTime: '19:00',
      basePrice: 250, // Base price in Indian Rupees (₹)
      status: 'ACTIVE',
      venue: venueObj,
      availableSeats: 150,
      totalSeats: 200
    };
    
    // Create sample seat map
    this.createSampleSeatMap();
  }
  
  createSampleSeatMap(): void {
    console.log('Creating dynamic seat map for show:', this.show?.title);
    
    // Create a seat map with dynamic rows and seats based on venue capacity
    const seatMap: SeatSelectionMap = {
      rows: [],
      screen: 'SCREEN',
      legend: {
        [SeatStatus.AVAILABLE]: SEAT_STATUS_METADATA[SeatStatus.AVAILABLE].displayName,
        [SeatStatus.RESERVED]: SEAT_STATUS_METADATA[SeatStatus.RESERVED].displayName,
        [SeatStatus.SOLD]: SEAT_STATUS_METADATA[SeatStatus.SOLD].displayName,
        [SeatStatus.SELECTED]: SEAT_STATUS_METADATA[SeatStatus.SELECTED].displayName,
        [SeatCategory.STANDARD]: SEAT_CATEGORY_METADATA[SeatCategory.STANDARD].displayName,
        [SeatCategory.PREMIUM]: SEAT_CATEGORY_METADATA[SeatCategory.PREMIUM].displayName,
        [SeatCategory.VIP]: SEAT_CATEGORY_METADATA[SeatCategory.VIP].displayName
      },
      metadata: {
        totalSeats: 0,
        totalRows: 0,
        maxSeatsPerRow: 0,
        rowLengths: {}
      }
    };
    
    // Get the venue capacity from the schedule
    let venueCapacity = 200; // Default capacity if not available
    if (this.schedule && this.schedule.venue && this.schedule.venue.capacity) {
      venueCapacity = this.schedule.venue.capacity;
      console.log(`Using venue capacity from schedule: ${venueCapacity}`);
    } else if (this.schedule && this.schedule.totalSeats) {
      venueCapacity = this.schedule.totalSeats;
      console.log(`Using total seats from schedule: ${venueCapacity}`);
    } else if (this.show && this.show.totalSeats) {
      venueCapacity = this.show.totalSeats;
      console.log(`Using total seats from show: ${venueCapacity}`);
    }
    
    // Calculate the number of rows and seats per row based on venue capacity
    // Create a more realistic theater layout with varying row lengths
    // Front rows (closer to screen) are shorter, back rows are longer
    let totalSeats = 0;
    let numRows = Math.ceil(Math.sqrt(venueCapacity) * 0.8); // Estimate number of rows
    numRows = Math.max(numRows, 5); // At least 5 rows
    
    console.log(`Creating dynamic theater layout with approximately ${numRows} rows for total capacity of ${venueCapacity}`);
    
    // Generate row labels (A-Z, then AA-AZ, BA-BZ, etc. if needed)
    const rowLabels: string[] = [];
    for (let i = 0; i < numRows; i++) {
      if (i < 26) {
        // A-Z
        rowLabels.push(String.fromCharCode(65 + i));
      } else {
        // AA, AB, etc.
        const firstChar = String.fromCharCode(65 + Math.floor((i - 26) / 26));
        const secondChar = String.fromCharCode(65 + ((i - 26) % 26));
        rowLabels.push(firstChar + secondChar);
      }
    }
    
    let seatId = 1;
    
    // Use the schedule's base price if available, otherwise use default prices
    let basePrice = 250; // Default base price in Indian Rupees
    if (this.schedule && this.schedule.basePrice && this.schedule.basePrice > 0) {
      basePrice = this.schedule.basePrice;
      console.log(`Using schedule base price: ${basePrice}`);
    } else if (this.show && this.show.price && this.show.price > 0) {
      basePrice = this.show.price;
      console.log(`Using show base price: ${basePrice}`);
    }
    
    // Initialize seat prices in Indian Rupees based on the base price
    this.seatPrices = {
      [SeatCategory.STANDARD]: basePrice,
      [SeatCategory.PREMIUM]: basePrice * 1.5,
      [SeatCategory.VIP]: basePrice * 2.0
    };
    
    console.log('Seat prices for dynamic map:', this.seatPrices);
    
    // Reset the seats array
    this.seats = [];
    
    // Calculate VIP and premium row counts based on total rows
    const vipRowCount = Math.max(1, Math.floor(numRows * 0.2)); // 20% of rows are VIP
    const premiumRowCount = Math.max(1, Math.floor(numRows * 0.3)); // 30% of rows are Premium
    
    // Create a realistic theater layout with varying row lengths
    // Front rows (closer to screen) are shorter, back rows are longer
    rowLabels.forEach((rowLabel: string, rowIndex: number) => {
      // Calculate seats for this row - create a curved theater layout
      // Front rows have fewer seats, back rows have more
      let rowSeats: number;
      
      if (rowIndex < numRows * 0.3) {
        // Front rows (30% of rows) - fewer seats
        rowSeats = Math.max(5, Math.floor(venueCapacity / numRows * 0.7));
      } else if (rowIndex < numRows * 0.7) {
        // Middle rows (40% of rows) - medium number of seats
        rowSeats = Math.max(8, Math.floor(venueCapacity / numRows * 0.9));
      } else {
        // Back rows (30% of rows) - more seats
        rowSeats = Math.max(10, Math.floor(venueCapacity / numRows * 1.2));
      }
      
      // Add some randomness to create a more natural layout
      rowSeats += Math.floor(Math.random() * 3) - 1;
      
      const row: SeatRow = {
        rowLabel,
        seats: []
      };
      
      // Calculate starting seat number to center the row
      // This creates a more realistic theater layout where seats are centered
      const startSeat = Math.max(1, Math.floor((15 - rowSeats) / 2) + 1);
      
      // Create seats for this row
      for (let i = 0; i < rowSeats; i++) {
        const seatNumber = startSeat + i;
        
        // Determine seat category based on row position
        let category: SeatCategory = SeatCategory.STANDARD;
        let price = this.seatPrices[SeatCategory.STANDARD];
        
        // Front rows are VIP, next set are Premium, rest are Standard
        if (rowIndex < vipRowCount) {
          category = SeatCategory.VIP;
          price = this.seatPrices[SeatCategory.VIP];
        } else if (rowIndex < vipRowCount + premiumRowCount) {
          category = SeatCategory.PREMIUM;
          price = this.seatPrices[SeatCategory.PREMIUM];
        }
        
        // All seats are available by default
        let status: SeatStatus = SeatStatus.AVAILABLE;
        
        // Make some seats unavailable to simulate a realistic theater
        if ((rowIndex + seatNumber) % 7 === 0) {
          status = SeatStatus.SOLD;
        } else if ((rowIndex + seatNumber) % 13 === 0) {
          status = SeatStatus.RESERVED;
        }
        
        const seatInfo: SeatInfo = {
          id: seatId++,
          seatNumber: seatNumber,
          status,
          price,
          category
        };
        
        row.seats.push(seatInfo);
        
        // Also add to the flat seats array for the template
        const showSeat: ShowSeat = {
          id: seatInfo.id,
          row: rowLabel,
          seatNumber: seatNumber,
          status: status as SeatStatus,
          price,
          category: category as SeatCategory,
          isSelected: false
        };
        
        this.seats.push(showSeat);
        totalSeats++;
      }
      
      seatMap.rows.push(row);
    });
    
    console.log(`Created dynamic theater layout with ${seatMap.rows.length} rows and ${totalSeats} total seats`);
    
    // Update venue capacity in the schedule if needed
    if (this.schedule) {
      // Log any inconsistencies between different seat count fields
      console.log(`Seat count comparison (before update):
        - Generated seats in map: ${totalSeats}
        - Venue capacity: ${this.schedule.venue?.capacity || 'Unknown'}
        - Schedule total seats: ${this.schedule.totalSeats || 'Unknown'}
        - Schedule available seats: ${this.schedule.availableSeats || 'Unknown'}
      `);
      
      // Always prioritize the actual seat count from our generated map
      if (this.schedule.totalSeats !== totalSeats) {
        console.log(`Updating schedule total seats from ${this.schedule.totalSeats} to ${totalSeats}`);
        this.schedule.totalSeats = totalSeats;
      }
      
      if (this.schedule.venue && this.schedule.venue.capacity !== totalSeats) {
        console.log(`Updating venue capacity from ${this.schedule.venue.capacity} to ${totalSeats}`);
        this.schedule.venue.capacity = totalSeats;
      }
      
      // Update available seats if needed
      if (this.schedule) {
        // Check and correct seatsAvailable if needed
        if (this.schedule.seatsAvailable !== undefined && this.schedule.seatsAvailable > totalSeats) {
          console.log(`Correcting seatsAvailable from ${this.schedule.seatsAvailable} to ${totalSeats}`);
          this.schedule.seatsAvailable = totalSeats;
        }
        
        // Also update availableSeats for backward compatibility
        if (this.schedule.availableSeats !== undefined && this.schedule.availableSeats > totalSeats) {
          console.log(`Correcting availableSeats from ${this.schedule.availableSeats} to ${totalSeats}`);
          this.schedule.availableSeats = totalSeats;
        }
      }
    }
    
    // Update the metadata
    if (seatMap.metadata) {
      seatMap.metadata.totalSeats = totalSeats;
      seatMap.metadata.totalRows = seatMap.rows.length;
      
      // Calculate max seats per row and row lengths
      let maxSeatsPerRow = 0;
      const rowLengths: { [key: string]: number } = {};
      
      seatMap.rows.forEach(row => {
        const rowLength = row.seats.length;
        maxSeatsPerRow = Math.max(maxSeatsPerRow, rowLength);
        rowLengths[row.rowLabel] = rowLength;
      });
      
      seatMap.metadata.maxSeatsPerRow = maxSeatsPerRow;
      seatMap.metadata.rowLengths = rowLengths;
      
      console.log('Seat map metadata:', seatMap.metadata);
    }
    
    this.seatMap = seatMap;
    this.loading = false;
    
    // Log the seat distribution by category
    const vipSeats = this.seats.filter(s => s.category === SeatCategory.VIP).length;
    const premiumSeats = this.seats.filter(s => s.category === SeatCategory.PREMIUM).length;
    const standardSeats = this.seats.filter(s => s.category === SeatCategory.STANDARD).length;
    
    console.log(`Seat distribution - VIP: ${vipSeats}, Premium: ${premiumSeats}, Standard: ${standardSeats}, Total: ${this.seats.length}`);
  }

  loadSeatMap(scheduleId: number): void {
    console.log(`Loading seat map for schedule ID: ${scheduleId}`);
    
    // Get the base price from the schedule if available
    const basePrice = this.schedule?.basePrice;
    console.log(`Using base price: ${basePrice} for schedule ${scheduleId}`);
    
    // Log the current show and schedule for debugging
    console.log('Current show:', this.show);
    console.log('Current schedule:', this.schedule);
    
    // Store schedule data in localStorage for potential fallback use
    if (this.schedule) {
      try {
        // Make sure to store the base price and show ID for the booking service to use
        localStorage.setItem(`schedule_${scheduleId}`, JSON.stringify({
          id: scheduleId,
          showId: this.show?.id || 0,
          basePrice: this.schedule.basePrice,
          showDate: this.schedule.showDate,
          showTime: this.schedule.showTime
        }));
        console.log(`Stored schedule data with base price ${this.schedule.basePrice} and show ID ${this.show?.id} in localStorage`);
      } catch (e) {
        console.error('Error storing schedule data in localStorage:', e);
      }
    } else if (basePrice) {
      // If we have a base price but no schedule, still store it
      try {
        localStorage.setItem(`schedule_${scheduleId}`, JSON.stringify({
          id: scheduleId,
          showId: this.show?.id || 0,
          basePrice: basePrice
        }));
        console.log(`Stored base price ${basePrice} and show ID ${this.show?.id} in localStorage without full schedule data`);
      } catch (e) {
        console.error('Error storing base price in localStorage:', e);
      }
    }
    
    // Clear any existing selected seats
    this.selectedSeats = [];
    
    // Add a cache-busting parameter to force a fresh request
    const cacheBuster = new Date().getTime();
    
    this.bookingService.getAvailableSeats(scheduleId, cacheBuster).subscribe({
      next: (seatMap) => {
        console.log('Received seat map:', seatMap);
        
        // Check if the seat map is empty or has empty rows array
        if (!seatMap || !seatMap.rows || seatMap.rows.length === 0) {
          console.error('Received empty or invalid seat map from the server');
          
          // Check if there's error information in the metadata
          if (seatMap && seatMap.metadata && seatMap.metadata.error) {
            console.error(`Server reported error: ${seatMap.metadata.error}`);
            this.error = `Error loading seat map: ${seatMap.metadata.error}. Please try again later or contact support.`;
          } else {
            this.error = 'No seat map available for this show. Please try a different schedule or contact support.';
          }
          
          this.loading = false;
          return;
        }
        
        this.seatMap = seatMap;
        
        // Ensure the seat map metadata has the correct venue capacity from the database
        if (this.schedule?.venue?.capacity && this.seatMap) {
          if (!this.seatMap.metadata) {
            // Create a properly typed metadata object
            this.seatMap.metadata = {
              totalSeats: 0,
              totalRows: 0,
              maxSeatsPerRow: 0,
              rowLengths: {},
              venueCapacity: this.schedule.venue.capacity
            };
          } else if (this.seatMap.metadata) {
            // Add venueCapacity to existing metadata
            this.seatMap.metadata['venueCapacity'] = this.schedule.venue.capacity;
          }
          console.log(`Updated seat map metadata with venue capacity from database: ${this.schedule.venue.capacity}`);
        }
        
        // Reset the seats array
        this.seats = [];
        
        // Log the number of rows and seats for debugging
        console.log(`Seat map has ${seatMap.rows.length} rows`);
        let totalSeats = 0;
        
        // Process each seat to ensure it has the correct price
        seatMap.rows.forEach((row: SeatRow) => {
          console.log(`Processing row ${row.rowLabel} with ${row.seats.length} seats`);
          totalSeats += row.seats.length;
          
          row.seats.forEach((seat: SeatInfo) => {
            // Make sure each seat has a valid price
            if (!seat.price || seat.price <= 0) {
              // Calculate price based on category and schedule base price
              if (this.schedule && this.schedule.basePrice) {
                const basePrice = this.schedule.basePrice;
                
                // Apply multipliers based on seat category
                switch(seat.category) {
                  case SeatCategory.PREMIUM:
                    seat.price = basePrice * 1.5; // 50% more than base price
                    break;
                  case SeatCategory.VIP:
                    seat.price = basePrice * 2.0; // 100% more than base price
                    break;
                  case SeatCategory.STANDARD:
                  default:
                    seat.price = basePrice;
                    break;
                }
              } else {
                // Fallback to default prices
                seat.price = this.getSeatPrice(seat.category || SeatCategory.STANDARD);
              }
            }
            
            // Convert SeatInfo to ShowSeat and store in our flat array for easier access
            const showSeat: ShowSeat = {
              id: seat.id,
              row: row.rowLabel, // Add the row property from the parent row
              seatNumber: seat.seatNumber,
              status: seat.status as SeatStatus,
              price: seat.price,
              category: seat.category as SeatCategory,
              isSelected: seat.isSelected
            };
            this.seats.push(showSeat);
            
            // Update our price map
            if (seat.category) {
              this.seatPrices[seat.category] = seat.price;
            }
          });
        });
        
        console.log(`Total seats in map: ${totalSeats}`);
        
        // If after processing we still have no seats, create a dynamic seat map
        if (this.seats.length === 0) {
          console.warn('No seats found in the seat map, creating dynamic seat map');
          this.createSampleSeatMap();
        } else {
          console.log(`Successfully loaded ${this.seats.length} seats from backend`);
          
          // Log the actual number of seats received from the backend
          console.log(`IMPORTANT: Received ${this.seats.length} seats from backend. If this is significantly less than expected (1200+), check the backend seat retrieval logic.`);
          
          // Log the seat distribution by category
          const vipSeats = this.seats.filter(s => s.category === SeatCategory.VIP).length;
          const premiumSeats = this.seats.filter(s => s.category === SeatCategory.PREMIUM).length;
          const standardSeats = this.seats.filter(s => s.category === SeatCategory.STANDARD).length;
          
          console.log(`Seat distribution from backend - VIP: ${vipSeats}, Premium: ${premiumSeats}, Standard: ${standardSeats}, Total: ${this.seats.length}`);
          
          // Check if we have metadata from the backend
          if (this.seatMap && (this.seatMap as any).metadata) {
            const metadata = (this.seatMap as any).metadata;
            console.log('Seat map metadata from backend:', metadata);
            
            // Log any inconsistencies between different seat count fields
            if (metadata.totalSeats && metadata.venueCapacity && metadata.scheduleTotalSeats) {
              console.log(`Seat count comparison:
                - Actual seats in database: ${metadata.totalSeats}
                - Venue capacity: ${metadata.venueCapacity}
                - Schedule total seats: ${metadata.scheduleTotalSeats}
                - Schedule available seats: ${metadata.scheduleAvailableSeats || 'N/A'}
                - Seats in current map: ${this.seats.length}
              `);
              
              // Always prioritize the actual seat count from the database
              const actualSeatCount = metadata.totalSeats;
              
              // Check if the number of seats in the map matches the reported total
              if (this.seats.length !== actualSeatCount) {
                console.warn(`WARNING: Received ${this.seats.length} seats in the map, but database reports ${actualSeatCount} total seats.`);
                
                // Display a warning to the user about the discrepancy
                const discrepancyMessage = `Note: There may be a discrepancy in the seat count. The system shows ${this.seats.length} seats, but the database reports ${actualSeatCount} total seats.`;
                this.error = discrepancyMessage;
                
                // If we have significantly fewer seats than expected, try to refresh the seat map
                if (this.seats.length < actualSeatCount * 0.9) { // If we have less than 90% of expected seats
                  console.warn(`Significant seat count mismatch detected. Refreshing seat map...`);
                  
                  // Show loading indicator
                  this.loading = true;
                  
                  // Refresh the seat map after a short delay with a cache-busting parameter
                  setTimeout(() => {
                    console.log(`Refreshing seat map for schedule ${this.schedule?.id} (real-time update)`);
                    const cacheBuster = new Date().getTime();
                    this.bookingService.getAvailableSeats(this.schedule?.id || 0, cacheBuster).subscribe({
                      next: (refreshedSeatMap) => {
                        console.log('Received refreshed seat map:', refreshedSeatMap);
                        this.loading = false;
                        
                        // Check if there's an error in the metadata
                        if (refreshedSeatMap && refreshedSeatMap.metadata && refreshedSeatMap.metadata.error) {
                          console.error(`Error in refreshed seat map: ${refreshedSeatMap.metadata.error}`);
                          this.error = `Error loading complete seat map: ${refreshedSeatMap.metadata.error}. Some seats may not be displayed.`;
                          return;
                        }
                        
                        // Check if the refreshed map has more seats
                        const refreshedSeatCount = this.countTotalSeatsInMap(refreshedSeatMap);
                        if (refreshedSeatMap && refreshedSeatMap.rows && 
                            refreshedSeatMap.rows.length > 0 && 
                            refreshedSeatCount > this.seats.length) {
                          console.log(`Refreshed seat map has more seats (${refreshedSeatCount}) than original (${this.seats.length}). Updating...`);
                          this.seatMap = refreshedSeatMap;
                          this.updateSeatsFromMap();
                          
                          // Update the error message
                          if (refreshedSeatCount === actualSeatCount) {
                            // Clear the error if we now have the correct number of seats
                            this.error = '';
                          } else {
                            // Update the message with the new count
                            this.error = `Note: There may be a discrepancy in the seat count. The system shows ${refreshedSeatCount} seats, but the database reports ${actualSeatCount} total seats.`;
                          }
                        } else if (refreshedSeatMap && refreshedSeatMap.rows && refreshedSeatMap.rows.length > 0) {
                          console.log(`Refreshed seat map has ${this.countTotalSeatsInMap(refreshedSeatMap)} seats, which is not more than the current ${this.seats.length} seats. Not updating.`);
                        } else {
                          console.warn('Refreshed seat map is empty or invalid. Not updating.');
                        }
                      },
                      error: (error) => {
                        console.error('Error updating seat map in real-time:', error);
                        // Don't show error to user for background refresh
                      }
                    });
                  }, 1000);
                }
              }
              
              // Update venue capacity in the schedule if needed
              if (this.schedule) {
                if (this.schedule.totalSeats !== actualSeatCount) {
                  console.log(`Updating schedule total seats from ${this.schedule.totalSeats} to ${actualSeatCount}`);
                  this.schedule.totalSeats = actualSeatCount;
                }
                
                if (this.schedule.venue && this.schedule.venue.capacity !== actualSeatCount) {
                  console.log(`Updating venue capacity from ${this.schedule.venue.capacity} to ${actualSeatCount}`);
                  this.schedule.venue.capacity = actualSeatCount;
                }
                
                // Update available seats if needed
                if (this.schedule && this.schedule.availableSeats !== undefined && this.schedule.availableSeats > actualSeatCount) {
                  console.log(`Correcting available seats from ${this.schedule.availableSeats} to ${actualSeatCount}`);
                  this.schedule.availableSeats = actualSeatCount;
                }
              }
            } else {
              // If metadata is incomplete, use the seat count from the map
              console.log(`Using seat count from map: ${this.seats.length}`);
              
              // Update venue capacity in the schedule if needed
              if (this.schedule) {
                if (this.schedule.totalSeats !== this.seats.length) {
                  console.log(`Updating schedule total seats from ${this.schedule.totalSeats} to ${this.seats.length}`);
                  this.schedule.totalSeats = this.seats.length;
                }
                
                if (this.schedule.venue && this.schedule.venue.capacity !== this.seats.length) {
                  console.log(`Updating venue capacity from ${this.schedule.venue.capacity} to ${this.seats.length}`);
                  this.schedule.venue.capacity = this.seats.length;
                }
              }
            }
          } else {
            // If no metadata, use the seat count from the map
            console.log(`No metadata available. Using seat count from map: ${this.seats.length}`);
            
            // Update venue capacity in the schedule if needed
            if (this.schedule) {
              if (this.schedule.totalSeats !== this.seats.length) {
                console.log(`Updating schedule total seats from ${this.schedule.totalSeats} to ${this.seats.length}`);
                this.schedule.totalSeats = this.seats.length;
              }
              
              if (this.schedule.venue && this.schedule.venue.capacity !== this.seats.length) {
                console.log(`Updating venue capacity from ${this.schedule.venue.capacity} to ${this.seats.length}`);
                this.schedule.venue.capacity = this.seats.length;
              }
            }
          }
        }
        
        this.loading = false;
        console.log('Loaded seat map with prices:', this.seatPrices);
      },
      error: (error) => {
        console.error('Error loading seats:', error);
        console.log('Creating dynamic seat map as fallback');
        this.createSampleSeatMap();
        this.error = '';
        this.loading = false;
      }
    });
  }

  toggleSeatSelection(seat: SeatInfo): void {
    if (seat.status !== SeatStatus.AVAILABLE && !seat.isSelected) {
      return; // Can't select unavailable seats
    }
    
    const index = this.selectedSeats.findIndex(s => s.id === seat.id);
    
    if (index >= 0) {
      // Deselect the seat
      this.selectedSeats.splice(index, 1);
      seat.isSelected = false;
      
      // Clear the hold timer
      if (this.seatHoldTimers.has(seat.id!)) {
        clearTimeout(this.seatHoldTimers.get(seat.id!));
        this.seatHoldTimers.delete(seat.id!);
      }
    } else {
      // Check selection limits
      if (this.selectedSeats.length >= this.MAX_SEATS) {
        alert(`You can select a maximum of ${this.MAX_SEATS} seats.`);
        return;
      }
      
      // Select the seat
      this.selectedSeats.push(seat);
      seat.isSelected = true;
      
      // Set up hold timer
      const timer = setTimeout(() => {
        this.releaseSeat(seat);
      }, this.HOLD_TIMEOUT);
      
      this.seatHoldTimers.set(seat.id!, timer);
    }
    
    // Update booking summary
    this.updateBookingSummary();
    
    // Reserve seats on the server if we have any selected
    if (this.selectedSeats.length > 0) {
      this.reserveSelectedSeats();
    } else {
      // If we have no selected seats but have a reservation, release it
      this.releaseReservation();
    }
  }
  
  /**
   * Reserve the currently selected seats on the server
   */
  private reserveSelectedSeats(): void {
    // Only proceed if we're logged in and have a schedule
    if (!this.authService.isLoggedIn() || !this.schedule || !this.schedule.id) {
      console.log('Cannot reserve seats: not logged in or no schedule');
      return;
    }
    
    // Get the seat IDs
    const seatIds = this.selectedSeats.map(seat => seat.id!);
    
    // Check if we already have a reservation session
    const currentSessionId = this.seatReservationService.getCurrentSessionId();
    if (currentSessionId) {
      // Release the current reservation before making a new one
      this.seatReservationService.releaseReservations(currentSessionId).subscribe({
        next: () => {
          // Now make the new reservation
          this.makeReservation(seatIds);
        },
        error: (error) => {
          console.error('Error releasing previous reservation:', error);
          // Still try to make the new reservation
          this.makeReservation(seatIds);
        }
      });
    } else {
      // No existing reservation, just make a new one
      this.makeReservation(seatIds);
    }
  }
  
  /**
   * Make a reservation for the specified seat IDs
   */
  private makeReservation(seatIds: number[]): void {
    if (!this.schedule || !this.schedule.id) return;
    
    this.seatReservationService.reserveSeats(this.schedule.id, seatIds).subscribe({
      next: (response) => {
        console.log('Seats reserved successfully:', response);
        // The session ID is automatically stored in localStorage by the service
      },
      error: (error) => {
        console.error('Error reserving seats:', error);
        // Don't show an error to the user, just log it
      }
    });
  }
  
  /**
   * Release the current seat reservation if any
   */
  private releaseReservation(): void {
    const sessionId = this.seatReservationService.getCurrentSessionId();
    if (!sessionId) return;
    
    this.seatReservationService.releaseReservations(sessionId).subscribe({
      next: (response) => {
        console.log('Reservation released successfully:', response);
      },
      error: (error) => {
        console.error('Error releasing reservation:', error);
      }
    });
  }

  onSeatClick(seat: ShowSeat | any): void {
    console.log('Clicked on seat:', seat);
    
    if (!seat || !seat.id) {
      console.error('Invalid seat clicked');
      return;
    }
    
    if (seat.status === SeatStatus.AVAILABLE || seat.isSelected) {
      // Ensure seat has a valid ID
      if (!seat.id) {
        console.error('Seat has no ID:', seat);
        return;
      }
      
      // Convert ShowSeat to SeatInfo
      const seatInfo: SeatInfo = {
        id: seat.id,
        seatNumber: seat.seatNumber,
        status: seat.status,
        price: seat.price,
        category: seat.category,
        isSelected: seat.isSelected
      };
      
      console.log('Processing seat selection for:', seatInfo);
      this.toggleSeatSelection(seatInfo);
    } else {
      console.log('Seat not available for selection, status:', seat.status);
    }
  }

  private releaseSeat(seat: SeatInfo): void {
    const index = this.selectedSeats.findIndex(s => s.id === seat.id);
    if (index >= 0) {
      this.selectedSeats.splice(index, 1);
      seat.isSelected = false;
      this.seatHoldTimers.delete(seat.id!);
      this.updateBookingSummary();
      
      // If this was the last selected seat, release the server-side reservation
      if (this.selectedSeats.length === 0) {
        this.releaseReservation();
      } else {
        // Otherwise, update the reservation with the remaining seats
        this.reserveSelectedSeats();
      }
      
      // Notify user
      alert('Your seat selection has expired. Please complete your booking within 5 minutes of selecting seats.');
    }
  }

  getSeatStatusClass(seat: SeatInfo): string {
    if (seat.isSelected) {
      return 'selected';
    }
    return seat.status.toLowerCase();
  }

  getSeatCategoryClass(seat: SeatInfo): string {
    return seat.category ? seat.category.toLowerCase() : '';
  }

  getLegendStatusClass(status: SeatStatus): string {
    return `seat-${status.toLowerCase()}`;
  }

  getLegendCategoryClass(category: SeatCategory): string {
    return `category-${category.toLowerCase()}`;
  }

  getSeatTooltip(seat: SeatInfo): string {
    const status = seat.isSelected ? 'Selected' : SEAT_STATUS_METADATA[seat.status as SeatStatus].displayName;
    const category = SEAT_CATEGORY_METADATA[seat.category as SeatCategory].displayName;
    
    // Format price with Indian Rupee symbol and ensure it's a valid number
    const price = (seat.status === SeatStatus.AVAILABLE && seat.price > 0) 
      ? `₹${seat.price.toFixed(0)}` // No decimal places for INR
      : '';
    
    return `Seat ${this.getSeatRow(seat)}${seat.seatNumber}
${category} Class
${status}${price ? ` - ${price}` : ''}`;
  }

  updateBookingSummary(): void {
    if (!this.show || !this.schedule) {
      return;
    }
    
    // Calculate pricing in Indian Rupees (₹)
    const subtotal = this.selectedSeats.reduce((sum, seat) => {
      // Ensure seat price is a valid number
      const price = seat.price > 0 ? seat.price : this.getSeatPrice(seat.category || SeatCategory.STANDARD);
      return sum + price;
    }, 0);
    
    const fees = Math.round(subtotal * 0.05); // 5% booking fee, rounded to whole rupees
    const taxes = Math.round(subtotal * 0.18); // 18% GST, rounded to whole rupees
    const total = subtotal + fees + taxes;
    
    // Create booking summary
    this.bookingSummary = {
      show: {
        id: this.show.id || 0,
        title: this.show.title,
        type: this.show.type,
        image: this.show.image
      },
      schedule: {
        id: this.schedule.id || 0,
        date: this.schedule.showDate,
        time: this.schedule.showTime || '',
        venue: (this.schedule.venue?.name || this.show.venue || '') as string
      },
      seats: {
        count: this.selectedSeats.length,
        details: this.selectedSeats.map(seat => ({
          row: this.getSeatRow(seat),
          seatNumber: seat.seatNumber,
          price: seat.price,
          category: seat.category as string
        }))
      },
      pricing: {
        subtotal,
        fees,
        taxes,
        total
      }
    };
  }

  getSeatRow(seat: SeatInfo): string {
    if (!this.seatMap) return '';
    
    // Find the row that contains this seat
    const row = this.seatMap.rows.find(r => 
      r.seats.some(s => s.id === seat.id)
    );
    
    return row ? row.rowLabel : '';
  }

  proceedToCheckout(): void {
    if (this.selectedSeats.length < this.MIN_SEATS) {
      alert(`Please select at least ${this.MIN_SEATS} seat(s) to continue.`);
      return;
    }
    
    // Validate booking time based on show type and start time
    const timeValidationError = this.validateBookingTime();
    if (timeValidationError) {
      alert(timeValidationError);
      return;
    }
    
    // Clear hold timers as we're proceeding to checkout
    this.seatHoldTimers.forEach((timer) => clearTimeout(timer));
    this.seatHoldTimers.clear();
    
    this.processingBooking = true;
    
    // Get user info
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        console.log('Current user:', user);
        
        // Update booking summary with customer info
        if (this.bookingSummary) {
          this.bookingSummary.customer = {
            name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Guest User',
            email: user.email || 'guest@example.com',
            phone: user.phone || ''
          };
          
          console.log('Updated booking summary with customer info:', this.bookingSummary);
        } else {
          console.error('No booking summary available');
        }
        
        // Navigate to payment page with booking summary
        this.navigateToPayment();
      },
      error: (error) => {
        console.error('Error getting user:', error);
        
        // Create a default customer if user info is not available
        if (this.bookingSummary) {
          this.bookingSummary.customer = {
            name: 'Guest User',
            email: 'guest@example.com',
            phone: ''
          };
          
          console.log('Created default customer info:', this.bookingSummary.customer);
        }
        
        // Continue to payment even if user info is not available
        this.navigateToPayment();
      }
    });
  }
  
  private navigateToPayment(): void {
    console.log('Navigating to payment with booking summary:', this.bookingSummary);
    
    // Validate selected seats before proceeding
    const invalidSeats = this.selectedSeats.filter(seat => !seat.id);
    if (invalidSeats.length > 0) {
      console.error('Invalid seats detected:', invalidSeats);
      alert('Some selected seats have invalid data. Please try selecting seats again.');
      this.processingBooking = false;
      return;
    }
    
    // Prepare selected seats data
    const selectedSeatsData = this.selectedSeats.map(seat => ({
      id: seat.id,
      seatId: seat.id,
      row: this.getSeatRow(seat),
      seatNumber: seat.seatNumber,
      price: seat.price,
      category: seat.category
    }));
    
    console.log('Selected seats for payment:', selectedSeatsData);
    
    // Use both state and history state to ensure data is available
    const navigationState = { 
      bookingSummary: this.bookingSummary,
      showId: this.show?.id,
      scheduleId: this.schedule?.id,
      selectedSeats: selectedSeatsData
    };
    
    // Store in session storage as a backup
    try {
      sessionStorage.setItem('bookingData', JSON.stringify(navigationState));
      console.log('Stored booking data in session storage');
    } catch (e) {
      console.error('Failed to store booking data in session storage:', e);
    }
    
    // Navigate to the payment form page
    this.router.navigate(['/booking/payment-form'], { 
      state: navigationState
    });
  }

  getSeatPrice(category: SeatCategory | string): number {
    // If we have the price from the backend, use it
    if (this.seatPrices[category as string] && this.seatPrices[category as string] > 0) {
      return this.seatPrices[category as string];
    }
    
    // If we have a schedule with a base price, calculate based on category
    if (this.schedule && this.schedule.basePrice && this.schedule.basePrice > 0) {
      const basePrice = this.schedule.basePrice;
      
      // Apply multipliers based on seat category
      switch(category) {
        case SeatCategory.PREMIUM:
          return basePrice * 1.5; // 50% more than base price
        case SeatCategory.VIP:
          return basePrice * 2.0; // 100% more than base price
        case SeatCategory.STANDARD:
        default:
          return basePrice;
      }
    }
    
    // Fallback to default prices in Indian Rupees if nothing else is available
    const defaultPrices = {
      [SeatCategory.STANDARD]: 250,  // ₹250 for standard seats
      [SeatCategory.PREMIUM]: 400,   // ₹400 for premium seats
      [SeatCategory.VIP]: 600        // ₹600 for VIP seats
    };
    
    return defaultPrices[category as SeatCategory] || defaultPrices[SeatCategory.STANDARD];
  }

  goBack(): void {
    if (this.show) {
      // Navigate back to show details page
      this.router.navigate(['/shows', this.show.id]);
    } else {
      this.router.navigate(['/shows']);
    }
  }

  getSeatStatusName(status: SeatStatus): string {
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  formatSeatCategoryName(category: SeatCategory): string {
    return category.charAt(0) + category.slice(1).toLowerCase();
  }
  
  /**
   * Get the maximum number of seats in any row
   * This helps with dynamic layout of the seat map
   */
  getMaxSeatsPerRow(): number {
    if (!this.seatMap || !this.seatMap.rows) return 20; // Default
    
    let maxSeats = 0;
    this.seatMap.rows.forEach(row => {
      if (row.seats && row.seats.length > maxSeats) {
        maxSeats = row.seats.length;
      }
    });
    
    return maxSeats || 20; // Default to 20 if no seats found
  }

  // This function returns Bootstrap color classes for the seat category
  getSeatCategoryColor(category: SeatCategory | string): string {
    const colorMap: { [key in SeatCategory]: string } = {
      [SeatCategory.PREMIUM]: 'primary',
      [SeatCategory.VIP]: 'success',
      [SeatCategory.STANDARD]: 'info'
    };
    return colorMap[category as SeatCategory] || 'info';
  }

  getSeatColor(seat: ShowSeat): string {
    return SEAT_STATUS_METADATA[seat.status as SeatStatus].color;
  }

  getSeatIcon(seat: ShowSeat): string {
    return SEAT_STATUS_METADATA[seat.status as SeatStatus].icon;
  }

  getCategoryColor(seat: ShowSeat): string {
    return SEAT_CATEGORY_METADATA[seat.category as SeatCategory].color;
  }

  getCategoryIcon(seat: ShowSeat): string {
    return SEAT_CATEGORY_METADATA[seat.category as SeatCategory].icon;
  }
  
  /**
   * Helper method to safely check if seat map has rows
   */
  hasSeatMapRows(): boolean {
    return !!this.seatMap && !!this.seatMap.rows && this.seatMap.rows.length > 0;
  }

  /**
   * Helper method to safely check if seat map has no rows or empty rows
   */
  hasNoSeatMapRows(): boolean {
    return !this.seatMap || !this.seatMap.rows || this.seatMap.rows.length === 0;
  }

  /**
   * Get a seat from the flat seats array by row and seat number
   * @returns The seat object or undefined if not found
   */
  getSeatFromMap(rowLabel: string, seatNumber: number): ShowSeat | SeatInfo {
    // Find the seat in our flat array
    const seat = this.seats.find(s => s.row === rowLabel && s.seatNumber === seatNumber);
    
    // If not found, return a default seat
    if (!seat) {
      console.log(`Seat not found in map: ${rowLabel}${seatNumber}`);
      
      // Try to get the base price from existing seats
      let price = 0;
      if (this.seats.length > 0) {
        const standardSeat = this.seats.find(s => s.category === SeatCategory.STANDARD);
        if (standardSeat) {
          price = standardSeat.price;
        } else {
          price = this.seats[0].price;
        }
      } else if (this.schedule && this.schedule.basePrice) {
        price = this.schedule.basePrice;
      }
      
      return {
        id: 0,
        row: rowLabel,
        seatNumber: seatNumber,
        status: SeatStatus.DISABLED,
        price: price,
        category: SeatCategory.STANDARD,
        isSelected: false
      };
    }
    
    return seat;
  }
  
  /**
   * Check if a seat is selected by row and seat number
   */
  isSeatSelected(rowLabel: string, seatNumber: number): boolean {
    return this.selectedSeats.some(s => {
      const seatRowLabel = this.getSeatRow(s);
      return (seatRowLabel === rowLabel) && s.seatNumber === seatNumber;
    });
  }

  getSeatStatusStyle(seat: ShowSeat | SeatInfo): { [key: string]: string } {
    if (!seat) return {};
    
    // Default styles
    const styles: { [key: string]: string } = {
      'cursor': 'pointer'
    };
    
    // Apply styles based on seat status
    const status = seat.status as SeatStatus;
    
    // Check if seat is in the selectedSeats array
    const isSelected = this.selectedSeats.some(s => s.id === seat.id);
    
    if (isSelected || ('isSelected' in seat && seat.isSelected)) {
      // Selected seat styling - BookMyShow style
      styles['background-color'] = '#f84464'; // BMS red
      styles['border-color'] = '#f84464';
      styles['color'] = 'white';
      styles['transform'] = 'scale(1.1)';
      styles['z-index'] = '1';
      styles['box-shadow'] = '0 0 8px rgba(248, 68, 100, 0.5)';
    } else {
      // Status-based styling - BookMyShow style
      switch (status) {
        case SeatStatus.AVAILABLE:
          styles['background-color'] = '#ffffff';
          // Border color will be set by category
          styles['color'] = '#333';
          break;
        case SeatStatus.RESERVED:
          styles['background-color'] = '#ffc107';
          styles['border-color'] = '#ffc107';
          styles['color'] = '#333';
          styles['cursor'] = 'not-allowed';
          break;
        case SeatStatus.SOLD:
          styles['background-color'] = '#aaa';
          styles['border-color'] = '#aaa';
          styles['color'] = '#333';
          styles['cursor'] = 'not-allowed';
          break;
        case SeatStatus.DISABLED:
          styles['background-color'] = '#6c757d';
          styles['border-color'] = '#6c757d';
          styles['color'] = 'white';
          styles['cursor'] = 'not-allowed';
          break;
        case SeatStatus.MAINTENANCE:
          styles['background-color'] = '#17a2b8';
          styles['border-color'] = '#17a2b8';
          styles['color'] = 'white';
          styles['cursor'] = 'not-allowed';
          break;
        default:
          styles['background-color'] = '#ffffff';
          break;
      }
    }
    
    return styles;
  }

  getCategoryStyle(seat: ShowSeat | SeatInfo): { [key: string]: string } {
    if (!seat) return {};
    
    const styles: { [key: string]: string } = {};
    const category = seat.category as SeatCategory;
    
    // Apply styles based on seat category - BookMyShow style
    switch (category) {
      case SeatCategory.PREMIUM:
        styles['font-weight'] = 'bold';
        styles['border-color'] = '#ffa500'; // Orange for premium
        break;
      case SeatCategory.VIP:
        styles['font-weight'] = 'bold';
        styles['border-color'] = '#9c27b0'; // Purple for VIP
        break;
      case SeatCategory.STANDARD:
      default:
        styles['font-weight'] = 'normal';
        styles['border-color'] = '#1ea83c'; // Green for standard
        break;
    }
    
    // Only apply these styles if the seat is available
    if (seat.status === SeatStatus.AVAILABLE) {
      styles['border-width'] = '1px';
      styles['background-color'] = '#fff';
    }
    
    return styles;
  }
  
  /**
   * Validates if booking is allowed based on show type and timing
   * @returns Error message if booking is not allowed, null if allowed
   */
  private validateBookingTime(): string | null {
    if (!this.schedule || !this.show) {
      return null; // Allow if we don't have schedule info
    }
    
    const now = new Date();
    const showDate = new Date(this.schedule.showDate);
    const showTime = this.schedule.showTime || '00:00';
    
    // Parse show time (format: HH:MM)
    const [hours, minutes] = showTime.split(':').map(Number);
    const showDateTime = new Date(showDate);
    showDateTime.setHours(hours, minutes, 0, 0);
    
    // Check if show has already started
    if (now > showDateTime) {
      const showType = this.show.type;
      
      // For movies, allow booking up to 15 minutes after start time
      if (showType && showType.toLowerCase() === 'movie') {
        const cutoffTime = new Date(showDateTime.getTime() + 15 * 60 * 1000); // Add 15 minutes
        
        if (now > cutoffTime) {
          const minutesAfterStart = Math.floor((now.getTime() - showDateTime.getTime()) / (1000 * 60));
          return `Booking not allowed. The movie started ${minutesAfterStart} minutes ago. ` +
                 `Bookings are only allowed up to 15 minutes after the movie starts.`;
        }
        
        // Show warning but allow booking
        const minutesAfterStart = Math.floor((now.getTime() - showDateTime.getTime()) / (1000 * 60));
        console.warn(`Warning: Movie started ${minutesAfterStart} minutes ago, but booking is still allowed ` +
                    `(within 15-minute grace period)`);
        
        return null; // Allow booking
      } else {
        // For all other show types (Theater, Concert, Event, Other), don't allow booking after start
        const minutesAfterStart = Math.floor((now.getTime() - showDateTime.getTime()) / (1000 * 60));
        return `Booking not allowed. The ${showType?.toLowerCase() || 'show'} started ${minutesAfterStart} minutes ago. ` +
               `Bookings are not allowed after ${showType?.toLowerCase() || 'show'} events have started.`;
      }
    }
    
    return null; // Booking is allowed
  }
  
  /**
   * Get time warning message for display in the UI
   * @returns Warning message or null if no warning needed
   */
  getTimeWarning(): string | null {
    if (!this.schedule || !this.show) {
      return null;
    }
    
    const now = new Date();
    const showDate = new Date(this.schedule.showDate);
    const showTime = this.schedule.showTime || '00:00';
    
    // Parse show time (format: HH:MM)
    const [hours, minutes] = showTime.split(':').map(Number);
    const showDateTime = new Date(showDate);
    showDateTime.setHours(hours, minutes, 0, 0);
    
    const timeDiffMs = showDateTime.getTime() - now.getTime();
    const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));
    
    // Show has already started
    if (timeDiffMs < 0) {
      const minutesAfterStart = Math.abs(timeDiffMinutes);
      const showType = this.show.type;
      
      if (showType && showType.toLowerCase() === 'movie') {
        if (minutesAfterStart <= 15) {
          return `This movie started ${minutesAfterStart} minutes ago. You can still book tickets (grace period: 15 minutes).`;
        } else {
          return `This movie started ${minutesAfterStart} minutes ago. Booking is no longer available.`;
        }
      } else {
        return `This ${showType?.toLowerCase() || 'show'} started ${minutesAfterStart} minutes ago. Booking is no longer available.`;
      }
    }
    
    // Show is starting soon (within 30 minutes)
    if (timeDiffMinutes <= 30 && timeDiffMinutes > 0) {
      return `This ${this.show.type?.toLowerCase() || 'show'} starts in ${timeDiffMinutes} minutes. Please complete your booking quickly.`;
    }
    
    return null; // No warning needed
  }
}