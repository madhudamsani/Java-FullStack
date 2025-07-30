import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ShowService } from '../../services/show.service';
import { Show } from '../../models/show.model';
import { ShowSchedule, Venue } from '../../models/show-interfaces.model';

@Component({
  selector: 'app-booking',
  template: `
  <div class="booking-container">
    <div *ngIf="loading" class="loading-container">
      <div class="spinner"></div>
      <p>Loading show details...</p>
    </div>

    <div *ngIf="!loading && error" class="error-container">
      <div class="alert alert-danger">
        {{ error }}
      </div>
      <button class="btn btn-primary" (click)="goBack()">Go Back</button>
    </div>

    <div *ngIf="!loading && !error && show" class="show-details">
      <h2>{{ show.title }}</h2>
      <div *ngIf="schedule" class="schedule-info">
        <p><strong>Date:</strong> {{ schedule.showDate | date }}</p>
        <p><strong>Time:</strong> {{ schedule.showTime }}</p>
        <p><strong>Venue:</strong> {{ schedule.venue.name }}</p>
        <p><strong>Tickets:</strong> {{ quantity }}</p>
        <p><strong>Price:</strong> {{ schedule.basePrice | currency }}</p>
      </div>
      
      <!-- This component automatically redirects to seat selection, 
           but we'll add a button just in case -->
      <div class="actions">
        <button class="btn btn-secondary" (click)="goBack()">Back</button>
      </div>
    </div>
  </div>
  `,
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit {
  showId: number | null = null;
  scheduleId: number | null = null;
  quantity: number = 1;
  show: Show | null = null;
  schedule: ShowSchedule | null = null;
  loading: boolean = true;
  error: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private showService: ShowService
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.showId = params['showId'] ? Number(params['showId']) : null;
      this.scheduleId = params['scheduleId'] ? Number(params['scheduleId']) : null;
      this.quantity = params['quantity'] ? Number(params['quantity']) : 1;
      
      if (this.showId) {
        this.loadShowDetails();
      } else {
        this.error = 'Missing show information';
        this.loading = false;
      }
    });
  }

  loadShowDetails(): void {
    if (!this.showId) return;
    
    console.log(`Loading show details for showId: ${this.showId}, scheduleId: ${this.scheduleId}`);
    
    this.showService.getShowById(this.showId).subscribe({
      next: (show) => {
        this.show = show;
        console.log('Show details loaded:', show);
        
        // Try to find the schedule
        if (this.scheduleId && show.schedules && show.schedules.length > 0) {
          this.schedule = show.schedules.find(s => s.id === this.scheduleId) || null;
          console.log('Found schedule:', this.schedule);
        } else {
          console.log('No schedules found or scheduleId not provided');
          
          // If no schedule found but we have a scheduleId, create a default schedule
          if (this.scheduleId && (!show.schedules || !this.schedule)) {
            console.log('Creating default schedule for scheduleId:', this.scheduleId);
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
              id: this.scheduleId,
              showId: this.showId || 0, // Use 0 as a fallback if showId is null
              showDate: show.date || new Date().toISOString().split('T')[0],
              showTime: show.time || '19:00',
              venue: defaultVenue,
              basePrice: show.price || 250,
              status: 'SCHEDULED',
              availableSeats: show.availableSeats || 100,
              totalSeats: show.totalSeats || 100
            };
          }
        }
        
        this.loading = false;
        
        // If we have all the information, proceed to seat selection
        if (this.show) {
          console.log('Navigating to seat selection with:', {
            showId: this.showId || 0,
            scheduleId: this.scheduleId || 0,
            quantity: this.quantity
          });
          
          this.router.navigate(['/booking/seat-selection'], {
            queryParams: {
              showId: this.showId || 0,
              scheduleId: this.scheduleId || 0,
              quantity: this.quantity
            }
          });
        }
      },
      error: (error) => {
        console.error('Error loading show details:', error);
        this.error = 'Failed to load show details. Please try again.';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    if (this.showId) {
      this.router.navigate(['/shows', this.showId]);
    } else {
      this.router.navigate(['/shows']);
    }
  }
}