import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ShowService } from '../../services/show.service';
import { Show, ShowFilter, ShowsResponse } from '../../models/show.model';
import { ImageService } from '../../services/image.service';
import { environment } from '../../../environments/environment';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-shows-list',
  templateUrl: './shows-list.component.html',
  styleUrls: ['./shows-list.component.css']
})
export class ShowsListComponent implements OnInit {
  shows: Show[] = [];
  totalShows: number = 0;
  categories: any[] = [];
  filter: ShowFilter = {};
  loading = false;
  error = '';
  searchQuery = '';
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  
  // Form Controls
  dateFromControl = new FormControl('');
  dateToControl = new FormControl('');
  priceMinControl = new FormControl('');
  priceMaxControl = new FormControl('');
  sortOption = 'date';
  selectedCategory = 'all';

  SHOW_STATUS_METADATA = {
    UPCOMING: { label: 'Upcoming', color: 'primary' },
    ONGOING: { label: 'Ongoing', color: 'success' },
    ENDED: { label: 'Ended', color: 'secondary' }
  };

  constructor(
    private showService: ShowService,
    private imageService: ImageService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    // Check for URL parameters
    this.route.queryParams.subscribe(params => {
      if (params['category']) {
        this.selectedCategory = params['category'];
      }
      if (params['search']) {
        this.searchQuery = params['search'];
      }
      if (params['type']) {
        // If type is directly specified, map it to the corresponding category
        const type = params['type'].toLowerCase();
        if (type === 'movie') {
          this.selectedCategory = 'movies';
        } else if (type === 'concert') {
          this.selectedCategory = 'concerts';
        } else if (type === 'theater') {
          this.selectedCategory = 'theater';
        } else if (type === 'event') {
          this.selectedCategory = 'events';
        }
      }
      
      this.loadShows();
    });
    
    this.loadCategories();
  }

  hasActiveFilters(): boolean {
    return this.selectedCategory !== 'all' ||
           !!this.searchQuery ||
           !!this.dateFromControl.value ||
           !!this.dateToControl.value ||
           !!this.priceMinControl.value ||
           !!this.priceMaxControl.value;
  }
  
  selectCategory(value: string): void {
    this.selectedCategory = value;
    this.loadShows();
  }
  
  handleSearch(): void {
    this.loadShows();
  }
  
  formatDate(date: string | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
    
    return '';
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
        return venue.name || 'TBA';
      }
    }
    
    return 'TBA';
  }

  getImageUrl(imageUrl: string | null, type: string, subType: string = '', title: string = ''): string {
    return this.imageService.getImageUrl(imageUrl, type, subType, title);
  }
  
  /**
   * Get a specific movie image by title
   * @param show The show object
   * @returns Observable with the image URL
   */
  enhanceShowImage(show: Show): void {
    if (!environment.production) {
      console.debug(`Enhancing image for show: ${show.title} (type: ${show.type})`);
    }
    
    // Sanitize existing URLs first
    const existingUrl = this.sanitizeImageUrl(show.posterUrl || show.imageUrl || show.image || '');
    
    // Always try to get a specific movie poster, regardless of current image state
    this.imageService.getSpecificMovieImage(
      show.title, 
      show.type || 'Show', 
      show.genre || '', 
      existingUrl || ''
    ).subscribe(imageUrl => {
      if (!environment.production) {
        console.debug(`Setting image URL for ${show.title} to: ${imageUrl}`);
      }
      // Set all image properties for consistency
      show.imageUrl = imageUrl;
      show.image = imageUrl;
      show.posterUrl = imageUrl;
    });
  }
  
  /**
   * Sanitize image URLs to prevent security issues and fix common URL problems
   * @param url The image URL to sanitize
   * @returns A safe URL string or null if the URL is invalid
   */
  sanitizeImageUrl(url: string | undefined | null): string | null {
    if (!url) return null;
    
    // Remove file:/// URLs which can't be loaded due to security restrictions
    if (url.startsWith('file:///')) {
      // Return a default image instead of null
      return this.getImageUrl(null, 'show');
    }
    
    // Check for known problematic domains and replace with defaults
    if (url.includes('assets-in.bmscdn.com')) {
      // For BookMyShow URLs that are failing, use a default image based on show type
      const show = this.shows.find(s => 
        s.posterUrl === url || s.imageUrl === url || s.image === url
      );
      return this.getImageUrl(null, show?.type || 'show', show?.genre || '');
    }
    
    // Add https:// to URLs that are missing the protocol
    if (!url.startsWith('http://') && !url.startsWith('https://') && 
        (url.includes('.com/') || url.includes('.org/') || 
         url.includes('.net/') || url.includes('.io/'))) {
      url = 'https://' + url;
    }
    
    // Return the sanitized URL
    return url;
  }

  getPriceFilterLabel(): string {
    const min = this.priceMinControl.value;
    const max = this.priceMaxControl.value;
    if (min && max) return `₹${min} - ₹${max}`;
    if (min) return `₹${min}+`;
    if (max) return `Up to ₹${max}`;
    return 'All prices';
  }

  getDateFilterLabel(): string {
    const from = this.dateFromControl.value;
    const to = this.dateToControl.value;
    if (from && to) return `${from} to ${to}`;
    if (from) return `From ${from}`;
    if (to) return `Until ${to}`;
    return 'All dates';
  }

  getCategoryLabel(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  getTruncatedDescription(description: string): string {
    return description.length > 100 ? description.slice(0, 97) + '...' : description;
  }

  getPrice(show: Show): string {
    // Return price in Indian Rupees (₹) with no decimal places
    if (show.price !== undefined && show.price !== null) {
      // Only log in development mode
      if (!environment.production) {
        console.debug(`Show ${show.title} price: ${show.price}`);
      }
      return show.price.toFixed(0);
    }
    
    // If show has schedules with prices, use the minimum price
    if (show.schedules && show.schedules.length > 0) {
      const prices = show.schedules
        .filter(schedule => schedule.basePrice !== undefined && schedule.basePrice !== null)
        .map(schedule => schedule.basePrice);
      
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        if (!environment.production) {
          console.debug(`Show ${show.title} min schedule price: ${minPrice}`);
        }
        return minPrice.toFixed(0);
      }
    }
    
    // Default fallback price
    if (!environment.production) {
      console.debug(`Show ${show.title} using default price`);
    }
    return '250';
  }

  getPaginationArray(): number[] {
    return Array.from({length: this.totalPages}, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadShows();
    }
  }

  applyFilter(category: string): void {
    this.selectedCategory = category;
    this.loadShows();
  }

  applyDateFilter(): void {
    this.loadShows();
  }

  applyPriceFilter(): void {
    this.loadShows();
  }

  applySorting(): void {
    this.loadShows();
  }

  clearDateFilter(): void {
    this.dateFromControl.reset();
    this.dateToControl.reset();
    this.loadShows();
  }

  clearPriceFilter(): void {
    this.priceMinControl.reset();
    this.priceMaxControl.reset();
    this.loadShows();
  }

  clearCategoryFilter(): void {
    this.selectedCategory = 'all';
    this.loadShows();
  }

  clearSearchFilter(): void {
    this.searchQuery = '';
    this.loadShows();
  }

  resetAllFilters(): void {
    this.selectedCategory = 'all';
    this.searchQuery = '';
    this.dateFromControl.reset();
    this.dateToControl.reset();
    this.priceMinControl.reset();
    this.priceMaxControl.reset();
    this.sortOption = 'date';
    this.loadShows();
  }

  retryLoading(): void {
    this.error = '';
    this.loadShows();
  }

  loadShows() {
    this.loading = true;
    
    // Build filter object
    this.filter = {
      search: this.searchQuery,
      page: this.currentPage - 1,
      pageSize: 50, // Increase page size to show more results
      excludeStatus: 'CANCELLED' // Always exclude cancelled shows
    };
    
    // Add category filter
    if (this.selectedCategory !== 'all') {
      // Map category names to the corresponding type value expected by the backend
      if (this.selectedCategory === 'movies') {
        this.filter['type'] = 'Movie';
      } else if (this.selectedCategory === 'concerts') {
        this.filter['type'] = 'Concert';
      } else if (this.selectedCategory === 'theater') {
        this.filter['type'] = 'Theatrical';
      } else if (this.selectedCategory === 'events') {
        this.filter['type'] = 'Event';
      } else if (this.selectedCategory === 'sports') {
        this.filter['genre'] = 'Sports';
      } else {
        // For other categories, use the original value
        this.filter['category'] = this.selectedCategory;
      }
    }
    
    // Log the filter being applied (only in development)
    if (!environment.production) {
      console.debug('Applied filter:', this.filter);
    }
    
    // Add date filters
    if (this.dateFromControl.value) {
      this.filter.dateFrom = this.dateFromControl.value;
    }
    if (this.dateToControl.value) {
      this.filter.dateTo = this.dateToControl.value;
    }
    
    // Add price filters
    if (this.priceMinControl.value) {
      this.filter.priceMin = parseFloat(this.priceMinControl.value);
    }
    if (this.priceMaxControl.value) {
      this.filter.priceMax = parseFloat(this.priceMaxControl.value);
    }
    
    // Add sorting
    if (this.sortOption) {
      this.filter.sort = this.sortOption;
    }
    
    if (!environment.production) {
      console.debug('Applying filter:', this.filter);
    }
    
    this.showService.searchShowsByFilters(this.filter).subscribe({
      next: (response: ShowsResponse) => {
        // Filter out any CANCELLED shows client-side as well
        this.shows = response.content.filter(show => show.status !== 'CANCELLED');
        
        // Log the number of shows after filtering (only in development)
        if (!environment.production) {
          console.debug(`Shows after filtering out CANCELLED: ${this.shows.length} of ${response.content.length}`);
        }
        
        // Enhance images for all shows
        if (this.shows.length > 0) {
          if (!environment.production) {
            console.debug('Enhancing images for shows...');
          }
          this.shows.forEach(show => {
            this.enhanceShowImage(show);
          });
          
          // Debug: Log the first few shows to check their price values (only in development)
          if (!environment.production) {
            console.debug('First 3 shows with prices:');
            this.shows.slice(0, 3).forEach(show => {
              console.debug(`Show: ${show.title}, Price: ${show.price}, Type: ${typeof show.price}`);
              if (show.schedules && show.schedules.length > 0) {
                console.debug(`  First schedule price: ${show.schedules[0].basePrice}, Type: ${typeof show.schedules[0].basePrice}`);
              }
            });
          }
        }
        
        this.totalShows = response.totalElements;
        this.totalPages = response.totalPages || Math.ceil(response.totalElements / 12);
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load shows';
        this.loading = false;
        console.error(error);
      }
    });
  }

  loadCategories() {
    // First, add the standard show types
    this.categories = ['all', 'movies', 'concerts', 'theater', 'events', 'sports'];
    
    // Then fetch additional genre-based categories from the backend
    this.showService.getCategories().subscribe({
      next: (categories) => {
        if (!environment.production) {
          console.debug('Loaded categories from backend:', categories);
        }
        // Add any additional categories that aren't already in our list
        categories.forEach(category => {
          if (!this.categories.includes(category.toLowerCase())) {
            this.categories.push(category.toLowerCase());
          }
        });
        if (!environment.production) {
          console.debug('Final categories list:', this.categories);
        }
      },
      error: (error) => {
        console.error('Error loading additional categories:', error);
      }
    });
    
    // Also get the show types directly from the service
    const showTypes = this.showService.getShowTypes();
    if (!environment.production) {
      console.debug('Available show types:', showTypes);
    }
  }
}