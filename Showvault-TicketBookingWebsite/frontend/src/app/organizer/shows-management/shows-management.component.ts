import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ShowService } from '../../services/show.service';
import { Show, ShowStatus } from '../../models/show.model';
import { interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { ShowStatusAlertComponent } from '../../components/show-status-alert/show-status-alert.component';
import { 
  getScheduleWarning, 
  needsStatusUpdate, 
  determineShowStatus 
} from '../../utils/schedule-validator';

@Component({
  selector: 'app-shows-management',
  templateUrl: './shows-management.component.html',
  styleUrls: ['./shows-management.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ShowStatusAlertComponent]
})
export class ShowsManagementComponent implements OnInit, OnDestroy {
  private alive = true;
  private dataRefreshSubscription: Subscription | null = null;
  private readonly REFRESH_INTERVAL = 30000; // 30 seconds
  
  shows: Show[] = [];
  selectedShow: Show | null = null;
  showForm = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  // Filter form
  filterForm: FormGroup;
  showStatusOptions = ['ALL', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalShows = 0;
  
  // Status management
  showsWithIssues: { show: Show; issues: string[] }[] = [];
  autoStatusUpdateEnabled = true;
  lastStatusCheck = new Date();

  constructor(
    private fb: FormBuilder,
    private showService: ShowService,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      status: ['ALL'],
      search: [''],
      dateFrom: [''],
      dateTo: ['']
    });
  }

  ngOnInit(): void {
    this.loadShows();
    this.setupAutoRefresh();
    this.checkShowsStatus();
  }

  ngOnDestroy(): void {
    this.alive = false;
    if (this.dataRefreshSubscription) {
      this.dataRefreshSubscription.unsubscribe();
    }
  }

  private setupAutoRefresh(): void {
    this.dataRefreshSubscription = interval(this.REFRESH_INTERVAL)
      .pipe(takeWhile(() => this.alive))
      .subscribe(() => {
        this.loadShows();
        if (this.autoStatusUpdateEnabled) {
          this.checkShowsStatus();
        }
      });
  }

  loadShows(): void {
    this.isLoading = true;
    
    // Get filter values
    const filters = {
      status: this.filterForm.value.status !== 'ALL' ? this.filterForm.value.status : undefined,
      search: this.filterForm.value.search || undefined,
      dateFrom: this.filterForm.value.dateFrom || undefined,
      dateTo: this.filterForm.value.dateTo || undefined,
      page: this.currentPage - 1, // API uses 0-based indexing
      pageSize: this.pageSize
    };
    
    this.showService.searchMyShowsByFilters(filters).subscribe({
      next: (response) => {
        if (Array.isArray(response)) {
          this.shows = response;
          this.totalShows = response.length;
        } else {
          this.shows = response.content;
          this.totalShows = response.totalElements;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading my shows:', error);
        this.errorMessage = 'Failed to load your shows. Please try again.';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1; // Reset to first page when applying filters
    this.loadShows();
  }

  resetFilters(): void {
    this.filterForm.reset({
      status: 'ALL',
      search: '',
      dateFrom: '',
      dateTo: ''
    });
    this.currentPage = 1;
    this.loadShows();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadShows();
  }

  onCreateShow(): void {
    this.router.navigate(['/organizer/shows/create']);
  }

  // This method is no longer needed as we're using routerLink directly in the template
  // Keeping it for backward compatibility with any other components that might call it
  onEditShow(show: Show): void {
    if (!show.id) return;
    this.router.navigate(['/organizer/shows/edit', show.id]);
  }

  onDeleteShow(show: Show): void {
    if (!show.id) return;
    
    if (confirm(`Are you sure you want to delete ${show.title}?`)) {
      this.isLoading = true;
      
      // First attempt to delete without force flag
      this.showService.deleteShow(show.id).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          
          // Show has been successfully deleted/cancelled
          this.successMessage = `Show "${show.title}" has been cancelled successfully.`;
          this.loadShows();
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          this.isLoading = false;
          
          // Check if this is a conflict due to active bookings
          if (error.status === 409 && error.error && error.error.requiresConfirmation) {
            const activeBookings = error.error.activeBookings || 0;
            
            // Ask for confirmation to proceed with deletion despite active bookings
            const confirmForce = confirm(
              `This show has ${activeBookings} active booking(s). Deleting it will cancel all bookings and process refunds. Do you want to proceed?`
            );
            
            if (confirmForce) {
              // Get reason for cancellation
              const reason = prompt('Please provide a reason for cancellation:', 'Show cancelled by organizer');
              
              if (reason !== null) {
                this.isLoading = true;
                
                // Call delete with force=true and the provided reason
                this.showService.deleteShow(show.id!, true, reason).subscribe({
                  next: () => {
                    this.isLoading = false;
                    this.successMessage = `Show "${show.title}" has been cancelled and ${activeBookings} booking(s) have been processed for refunds.`;
                    this.loadShows();
                    
                    // Clear success message after 5 seconds
                    setTimeout(() => {
                      this.successMessage = '';
                    }, 5000);
                  },
                  error: (forceError) => {
                    this.isLoading = false;
                    console.error('Error force deleting show:', forceError);
                    this.errorMessage = `Failed to cancel show "${show.title}". Please try again.`;
                  }
                });
              }
            }
          } else {
            // Handle other errors
            console.error('Error deleting show:', error);
            this.errorMessage = `Failed to delete show "${show.title}". Please try again.`;
          }
        }
      });
    }
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
  
  getShowDate(show: Show): string {
    // First check if the show has a direct date property
    if (show.date) {
      return this.formatDate(show.date);
    }
    
    // If not, check if it has schedules and get the earliest date
    if (show.schedules && show.schedules.length > 0) {
      // Sort schedules by date and return the earliest
      const sortedSchedules = [...show.schedules].sort((a, b) => {
        return new Date(a.showDate).getTime() - new Date(b.showDate).getTime();
      });
      
      return this.formatDate(sortedSchedules[0].showDate);
    }
    
    return 'N/A';
  }
  
  getShowVenue(show: Show): string {
    // First check if the show has a direct venue property
    if (show.venue && typeof show.venue === 'string') {
      return show.venue;
    }
    
    // If not, check if it has schedules and get the venue from the first schedule
    if (show.schedules && show.schedules.length > 0) {
      const venue = show.schedules[0].venue;
      if (venue) {
        return venue.name || 'N/A';
      }
    }
    
    return 'N/A';
  }

  getShowStatusClass(status: string | undefined): string {
    if (!status) return 'bg-secondary';
    
    switch (status.toUpperCase()) {
      case 'UPCOMING':
        return 'bg-info';
      case 'ONGOING':
        return 'bg-success';
      case 'COMPLETED':
        return 'bg-secondary';
      case 'CANCELLED':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  getTotalPages(): number {
    return Math.ceil(this.totalShows / this.pageSize);
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    if (this.currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }
    
    if (this.currentPage >= totalPages - 2) {
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    
    return [this.currentPage - 2, this.currentPage - 1, this.currentPage, this.currentPage + 1, this.currentPage + 2];
  }

  /**
   * Check for shows that need attention
   */
  checkShowsStatus(): void {
    this.showService.getShowsNeedingAttention().subscribe({
      next: (showsWithIssues) => {
        this.showsWithIssues = showsWithIssues;
        this.lastStatusCheck = new Date();
        
        if (showsWithIssues.length > 0) {
          console.log(`Found ${showsWithIssues.length} shows needing attention:`, showsWithIssues);
        }
      },
      error: (error) => {
        console.error('Error checking shows status:', error);
      }
    });
  }

  /**
   * Get warning message for a specific show
   */
  getShowWarning(show: Show): string | null {
    return getScheduleWarning(show);
  }

  /**
   * Check if a show needs status update
   */
  showNeedsStatusUpdate(show: Show): boolean {
    return needsStatusUpdate(show);
  }

  /**
   * Get suggested status for a show
   */
  getSuggestedStatus(show: Show): ShowStatus {
    return determineShowStatus(show);
  }

  /**
   * Handle status update request from alert component
   */
  onStatusUpdateRequested(event: { show: Show; newStatus: ShowStatus }): void {
    if (!event.show.id) return;

    const confirmMessage = `Update "${event.show.title}" status to ${event.newStatus}?`;
    if (confirm(confirmMessage)) {
      this.isLoading = true;
      
      this.showService.updateShowStatus(event.show.id, event.newStatus).subscribe({
        next: () => {
          this.successMessage = `Show "${event.show.title}" status updated to ${event.newStatus}`;
          this.loadShows();
          this.checkShowsStatus();
          this.isLoading = false;
          
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          console.error('Error updating show status:', error);
          this.errorMessage = `Failed to update show status. Please try again.`;
          this.isLoading = false;
        }
      });
    }
  }

  /**
   * Handle schedule management request from alert component
   */
  onScheduleManagementRequested(show: Show): void {
    if (show.id) {
      this.router.navigate(['/organizer/shows', show.id, 'schedules']);
    }
  }

  /**
   * Batch update all shows that need status updates
   */
  batchUpdateShowStatuses(): void {
    const showsNeedingUpdate = this.shows.filter(show => needsStatusUpdate(show));
    
    if (showsNeedingUpdate.length === 0) {
      this.errorMessage = 'No shows need status updates.';
      return;
    }

    const confirmMessage = `Update status for ${showsNeedingUpdate.length} show(s)?`;
    if (confirm(confirmMessage)) {
      this.isLoading = true;
      
      this.showService.batchUpdateShowStatuses(showsNeedingUpdate).subscribe({
        next: (result) => {
          const { updated, failed } = result;
          
          if (updated.length > 0) {
            this.successMessage = `Successfully updated ${updated.length} show(s).`;
          }
          
          if (failed.length > 0) {
            this.errorMessage = `Failed to update ${failed.length} show(s).`;
          }
          
          this.loadShows();
          this.checkShowsStatus();
          this.isLoading = false;
          
          setTimeout(() => {
            this.successMessage = '';
            this.errorMessage = '';
          }, 5000);
        },
        error: (error) => {
          console.error('Error batch updating show statuses:', error);
          this.errorMessage = 'Failed to update show statuses. Please try again.';
          this.isLoading = false;
        }
      });
    }
  }

  /**
   * Get count of shows needing attention
   */
  getShowsNeedingAttentionCount(): number {
    return this.shows.filter(show => {
      const warning = getScheduleWarning(show);
      const needsUpdate = needsStatusUpdate(show);
      return warning || needsUpdate;
    }).length;
  }

  /**
   * Toggle auto status update feature
   */
  toggleAutoStatusUpdate(): void {
    this.autoStatusUpdateEnabled = !this.autoStatusUpdateEnabled;
    
    if (this.autoStatusUpdateEnabled) {
      this.checkShowsStatus();
    }
  }
}