import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ShowService } from '../../services/show.service';
import { ShowReview } from '../../models/show.model';

@Component({
  selector: 'app-user-ratings',
  templateUrl: './user-ratings.component.html',
  styleUrls: ['./user-ratings.component.css']
})
export class UserRatingsComponent implements OnInit {
  ratings: ShowReview[] = [];
  isLoading = true; // Changed from loading to isLoading
  error = '';
  successMessage = '';
  searchQuery = '';
  sortOrder = 'newest';
  ratingFilter = 'all';
  currentPage = 1;
  totalPages = 1;
  itemsPerPage = 10;
  filteredRatings: ShowReview[] = [];
  paginatedRatings: ShowReview[] = [];
  
  // Modal properties
  showEditModal = false;
  currentRating: ShowReview | null = null;
  editRatingForm: FormGroup;

  constructor(
    private showService: ShowService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.editRatingForm = this.fb.group({
      rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      review: ['', [Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    this.loadRatings();
  }

  loadRatings(): void {
    this.isLoading = true;
    this.showService.getUserRatings().subscribe({
      next: (ratings) => {
        this.ratings = ratings;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading ratings:', error);
        this.error = 'Failed to load ratings. Please try again.';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredRatings = this.ratings.filter(rating => {
      // Apply rating filter
      if (this.ratingFilter !== 'all' && rating.rating !== parseInt(this.ratingFilter)) {
        return false;
      }
      
      // Apply search filter
      if (this.searchQuery) {
        const reviewText = rating.review || rating.comment || '';
        if (!reviewText.toLowerCase().includes(this.searchQuery.toLowerCase())) {
          return false;
        }
      }
      
      return true;
    });

    if (this.sortOrder === 'newest') {
      this.filteredRatings.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (this.sortOrder === 'oldest') {
      this.filteredRatings.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
    } else if (this.sortOrder === 'highest') {
      this.filteredRatings.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (this.sortOrder === 'lowest') {
      this.filteredRatings.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    }

    this.totalPages = Math.ceil(this.filteredRatings.length / this.itemsPerPage);
    this.changePage(1);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    const startIndex = (page - 1) * this.itemsPerPage;
    this.paginatedRatings = this.filteredRatings.slice(startIndex, startIndex + this.itemsPerPage);
  }

  getFormattedDate(date: string | Date | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getStarArray(rating: number | undefined): number[] {
    if (rating === undefined) return [];
    return Array(Math.round(rating)).fill(1);
  }
  
  getEmptyStarArray(rating: number | undefined): number[] {
    if (rating === undefined) return Array(5).fill(1);
    return Array(5 - Math.round(rating)).fill(1);
  }
  
  viewShow(showId: number): void {
    if (!showId) {
      console.error('Cannot view show: ID is undefined');
      return;
    }
    this.router.navigate(['/shows', showId]);
  }
  
  openEditModal(rating: ShowReview): void {
    this.currentRating = rating;
    this.editRatingForm.patchValue({
      rating: rating.rating,
      review: rating.review
    });
    this.showEditModal = true;
  }
  
  closeEditModal(): void {
    this.showEditModal = false;
    this.currentRating = null;
  }
  
  updateRating(): void {
    if (this.editRatingForm.invalid || !this.currentRating) return;
    
    const updatedRating = {
      ...this.currentRating,
      rating: this.editRatingForm.value.rating,
      review: this.editRatingForm.value.review
    };
    
    // Ensure id is not undefined
    if (!updatedRating.id) {
      console.error('Cannot update rating: ID is undefined');
      this.error = 'Failed to update rating: ID is missing.';
      return;
    }
    
    this.showService.updateRating(updatedRating.id, updatedRating).subscribe({
      next: () => {
        this.successMessage = 'Rating updated successfully!';
        this.closeEditModal();
        this.loadRatings();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (error) => {
        console.error('Error updating rating:', error);
        this.error = 'Failed to update rating. Please try again.';
      }
    });
  }
  
  deleteRating(ratingId: number | undefined): void {
    if (!ratingId) {
      console.error('Cannot delete rating: ID is undefined');
      this.error = 'Failed to delete rating: ID is missing.';
      return;
    }
    
    if (confirm('Are you sure you want to delete this rating?')) {
      this.showService.deleteRating(ratingId).subscribe({
        next: () => {
          this.successMessage = 'Rating deleted successfully!';
          this.loadRatings();
          setTimeout(() => this.successMessage = '', 5000);
        },
        error: (error) => {
          console.error('Error deleting rating:', error);
          this.error = 'Failed to delete rating. Please try again.';
        }
      });
    }
  }
}