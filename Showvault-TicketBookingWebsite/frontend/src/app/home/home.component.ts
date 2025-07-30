import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ShowService } from '../services/show.service';
import { AuthService } from '../services/auth.service';
import { ImageService } from '../services/image.service';
import { PromotionService } from '../services/promotion.service';
import { Show } from '../models/show.model';
import { finalize, map } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
declare var bootstrap: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  featuredShows: any[] = [];
  upcomingShows: any[] = [];
  upcomingEvents: any[] = [];
  activePromotions: any[] = [];
  isLoading = true;
  isLoggedIn = false;
  loginModal: any;
  Math = Math; // Expose Math to the template

  categories = [
    { name: 'Movies', route: '/shows', params: { category: 'movies', type: 'Movie' }, icon: 'bi bi-film' },
    { name: 'Concerts', route: '/shows', params: { category: 'concerts', type: 'Concert' }, icon: 'bi bi-music-note-beamed' },
    { name: 'Theater', route: '/shows', params: { category: 'theater', type: 'Theatrical' }, icon: 'bi bi-mask' },
    { name: 'Events', route: '/shows', params: { category: 'events', type: 'Event' }, icon: 'bi bi-calendar-event' },
    { name: 'Sports', route: '/shows', params: { category: 'sports', genre: 'Sports' }, icon: 'bi bi-trophy' }
  ];

  constructor(
    private router: Router,
    private showService: ShowService,
    private authService: AuthService,
    private imageService: ImageService,
    private promotionService: PromotionService,
    private sanitizer: DomSanitizer
  ) { }
  
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
  
  /**
   * Sanitize image URLs to prevent security issues and fix common URL problems
   * @param url The image URL to sanitize
   * @returns A safe URL string or null if the URL is invalid
   */
  sanitizeImageUrl(url: string | undefined | null): string | null {
    if (!url) return null;
    
    // Remove file:/// URLs which can't be loaded due to security restrictions
    if (url.startsWith('file:///')) {
      return null;
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

  ngOnInit(): void {
    // Check if user is logged in
    this.isLoggedIn = this.authService.isLoggedIn();
    
    // Load shows from the backend
    this.loadShows();
    
    // Load active promotions
    this.loadActivePromotions();
    
    // Initialize carousels and modal when component loads
    setTimeout(() => {
      this.initializeCarousel();
      this.initializePromotionsCarousel();
      this.initializeLoginModal();
    }, 500);
  }

  loadShows(): void {
    this.isLoading = true;
    
    // Get all shows from the database
    this.showService.getAllShows()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (shows: Show[]) => {
          if (shows && shows.length > 0) {
            // Filter out CANCELLED shows first
            shows = shows.filter(show => show.status !== 'CANCELLED');
            console.log('Filtered out CANCELLED shows, remaining:', shows.length);
            
            // Process each show to get specific images based on title and type
            const processShows = shows.map(show => {
              // For movies, try to get a specific movie poster if the existing one isn't valid
              if (show.type === 'Movie' || show.genre?.toLowerCase() === 'movie') {
                return this.imageService.getSpecificMovieImage(show.title, show.type, show.genre, this.sanitizeImageUrl(show.posterUrl || show.imageUrl || show.image) || '').pipe(
                  map(imageUrl => ({
                    id: show.id,
                    title: show.title,
                    type: show.type || show.genre || 'Show',
                    image: imageUrl, // Use the image URL returned by getSpecificMovieImage
                    imageUrl: imageUrl, // Set imageUrl as well for consistency
                    posterUrl: imageUrl, // Set posterUrl as well for consistency
                    date: this.getShowDate(show),
                    venue: this.getShowVenue(show),
                    price: this.getShowPrice(show),
                    description: show.description,
                    rating: '4.0', // Will be updated with real ratings
                    voteCount: 0
                  }))
                );
              } else {
                // For non-movies, still try to get a specific image if it has a title
                return this.imageService.getSpecificMovieImage(show.title, show.type || show.genre || 'Show', show.genre || '', this.sanitizeImageUrl(show.posterUrl || show.imageUrl || show.image) || '').pipe(
                  map(imageUrl => ({
                    id: show.id,
                    title: show.title,
                    type: show.type || show.genre || 'Show',
                    image: imageUrl, // Use the image URL returned by getSpecificMovieImage
                    posterUrl: imageUrl, // Set posterUrl to the same value for consistency
                    imageUrl: imageUrl, // Set imageUrl to the same value for consistency
                    date: this.getShowDate(show),
                    venue: this.getShowVenue(show),
                    price: this.getShowPrice(show),
                    description: show.description,
                    rating: '4.0', // Will be updated with real ratings
                    voteCount: 0
                  }))
                );
              }
            });
            
            // Wait for all image lookups to complete
            forkJoin(processShows).subscribe(mappedShows => {
              // Helper function to shuffle an array randomly
              const shuffleArray = (array: any[]) => {
                const shuffled = [...array]; // Create a copy to avoid modifying original
                for (let i = shuffled.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // Swap elements
                }
                return shuffled;
              };
              
              // Filter for featured MOVIES that are ONGOING and randomize selection
              const featuredFiltered = mappedShows.filter(show => {
                const originalShow = shows.find(s => s.id === show.id);
                return originalShow?.status === 'ONGOING' && 
                      (originalShow?.type === 'Movie' || 
                       originalShow?.genre?.toLowerCase() === 'movie');
              });
              // Only shuffle if we have more than needed to display
              this.featuredShows = featuredFiltered.length > 6 
                ? shuffleArray(featuredFiltered).slice(0, 6) 
                : featuredFiltered.slice(0, 6);
              
              // Filter for upcoming MOVIES and randomize selection
              const upcomingFiltered = mappedShows.filter(show => {
                const originalShow = shows.find(s => s.id === show.id);
                return originalShow?.status === 'UPCOMING' && 
                      (originalShow?.type === 'Movie' || 
                       originalShow?.genre?.toLowerCase() === 'movie');
              });
              // Only shuffle if we have more than needed to display
              this.upcomingShows = upcomingFiltered.length > 6 
                ? shuffleArray(upcomingFiltered).slice(0, 6) 
                : upcomingFiltered.slice(0, 6);
              
              // Filter upcoming events (not movies) and randomize selection
              const upcomingEventsFiltered = mappedShows.filter(show => {
                const originalShow = shows.find(s => s.id === show.id);
                return originalShow?.status === 'UPCOMING' && 
                      (originalShow?.type === 'Event' || 
                       originalShow?.type === 'Concert' || 
                       originalShow?.type === 'Theatrical' ||
                       originalShow?.genre === 'Event' ||
                       originalShow?.genre === 'Concert' ||
                       originalShow?.genre === 'Theatrical');
              });
              
              // Randomize events selection if we have more than needed
              this.upcomingEvents = upcomingEventsFiltered.length > 3 
                ? shuffleArray(upcomingEventsFiltered).slice(0, 3) 
                : upcomingEventsFiltered.slice(0, 3);
              
              // If we don't have enough events, add some random ones from upcoming shows that are specifically event types
              if (this.upcomingEvents.length < 3) {
                const additionalEventsPool = mappedShows.filter(show => {
                  const originalShow = shows.find(s => s.id === show.id);
                  return originalShow?.status === 'UPCOMING' && 
                        (originalShow?.type === 'Event' || 
                         originalShow?.type === 'Concert' || 
                         originalShow?.type === 'Theatrical' ||
                         originalShow?.genre === 'Event' ||
                         originalShow?.genre === 'Concert' ||
                         originalShow?.genre === 'Theatrical') &&
                        !this.upcomingEvents.some(e => e.id === show.id);
                });
                
                // Randomize selection from additional events pool
                const additionalEvents = additionalEventsPool.length > (3 - this.upcomingEvents.length)
                  ? shuffleArray(additionalEventsPool).slice(0, 3 - this.upcomingEvents.length)
                  : additionalEventsPool.slice(0, 3 - this.upcomingEvents.length);
                
                this.upcomingEvents = [...this.upcomingEvents, ...additionalEvents];
              }
              
              // Fetch real ratings for each show
              this.fetchRatingsForShows(this.featuredShows);
              this.fetchRatingsForShows(this.upcomingShows);
              this.fetchRatingsForShows(this.upcomingEvents);
              
              console.log('Loaded shows from database:', {
                featured: this.featuredShows.length,
                upcoming: this.upcomingShows.length
              });
            });
          } else {
            console.warn('No shows returned from the database');
            this.featuredShows = [];
            this.upcomingShows = [];
          }
        },
        error: (error) => {
          console.error('Error fetching shows:', error);
          this.featuredShows = [];
          this.upcomingShows = [];
        }
      });
  }

  // Helper methods to extract show information
  private getShowDate(show: Show): string {
    if (show.schedules && show.schedules.length > 0) {
      return show.schedules[0].showDate;
    }
    return new Date().toISOString().split('T')[0]; // Today's date as fallback
  }

  private getShowVenue(show: Show): string {
    if (show.schedules && show.schedules.length > 0 && show.schedules[0].venue) {
      return show.schedules[0].venue.name;
    }
    return 'Various Venues';
  }

  private getShowPrice(show: Show): number {
    if (show.schedules && show.schedules.length > 0) {
      return show.schedules[0].basePrice;
    }
    return 19.99; // Default price
  }

  // Helper method to get a better image for a show based on its title and type
  private getEnhancedImage(show: Show): string {
    if (show.posterUrl) {
      return show.posterUrl;
    }
    
    // For movies, try to get a specific movie poster
    if (show.type === 'Movie' || show.genre?.toLowerCase() === 'movie') {
      // We'll use the image service to get a better image in the loadShows method
      return this.getImageUrl(null, 'movie', show.genre || '');
    }
    
    // For other types, use the appropriate default image
    return this.getImageUrl(null, show.type || show.genre || 'show');
  }

  navigateToCategory(category: string): void {
    // Find the category object
    const categoryObj = this.categories.find(cat => cat.params.category === category);
    
    if (categoryObj) {
      // Allow navigation to shows list without login, passing all params
      this.router.navigate(['/shows'], { queryParams: categoryObj.params });
    } else {
      // Fallback to just using the category name
      this.router.navigate(['/shows'], { queryParams: { category } });
    }
  }

  checkLoginBeforeNavigate(event: Event, url: string): void {
    // Allow navigation to shows list and show details without login
    if (url === '/shows' || url.startsWith('/shows/')) {
      return;
    }
    
    // For other protected routes, require login
    if (!this.isLoggedIn) {
      event.preventDefault();
      this.showLoginRequiredModal();
    }
  }

  private showLoginRequiredModal(): void {
    if (this.loginModal) {
      this.loginModal.show();
    }
  }

  private initializeCarousel(): void {
    // Bootstrap carousel initialization
    const carouselElement = document.getElementById('mainBannerCarousel');
    if (carouselElement) {
      new bootstrap.Carousel(carouselElement, {
        interval: 5000,
        wrap: true
      });
    }
  }

  private initializePromotionsCarousel(): void {
    // Bootstrap promotions carousel initialization
    const promotionsCarouselElement = document.getElementById('promotionsCarousel');
    if (promotionsCarouselElement) {
      new bootstrap.Carousel(promotionsCarouselElement, {
        interval: 6000,
        wrap: true
      });
    }
  }

  private initializeLoginModal(): void {
    const modalElement = document.getElementById('loginRequiredModal');
    if (modalElement) {
      this.loginModal = new bootstrap.Modal(modalElement);
    }
  }
  
  // Fetch real ratings for shows
  private fetchRatingsForShows(shows: any[]): void {
    shows.forEach(show => {
      if (show.id) {
        this.showService.getShowReviews(show.id).subscribe({
          next: (reviews) => {
            if (reviews && reviews.length > 0) {
              // Calculate average rating locally
              const ratingData = this.calculateAverageRating(reviews);
              show.rating = ratingData.rating.toString();
              show.voteCount = ratingData.voteCount;
            } else {
              // If no reviews, use IMDB-style rating (weighted towards 7.0)
              const baseRating = 7.0;
              const variance = Math.random() * 2 - 1; // -1 to +1
              const weightedRating = baseRating + variance;
              show.rating = (weightedRating / 2).toFixed(1); // Convert to 5-star scale
              show.voteCount = Math.floor(Math.random() * 500) + 50; // 50-550 votes
            }
          },
          error: () => {
            // Fallback to IMDB-style rating if API fails
            const baseRating = 7.0;
            const variance = Math.random() * 2 - 1; // -1 to +1
            const weightedRating = baseRating + variance;
            show.rating = (weightedRating / 2).toFixed(1); // Convert to 5-star scale
            show.voteCount = Math.floor(Math.random() * 500) + 50; // 50-550 votes
          }
        });
      }
    });
  }
  
  // Calculate average rating from reviews
  private calculateAverageRating(reviews: any[]): { rating: number, voteCount: number } {
    if (!reviews || reviews.length === 0) {
      return { rating: 0, voteCount: 0 };
    }
    
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    const average = sum / reviews.length;
    
    return {
      rating: parseFloat(average.toFixed(1)),
      voteCount: reviews.length
    };
  }

  /**
   * Load active promotions from the backend
   */
  loadActivePromotions(): void {
    this.promotionService.getActivePromotions().subscribe({
      next: (promotions) => {
        this.activePromotions = promotions;
        console.log('Active promotions loaded:', promotions);
        console.log('Number of active promotions:', promotions.length);
        if (promotions.length > 0) {
          console.log('First promotion details:', promotions[0]);
        }
      },
      error: (error) => {
        console.error('Error loading active promotions:', error);
        // Don't show error to user, just log it
        this.activePromotions = [];
      }
    });
  }

  /**
   * Copy promotion code to clipboard
   * @param code Promotion code to copy
   */
  copyPromotionCode(code: string): void {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(() => {
        console.log('Promotion code copied to clipboard:', code);
        alert('Promotion code copied to clipboard: ' + code);
      }).catch(err => {
        console.error('Failed to copy promotion code:', err);
        this.fallbackCopyTextToClipboard(code);
      });
    } else {
      this.fallbackCopyTextToClipboard(code);
    }
  }

  /**
   * Fallback method to copy text to clipboard
   * @param text Text to copy
   */
  private fallbackCopyTextToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        console.log('Promotion code copied to clipboard (fallback):', text);
      }
    } catch (err) {
      console.error('Fallback: Could not copy text:', err);
    }
    
    document.body.removeChild(textArea);
  }

  /**
   * Apply promotion code and navigate to shows page
   * @param code Promotion code to apply
   */
  applyPromotionAndNavigate(code: string): void {
    // Store the promotion code in both localStorage and sessionStorage for persistence
    localStorage.setItem('applied_promotion_code', code);
    sessionStorage.setItem('selectedPromotionCode', code);
    console.log('Stored promotion code for booking:', code);
    
    // Check if user is logged in before navigating
    if (!this.isLoggedIn) {
      // Show login modal if not logged in
      this.showLoginRequiredModal();
      return;
    }
    
    // Navigate to shows page with promotion code as query parameter
    this.router.navigate(['/shows'], {
      queryParams: { promotion: code }
    });
  }
}