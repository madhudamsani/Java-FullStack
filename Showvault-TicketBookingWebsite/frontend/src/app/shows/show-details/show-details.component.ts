import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ShowService } from '../../services/show.service';
import { AuthService } from '../../services/auth.service';
import { ImageService } from '../../services/image.service';
import { Show, ShowSchedule, ShowReview } from '../../models/show.model';
import { finalize } from 'rxjs/operators';
import { format, parseISO } from 'date-fns';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
declare var bootstrap: any;

@Component({
  selector: 'app-show-details',
  templateUrl: './show-details.component.html',
  styleUrls: ['./show-details.component.css']
})
export class ShowDetailsComponent implements OnInit, OnDestroy {
  show: Show | null = null;
  loading = false;
  error = '';
  reviews: ShowReview[] = [];
  averageRating = 0;
  similarShows: Show[] = [];
  isLoggedIn = false;
  reviewForm: FormGroup = this.fb.group({
    rating: ['', [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['', [Validators.minLength(10)]]
  });
  isSubmittingReview = false;
  reviewModal: any;
  linkCopiedToast: any;
  trailerModal: any;
  currentTrailerUrl: SafeResourceUrl | null = null;
  private subscriptions: Subscription[] = [];
  private boundScrollHandler: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private showService: ShowService,
    private authService: AuthService,
    private imageService: ImageService,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer
  ) {}

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

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.initializeForm();
    
    // Subscribe to auth state changes
    const authSub = this.authService.authStateChanged().subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
    });
    this.subscriptions.push(authSub);
    
    const showId = Number(this.route.snapshot.paramMap.get('id'));
    if (showId) {
      this.loadShowDetails(showId);
      this.loadSimilarShows(showId);
    }
    this.initializeModals();
    
    // Add scroll event listener to update active navigation
    this.boundScrollHandler = this.handleScroll.bind(this);
    window.addEventListener('scroll', this.boundScrollHandler);
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Remove scroll event listener
    if (this.boundScrollHandler) {
      window.removeEventListener('scroll', this.boundScrollHandler);
    }
  }
  
  private handleScroll(): void {
    // Only run if show is loaded
    if (!this.show) return;
    
    const sections = ['booking', 'about', 'reviews'];
    let currentSection = '';
    
    // Find which section is currently in view
    for (const sectionId of sections) {
      const element = document.getElementById(sectionId);
      if (element) {
        const rect = element.getBoundingClientRect();
        // If the top of the element is in the top half of the viewport
        if (rect.top <= window.innerHeight / 2) {
          currentSection = sectionId;
        }
      }
    }
    
    // Update active navigation item
    if (currentSection) {
      const navItems = document.querySelectorAll('.bms-nav-item');
      navItems.forEach(item => {
        item.classList.remove('active');
        if (item.querySelector('span')?.textContent?.toLowerCase().includes(currentSection)) {
          item.classList.add('active');
        }
      });
    }
  }

  private initializeForm(): void {
    this.reviewForm = this.fb.group({
      rating: ['', [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.minLength(10)]]
    });
    
    // Add value change listener to log changes
    this.reviewForm.valueChanges.subscribe(values => {
      console.log('Form values changed:', values);
    });
  }

  retryLoading(): void {
    this.error = '';
    this.loadShowDetails(this.show?.id || 0);
  }

  private initializeModals(): void {
    this.reviewModal = new bootstrap.Modal(document.getElementById('reviewModal')!);
    this.linkCopiedToast = new bootstrap.Toast(document.getElementById('linkCopiedToast')!);
    this.trailerModal = new bootstrap.Modal(document.getElementById('trailerModal')!);
  }

  private loadShowDetails(showId: number): void {
    this.loading = true;

    // Load show details
    this.showService.getShowById(showId).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (show) => {
        this.show = show;
        if (show.id) {
          this.loadReviews(show.id);
        }
        // Try to enhance show image if it's a movie
        if (show.type === 'Movie') {
          this.enhanceShowImage();
        }
      },
      error: (error) => {
        console.error('Error loading show:', error);
        this.error = 'Failed to load show details. Please try again.';
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
        this.show.posterUrl || this.show.imageUrl || this.show.image || ''
      ).subscribe(imageUrl => {
        if (this.show) {
          console.log(`Setting image URL for ${this.show.title} to: ${imageUrl}`);
          // Set all image properties for consistency
          this.show.imageUrl = imageUrl;
          this.show.image = imageUrl;
          this.show.posterUrl = imageUrl;
        }
      });
    }
  }

  // Removed groupSchedulesByDate method as it's no longer needed

  private loadReviews(showId: number): void {
    this.showService.getShowReviews(showId).subscribe({
      next: (reviews: ShowReview[]) => {
        this.reviews = reviews;
        this.calculateAverageRating();
      },
      error: (error: Error) => console.error('Error loading reviews:', error)
    });
  }

  private calculateAverageRating(): void {
    if (!this.reviews.length) {
      this.averageRating = 0;
      return;
    }
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.averageRating = sum / this.reviews.length;
  }

  private loadSimilarShows(showId: number): void {
    const similarShowsSubscription = this.showService.getRecommendedShows(showId).subscribe({
      next: (shows: Show[]) => {
        this.similarShows = shows.filter(s => s.id !== showId).slice(0, 4);

        // Enhance images for similar shows
        this.similarShows.forEach(show => {
          // Always try to enhance images for all shows
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
        });
      },
      error: (error: Error) => {
        console.error('Error loading similar shows:', error);
        // Silently fail - similar shows are not critical
        this.similarShows = [];
      }
    });

    this.subscriptions.push(similarShowsSubscription);
  }

  // Removed ticket quantity and price related methods

  proceedToBooking(): void {
    if (this.show?.id) {
      // Navigate to theater selection page without date preselection
      this.router.navigate(['/booking/theater-selection', this.show.id]);
    } else {
      console.error('Cannot proceed to booking: missing show ID');
    }
  }

  // Removed canBookMoreTickets method as it's no longer needed

  canBook(): boolean {
    // First check if user is logged in
    if (!this.authService.isLoggedIn()) return false;
    
    // Check if show exists and has available seats
    if (this.show) {
      // If show has its own availableSeats property, use it
      if (this.show.availableSeats !== undefined) {
        return (this.show.availableSeats || 0) > 0;
      }
      // Otherwise, assume there are seats available
      return true;
    }
    
    // Default case - no show data
    return false;
  }

  getBookButtonText(): string {
    if (!this.authService.isLoggedIn()) {
      return 'Please login to book tickets';
    }
    if (this.show && (this.show.availableSeats || 0) <= 0) {
      return 'Sold Out';
    }
    return 'Book Tickets';
  }

  formatDate(dateString: string | Date | undefined): string {
    if (!dateString) return '';
    
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      return format(date, 'MMMM d, yyyy');
    } catch (error) {
      return String(dateString);
    }
  }
  
  getShowDate(show: Show | null): string {
    if (!show) return '';
    
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
  
  getShowVenue(show: Show | null): string {
    if (!show) return '';
    
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

  formatDateDay(dateString: string | Date | undefined): string {
    if (!dateString) return '';
    
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      return format(date, 'EEE');
    } catch (error) {
      return '';
    }
  }

  formatDateNumber(dateString: string | Date | undefined): string {
    if (!dateString) return '';
    
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      return format(date, 'd');
    } catch (error) {
      return '';
    }
  }

  formatDateMonth(dateString: string | Date | undefined): string {
    if (!dateString) return '';
    
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      return format(date, 'MMM');
    } catch (error) {
      return '';
    }
  }

  formatTime(time: string | undefined): string {
    if (!time) return '';
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  // Method moved to avoid duplication

  getStarsArray(rating: number): number[] {
    const stars: number[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(1);
    }
    
    // Add half star if needed
    if (hasHalfStar) {
      stars.push(0.5);
    }
    
    // Add empty stars
    while (stars.length < 5) {
      stars.push(0);
    }
    
    return stars;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  openReviewModal(): void {
    console.log('Opening review modal');
    this.reviewForm.reset({ rating: '', comment: '' });
    
    // Check if user has already reviewed this show
    const currentUserId = this.authService.getCurrentUserId();
    const existingReview = this.reviews.find(review => 
      review.userId === currentUserId);
    
    if (existingReview) {
      // Pre-fill the form with existing review data
      this.reviewForm.patchValue({
        rating: existingReview.rating,
        comment: existingReview.review || existingReview.comment || ''
      });
      console.log('Pre-filled form with existing review:', this.reviewForm.value);
    }
    
    if (this.reviewModal) {
      this.reviewModal.show();
      console.log('Review modal shown');
    } else {
      console.error('Review modal not initialized');
      
      // Try to initialize it again
      const reviewModalElement = document.getElementById('reviewModal');
      if (reviewModalElement) {
        this.reviewModal = new bootstrap.Modal(reviewModalElement);
        this.reviewModal.show();
        console.log('Review modal initialized and shown');
      } else {
        console.error('Review modal element not found');
        alert('Could not open review form. Please try again.');
      }
    }
    
    // Add animation to stars after modal is shown
    setTimeout(() => {
      const stars = document.querySelectorAll('.bms-star-container i');
      stars.forEach((star, index) => {
        setTimeout(() => {
          star.classList.add('animated');
        }, index * 100);
      });
    }, 300);
  }

  setRating(rating: number): void {
    console.log('Setting rating to:', rating);
    this.reviewForm.patchValue({ rating });
    // Mark the rating control as touched to trigger validation
    this.reviewForm.get('rating')?.markAsTouched();
    console.log('Form valid after rating:', this.reviewForm.valid);
  }

  saveReview(): void {
    console.log('Save Review clicked');
    console.log('Form valid:', this.reviewForm.valid);
    console.log('Form value:', this.reviewForm.value);
    
    if (!this.reviewForm.valid || !this.show?.id || this.isSubmittingReview) {
      console.log('Form validation failed or show ID missing or already submitting');
      return;
    }

    this.isSubmittingReview = true;
    
    // Check if user has already reviewed this show
    const currentUserId = this.authService.getCurrentUserId();
    const existingReviewIndex = this.reviews.findIndex(review => review.userId === currentUserId);
    
    const userData = this.authService.getUserData();
    
    const review: Partial<ShowReview> = {
      showId: this.show.id,
      rating: this.reviewForm.value.rating,
      review: this.reviewForm.value.comment, // Set review field
      comment: this.reviewForm.value.comment, // Keep comment for backward compatibility
      // Add user info for display purposes
      userName: userData?.username || 'User',
      // Add createdAt to ensure it's not null on the server
      createdAt: new Date().toISOString()
    };

    this.showService.addReview(this.show.id, review).pipe(
      finalize(() => this.isSubmittingReview = false)
    ).subscribe({
      next: (newReview: ShowReview) => {
        this.reviews.unshift(newReview);
        this.calculateAverageRating();
        this.reviewForm.reset();
        this.reviewModal.hide();
        
        // Show success message
        alert('Review saved successfully!');
      },
      error: (error: Error) => {
        console.error('Error saving review:', error);
        
        // Try to save to localStorage as a fallback
        try {
          const savedReview = {
            showId: this.show!.id,
            rating: this.reviewForm.value.rating,
            comment: this.reviewForm.value.comment,
            savedAt: new Date().toISOString()
          };
          
          const savedReviews = JSON.parse(localStorage.getItem('savedReviews') || '[]');
          savedReviews.push(savedReview);
          localStorage.setItem('savedReviews', JSON.stringify(savedReviews));
          
          alert('Server error occurred, but your review was saved locally. It will be submitted when the server is available.');
        } catch (e) {
          alert('Failed to save review. Please try again later.');
        }
      }
    });
  }

  submitReview(): void {
    console.log('Submit Review clicked');
    console.log('Form valid:', this.reviewForm.valid);
    console.log('Form value:', this.reviewForm.value);
    
    if (!this.reviewForm.valid || !this.show?.id || this.isSubmittingReview) {
      console.log('Form validation failed or show ID missing or already submitting');
      return;
    }

    this.isSubmittingReview = true;
    
    // Check if user has already reviewed this show
    const currentUserId = this.authService.getCurrentUserId();
    const existingReviewIndex = this.reviews.findIndex(review => review.userId === currentUserId);
    
    const userData = this.authService.getUserData();
    
    const review: Partial<ShowReview> = {
      showId: this.show.id,
      rating: this.reviewForm.value.rating,
      review: this.reviewForm.value.comment, // Set review field
      comment: this.reviewForm.value.comment, // Keep comment for backward compatibility
      // Add user info for display purposes
      userName: userData?.username || 'User',
      // Add createdAt to ensure it's not null on the server
      createdAt: new Date().toISOString()
    };

    this.showService.addReview(this.show.id, review).pipe(
      finalize(() => this.isSubmittingReview = false)
    ).subscribe({
      next: (newReview: ShowReview) => {
        this.reviews.unshift(newReview);
        this.calculateAverageRating();
        this.reviewForm.reset();
        this.reviewModal.hide();
        
        // Show success message
        alert('Review submitted successfully!');
      },
      error: (error: Error) => {
        console.error('Error submitting review:', error);
        
        // Try to save to localStorage as a fallback
        try {
          const savedReview = {
            showId: this.show!.id,
            rating: this.reviewForm.value.rating,
            comment: this.reviewForm.value.comment,
            savedAt: new Date().toISOString()
          };
          
          const savedReviews = JSON.parse(localStorage.getItem('savedReviews') || '[]');
          savedReviews.push(savedReview);
          localStorage.setItem('savedReviews', JSON.stringify(savedReviews));
          
          alert('Server error occurred, but your review was saved locally. It will be submitted when the server is available.');
        } catch (e) {
          alert('Failed to submit review. Please try again later.');
        }
      }
    });
  }

  shareShow(platform: string): void {
    const url = window.location.href;
    const text = `Check out ${this.show?.title} at ShowVault!`;
    
    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
        break;
      case 'whatsapp':
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`);
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`;
        break;
    }
  }

  copyLink(): void {
    const url = window.location.href;
    console.log('Copying link:', url);
    
    try {
      navigator.clipboard.writeText(url)
        .then(() => {
          console.log('Link copied successfully');
          // Show toast notification
          if (this.linkCopiedToast) {
            this.linkCopiedToast.show();
          } else {
            // Fallback if toast isn't initialized
            console.warn('Toast not initialized, using alert instead');
            alert('Link copied to clipboard!');
            
            // Try to initialize toast again
            const toastElement = document.getElementById('linkCopiedToast');
            if (toastElement) {
              this.linkCopiedToast = new bootstrap.Toast(toastElement, {
                delay: 3000
              });
              this.linkCopiedToast.show();
            }
          }
        })
        .catch(err => {
          console.error('Could not copy link:', err);
          alert('Could not copy link. Please try again.');
        });
    } catch (error) {
      console.error('Error copying link:', error);
      alert('Could not copy link. Please try again.');
    }
  }

  goBack(): void {
    this.router.navigate(['/shows']);
  }
  
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Update active navigation item
      const navItems = document.querySelectorAll('.bms-nav-item');
      navItems.forEach(item => {
        item.classList.remove('active');
        if (item.querySelector('span')?.textContent?.toLowerCase().includes(sectionId)) {
          item.classList.add('active');
        }
      });
    }
  }
  
  /**
   * Check if trailer should be shown for this content type
   * Trailers are only applicable to movies in real world
   */
  shouldShowTrailer(): boolean {
    return this.show?.type === 'Movie';
  }

  /**
   * Check if the show has a valid trailer URL
   */
  hasTrailerUrl(): boolean {
    return !!(this.show?.trailerUrl && this.show.trailerUrl.trim().length > 0);
  }

  /**
   * Play the trailer in a modal
   */
  playTrailer(): void {
    if (!this.shouldShowTrailer()) {
      console.warn('Trailers are only available for movies');
      return;
    }

    if (!this.hasTrailerUrl()) {
      console.warn('No trailer URL available for this movie');
      return;
    }

    // Convert YouTube URL to embed format if needed
    const embedUrl = this.convertToEmbedUrl(this.show!.trailerUrl!);
    this.currentTrailerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    
    // Show the modal
    this.trailerModal.show();
  }

  /**
   * Close the trailer modal and stop video playback
   */
  closeTrailer(): void {
    this.currentTrailerUrl = null;
    this.trailerModal.hide();
  }

  /**
   * Convert various video URLs to embed format
   */
  private convertToEmbedUrl(url: string): string {
    // YouTube URL patterns
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&rel=0`;
    }

    // Vimeo URL patterns
    const vimeoRegex = /(?:vimeo\.com\/)([0-9]+)/;
    const vimeoMatch = url.match(vimeoRegex);
    
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    }

    // If it's already an embed URL or other format, return as is
    return url;
  }

  refreshShowData(): void {
    if (this.show?.id) {
      this.loadShowDetails(this.show.id);
    }
  }
}