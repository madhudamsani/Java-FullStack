import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ShowService } from '../../services/show.service';
import { ImageService } from '../../services/image.service';
import { Show } from '../../models/show.model';
import { parseISO, format, isPast } from 'date-fns';

@Component({
  selector: 'app-user-favorites',
  templateUrl: './user-favorites.component.html',
  styleUrls: ['./user-favorites.component.css']
})
export class UserFavoritesComponent implements OnInit {
  favorites: Show[] = [];
  isLoading = true; // Changed from loading to isLoading to match template usage
  error = '';
  successMessage = '';
  searchQuery = '';
  categoryFilter = 'all';
  sortOrder = 'newest';
  currentPage = 1;
  totalPages = 1;
  itemsPerPage = 12;
  filteredFavorites: Show[] = [];
  paginatedFavorites: Show[] = [];

  constructor(
    private showService: ShowService,
    private imageService: ImageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
  }

  loadFavorites(): void {
    this.isLoading = true;
    this.showService.getUserFavorites().subscribe({
      next: (shows) => {
        this.favorites = shows;
        
        // Enhance images for all shows
        this.favorites.forEach(show => {
          if (show.title) {
            this.imageService.getSpecificMovieImage(
              show.title,
              show.type || 'Show',
              show.genre || '',
              show.posterUrl || show.imageUrl || show.image || ''
            ).subscribe(imageUrl => {
              // Set all image properties for consistency
              show.imageUrl = imageUrl;
              show.image = imageUrl;
              show.posterUrl = imageUrl;
            });
          }
        });
        
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading favorites:', error);
        this.error = 'Failed to load favorite shows. Please try again.';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredFavorites = this.favorites.filter(show => {
      const matchesSearch = !this.searchQuery || 
        show.title.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesCategory = this.categoryFilter === 'all' || 
        show.category === this.categoryFilter;
      return matchesSearch && matchesCategory;
    });

    if (this.sortOrder === 'newest') {
      this.filteredFavorites.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (this.sortOrder === 'oldest') {
      this.filteredFavorites.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
    }

    this.totalPages = Math.ceil(this.filteredFavorites.length / this.itemsPerPage);
    this.changePage(1);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    const startIndex = (page - 1) * this.itemsPerPage;
    this.paginatedFavorites = this.filteredFavorites.slice(startIndex, startIndex + this.itemsPerPage);
  }

  removeFromFavorites(showId: number): void {
    this.showService.removeFromFavorites(showId).subscribe({
      next: () => {
        this.favorites = this.favorites.filter(show => show.id !== showId);
        this.successMessage = 'Show removed from favorites successfully.';
        this.applyFilters();
      },
      error: (error) => {
        console.error('Error removing from favorites:', error);
        this.error = 'Failed to remove show from favorites. Please try again.';
      }
    });
  }

  bookShow(showId: number): void {
    this.router.navigate(['/booking', showId]);
  }

  viewShowDetails(showId: number): void {
    this.router.navigate(['/shows', showId]);
  }

  isShowInPast(date: string | Date | undefined): boolean {
    if (!date) return false;
    return isPast(typeof date === 'string' ? parseISO(date) : date);
  }

  getFormattedDate(date: string | Date | undefined): string {
    if (!date) return '';
    return format(typeof date === 'string' ? parseISO(date) : date, 'MMM d, yyyy');
  }

  /**
   * Get image URL with fallback to appropriate default image
   * @param imageUrl The original image URL
   * @param type The type of content (show, movie, concert, etc.)
   * @param subType Optional subtype for more specific images (action, rock, ballet, etc.)
   * @param title Optional title for searching specific content images
   * @returns A valid image URL
   */
  getImageUrl(imageUrl: string | undefined | null, type: string = 'show', subType: string = '', title: string = ''): string {
    return this.imageService.getImageUrl(imageUrl, type, subType, title);
  }
}