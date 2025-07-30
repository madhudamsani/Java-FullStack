import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SeatConsistencyService } from '../../services/seat-consistency.service';

@Component({
  selector: 'app-database-maintenance',
  templateUrl: './database-maintenance.component.html',
  styleUrls: ['./database-maintenance.component.css']
})
export class DatabaseMaintenanceComponent implements OnInit {
  isLoading = false;
  isLoadingStats = false;
  message = '';
  error = '';
  success = false;
  
  // Database statistics
  stats: any = null;
  
  constructor(
    private http: HttpClient,
    private seatConsistencyService: SeatConsistencyService
  ) { }

  ngOnInit(): void {
    this.loadDatabaseStats();
  }
  
  /**
   * Loads database statistics from the backend
   */
  loadDatabaseStats(): void {
    this.isLoadingStats = true;
    
    this.http.get<any>(`${environment.apiUrl}/admin/database/stats`)
      .subscribe({
        next: (response) => {
          this.isLoadingStats = false;
          this.stats = response;
          console.log('Database statistics loaded:', this.stats);
        },
        error: (error) => {
          this.isLoadingStats = false;
          console.error('Error loading database statistics:', error);
        }
      });
  }

  /**
   * Triggers the seat count consistency check on the backend
   */
  fixSeatCounts(): void {
    this.isLoading = true;
    this.message = 'Running seat count consistency check...';
    this.error = '';
    this.success = false;

    this.http.post<any>(`${environment.apiUrl}/admin/database/fix-seat-counts`, {})
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.success = response.success;
          this.message = response.message;
          
          if (response.success) {
            console.log('Seat count consistency check completed successfully');
            // Reload database statistics after fixing issues
            this.loadDatabaseStats();
          } else {
            this.error = response.error || 'Unknown error';
            console.error('Error during seat count consistency check:', this.error);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.success = false;
          this.message = 'Failed to run seat count consistency check';
          this.error = error.message || 'Unknown error';
          console.error('Error during seat count consistency check:', error);
        }
      });
  }
  
  /**
   * Returns true if there are any database inconsistencies
   */
  hasInconsistencies(): boolean {
    if (!this.stats) return false;
    
    return (
      (this.stats.venuesWithoutSeats && this.stats.venuesWithoutSeats.length > 0) ||
      (this.stats.venueCapacityMismatches && this.stats.venueCapacityMismatches.length > 0) ||
      (this.stats.scheduleTotalSeatsMismatches && this.stats.scheduleTotalSeatsMismatches.length > 0)
    );
  }
}