import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ShowService } from '../../services/show.service';
import { Show, ShowStatus, SHOW_STATUS_METADATA } from '../../models/show.model';

@Component({
  selector: 'app-show-management',
  templateUrl: './show-management.component.html',
  styleUrls: ['./show-management.component.css']
})
export class ShowManagementComponent implements OnInit {
  shows: Show[] = [];
  filteredShows: Show[] = [];
  selectedShow: Show | null = null;
  showForm: FormGroup;
  isLoading = false;
  isEditing = false;
  isAddingShow = false;
  error = '';
  success = '';
  searchTerm = '';
  statusFilter = '';
  typeFilter = '';
  
  // For pagination
  currentPage = 1;
  pageSize = 10;
  totalShows = 0;
  
  // Show status metadata for UI display
  showStatusMetadata = SHOW_STATUS_METADATA;
  
  // Show types for dropdown
  showTypes = [
    { value: 'Movie', label: 'Movie' },
    { value: 'Theatrical', label: 'Theatrical' },
    { value: 'Concert', label: 'Concert' },
    { value: 'Event', label: 'Event' },
    { value: 'Other', label: 'Other' }
  ];
  
  // Show statuses for dropdown
  showStatuses = Object.values(ShowStatus).map(status => ({
    value: status,
    label: SHOW_STATUS_METADATA[status].displayName,
    color: SHOW_STATUS_METADATA[status].color
  }));

  constructor(
    private showService: ShowService,
    private fb: FormBuilder
  ) {
    this.showForm = this.createShowForm();
  }

  ngOnInit(): void {
    this.loadShows();
  }

  createShowForm(): FormGroup {
    return this.fb.group({
      id: [null],
      title: ['', [Validators.required, Validators.minLength(3)]],
      type: ['Movie', Validators.required],
      description: [''],
      posterUrl: [''],
      trailerUrl: [''],
      duration: [null],
      genre: [''],
      language: [''],
      status: [ShowStatus.DRAFT, Validators.required]
    });
  }

  loadShows(): void {
    this.isLoading = true;
    this.error = '';
    
    this.showService.getAllShows().subscribe({
      next: (shows) => {
        this.shows = shows;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load shows. Please try again.';
        this.isLoading = false;
        console.error('Error loading shows:', err);
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.shows];
    
    // Apply search filter
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(show => 
        show.title.toLowerCase().includes(search) || 
        (show.description && show.description.toLowerCase().includes(search))
      );
    }
    
    // Apply status filter
    if (this.statusFilter) {
      filtered = filtered.filter(show => show.status === this.statusFilter);
    }
    
    // Apply type filter
    if (this.typeFilter) {
      filtered = filtered.filter(show => show.type === this.typeFilter);
    }
    
    this.totalShows = filtered.length;
    
    // Apply pagination
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.filteredShows = filtered.slice(startIndex, startIndex + this.pageSize);
  }

  onSearch(): void {
    this.currentPage = 1; // Reset to first page when searching
    this.applyFilters();
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter = status;
    this.currentPage = 1;
    this.applyFilters();
  }

  onTypeFilterChange(type: string): void {
    this.typeFilter = type;
    this.currentPage = 1;
    this.applyFilters();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyFilters();
  }

  editShow(show: Show): void {
    this.selectedShow = show;
    this.isEditing = true;
    this.showForm.patchValue({
      id: show.id,
      title: show.title,
      type: show.type,
      description: show.description || '',
      posterUrl: show.posterUrl || '',
      trailerUrl: show.trailerUrl || '',
      duration: show.duration || null,
      genre: show.genre || '',
      language: show.language || '',
      status: show.status
    });
  }

  createNewShow(): void {
    this.selectedShow = null;
    this.isEditing = false;
    this.isAddingShow = true;
    this.showForm.reset({
      status: ShowStatus.DRAFT,
      type: 'Movie'
    });
  }

  cancelEdit(): void {
    this.selectedShow = null;
    this.isEditing = false;
    this.isAddingShow = false;
    this.showForm.reset({
      status: ShowStatus.DRAFT,
      type: 'Movie'
    });
  }

  saveShow(): void {
    if (this.showForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.showForm.controls).forEach(key => {
        const control = this.showForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.error = '';
    this.success = '';
    
    const showData: Show = this.showForm.value;
    
    if (this.isEditing && showData.id) {
      // Update existing show
      this.showService.updateShow(showData.id, showData).subscribe({
        next: (updatedShow) => {
          this.success = `Show "${updatedShow.title}" updated successfully.`;
          this.isLoading = false;
          this.cancelEdit();
          this.loadShows();
        },
        error: (err) => {
          this.error = 'Failed to update show. Please try again.';
          this.isLoading = false;
          console.error('Error updating show:', err);
        }
      });
    } else {
      // Create new show
      this.showService.createShow(showData).subscribe({
        next: (newShow) => {
          this.success = `Show "${newShow.title}" created successfully.`;
          this.isLoading = false;
          this.cancelEdit();
          this.loadShows();
        },
        error: (err) => {
          this.error = 'Failed to create show. Please try again.';
          this.isLoading = false;
          console.error('Error creating show:', err);
        }
      });
    }
  }

  deleteShow(show: Show): void {
    if (!confirm(`Are you sure you want to delete "${show.title}"?`)) {
      return;
    }
    
    this.isLoading = true;
    this.error = '';
    
    this.showService.deleteShow(show.id!, false, undefined, show).subscribe({
      next: () => {
        this.success = `Show "${show.title}" deleted successfully.`;
        this.isLoading = false;
        this.loadShows();
      },
      error: (err) => {
        this.isLoading = false;
        
        // Handle 409 conflict - show has active bookings
        if (err.status === 409 && err.error?.requiresConfirmation) {
          const bookingsCount = err.error.activeBookingsCount;
          const confirmMessage = this.getDeleteConfirmationMessage(show, bookingsCount);
          
          if (confirm(confirmMessage)) {
            // User confirmed, delete with force flag
            this.forceDeleteShow(show);
          }
          return;
        }
        
        this.error = 'Failed to delete show. Please try again.';
        console.error('Error deleting show:', err);
      }
    });
  }

  private forceDeleteShow(show: Show): void {
    this.isLoading = true;
    this.error = '';
    
    this.showService.deleteShow(show.id!, true, undefined, show).subscribe({
      next: () => {
        this.success = this.getDeleteSuccessMessage(show);
        this.isLoading = false;
        this.loadShows();
      },
      error: (err) => {
        this.error = 'Failed to delete show. Please try again.';
        this.isLoading = false;
        console.error('Error force deleting show:', err);
      }
    });
  }

  updateShowStatus(show: Show, status: ShowStatus): void {
    this.isLoading = true;
    this.error = '';
    
    this.showService.updateShowStatus(show.id!, status).subscribe({
      next: () => {
        this.success = `Show "${show.title}" status updated to ${SHOW_STATUS_METADATA[status].displayName}.`;
        this.isLoading = false;
        this.loadShows();
      },
      error: (err) => {
        this.error = 'Failed to update show status. Please try again.';
        this.isLoading = false;
        console.error('Error updating show status:', err);
      }
    });
  }

  getStatusBadgeClass(status: ShowStatus): string {
    const metadata = SHOW_STATUS_METADATA[status];
    return `badge bg-${metadata.color}`;
  }

  getTotalPages(): number {
    return Math.ceil(this.totalShows / this.pageSize);
  }

  getPages(): number[] {
    const totalPages = this.getTotalPages();
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  private getDeleteConfirmationMessage(show: Show, bookingsCount: number): string {
    const baseMessage = `This show has ${bookingsCount} active booking(s).`;
    
    switch (show.status) {
      case ShowStatus.COMPLETED:
        return `${baseMessage} Since this show has already completed, deleting it will NOT process refunds (customers already attended the show).\n\nAre you sure you want to continue?`;
      
      case ShowStatus.CANCELLED:
        return `${baseMessage} Since this show was already cancelled, deleting it will NOT process additional refunds.\n\nAre you sure you want to continue?`;
      
      case ShowStatus.UPCOMING:
      case ShowStatus.ONGOING:
        return `${baseMessage} Deleting it will cancel these bookings and WILL process full refunds to customers.\n\nAre you sure you want to continue?`;
      
      case ShowStatus.SUSPENDED:
        return `${baseMessage} Since this show is suspended, deleting it will process partial refunds based on your refund policy.\n\nAre you sure you want to continue?`;
      
      case ShowStatus.DRAFT:
        return `${baseMessage} Since this show is still in draft, deleting it will process full refunds.\n\nAre you sure you want to continue?`;
      
      default:
        return `${baseMessage} Deleting it will cancel these bookings and may process refunds.\n\nAre you sure you want to continue?`;
    }
  }

  private getDeleteSuccessMessage(show: Show): string {
    switch (show.status) {
      case ShowStatus.COMPLETED:
        return `Show "${show.title}" deleted successfully. No refunds processed (show was completed).`;
      
      case ShowStatus.CANCELLED:
        return `Show "${show.title}" deleted successfully. No additional refunds processed (show was already cancelled).`;
      
      case ShowStatus.UPCOMING:
      case ShowStatus.ONGOING:
        return `Show "${show.title}" deleted successfully. Full refunds have been processed for all bookings.`;
      
      case ShowStatus.SUSPENDED:
        return `Show "${show.title}" deleted successfully. Partial refunds processed based on policy.`;
      
      case ShowStatus.DRAFT:
        return `Show "${show.title}" deleted successfully. Full refunds processed for any bookings.`;
      
      default:
        return `Show "${show.title}" deleted successfully (including active bookings).`;
    }
  }
}
