import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { ImageService } from '../../services/image.service';
import { User } from '../../models/user.model';
import { SEAT_CATEGORY_METADATA, SEAT_STATUS_METADATA } from '../../models/seat-metadata';
import { SeatCategory, SeatStatus } from '../../models/show.model';
import { SeatCategory as BookingSeatCategory } from '../../models/booking.model';
import { 
  BookingRequest, 
  BookingSeat, 
  BookingSummary, 
  PaymentMethod,
  PaymentMethodType,
  PAYMENT_METHOD_METADATA,
  BookingResponse,
  BookingStatus,
  BOOKING_STATUS_METADATA,
  PaymentStatus,
  PAYMENT_STATUS_METADATA
} from '../../models/booking.model';
import { finalize } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-payment-form',
  templateUrl: './payment-form.component.html',
  styleUrls: ['./payment-form.component.css']
})
export class PaymentFormComponent implements OnInit {
  bookingSummary: BookingSummary | null = null;
  showId: number = 0;
  scheduleId: number = 0;
  selectedSeats: BookingSeat[] = [];
  
  paymentMethods: PaymentMethod[] = [];
  selectedPaymentMethod: PaymentMethod | null = null;
  newCardForm: FormGroup;
  
  loading = false;
  processing = false;
  error = '';
  showNewCardForm = false;
  
  // Promotion-related properties
  promotionCode = '';
  promotionApplied = false;
  promotionMessage = '';
  appliedPromotion: any = null;
  promotionDiscount = 0;
  
  // Make enums and metadata available to the template
  PaymentMethodType = PaymentMethodType;
  PAYMENT_METHOD_METADATA = PAYMENT_METHOD_METADATA;
  PaymentStatus = PaymentStatus;
  PAYMENT_STATUS_METADATA = PAYMENT_STATUS_METADATA;
  BookingStatus = BookingStatus;
  BOOKING_STATUS_METADATA = BOOKING_STATUS_METADATA;
  readonly SEAT_CATEGORY_METADATA = SEAT_CATEGORY_METADATA;
  
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
  
  constructor(
    private router: Router,
    private fb: FormBuilder,
    private bookingService: BookingService,
    private authService: AuthService,
    private imageService: ImageService,
    private sanitizer: DomSanitizer
  ) {
    // Initialize the new card form
    this.newCardForm = this.fb.group({
      cardNumber: ['', [Validators.required, Validators.pattern('^[0-9]{16}$')]],
      nameOnCard: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]],
      expiryDate: ['', [Validators.required, Validators.pattern('^(0[1-9]|1[0-2])\/([0-9]{2})$')]],
      cvv: ['', [Validators.required, Validators.pattern('^[0-9]{3,4}$')]]
    });
  }

  ngOnInit(): void {
    console.log('PaymentFormComponent initialized');
    
    // Get data from router state
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as {
      bookingSummary: BookingSummary;
      showId: number;
      scheduleId: number;
      selectedSeats: BookingSeat[];
    };
    
    // Helper function to enhance show image
    const enhanceShowImage = (summary: BookingSummary | null) => {
      if (summary && summary.show) {
        console.log(`Enhancing image for show in booking summary: ${summary.show.title}`);
        this.imageService.getSpecificMovieImage(
          summary.show.title, 
          summary.show.type || 'Show',
          '', // No genre information available in BookingSummary
          summary.show.posterUrl || summary.show.imageUrl || summary.show.image || ''
        ).subscribe(imageUrl => {
          console.log(`Setting image URL for booking summary show ${summary.show.title} to: ${imageUrl}`);
          summary.show.imageUrl = imageUrl;
          summary.show.image = imageUrl; // Set both image properties for consistency
          summary.show.posterUrl = imageUrl; // Set posterUrl as well
        });
      }
    };
    
    console.log('Router state:', state);
    
    if (state) {
      console.log('Using router navigation state');
      this.bookingSummary = state.bookingSummary;
      this.showId = state.showId;
      this.scheduleId = state.scheduleId;
      this.selectedSeats = state.selectedSeats;
      
      // Enhance show image
      enhanceShowImage(this.bookingSummary);
      
      console.log('Selected seats:', this.selectedSeats);
    } else {
      // Try to get data from history state
      const historyState = window.history.state;
      console.log('History state:', historyState);
      
      if (historyState && historyState.bookingSummary) {
        console.log('Using history state');
        this.bookingSummary = historyState.bookingSummary;
        this.showId = historyState.showId;
        this.scheduleId = historyState.scheduleId;
        this.selectedSeats = historyState.selectedSeats;
        
        // Enhance show image
        enhanceShowImage(this.bookingSummary);
        
        console.log('Selected seats from history:', this.selectedSeats);
      } else {
        // Try to get data from session storage
        try {
          const sessionData = sessionStorage.getItem('bookingData');
          if (sessionData) {
            const parsedData = JSON.parse(sessionData);
            console.log('Using session storage data:', parsedData);
            
            this.bookingSummary = parsedData.bookingSummary;
            this.showId = parsedData.showId;
            this.scheduleId = parsedData.scheduleId;
            this.selectedSeats = parsedData.selectedSeats;
            
            // Enhance show image
            enhanceShowImage(this.bookingSummary);
            
            console.log('Selected seats from session storage:', this.selectedSeats);
          } else {
            throw new Error('No session data available');
          }
        } catch (e) {
          console.error('Error retrieving booking data:', e);
          // No state data, redirect back to shows
          this.error = 'Missing booking information. Redirecting to shows...';
          setTimeout(() => {
            this.router.navigate(['/shows']);
          }, 2000);
          return;
        }
      }
    }
    
    // Load payment methods
    this.loadPaymentMethods();
    
    // Check for stored promotion code from home page
    this.checkForStoredPromotionCode();
  }

  loadPaymentMethods(): void {
    this.loading = true;
    this.error = '';
    
    this.bookingService.getSavedPaymentMethods().subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
        this.loading = false;
        
        // Select the first available payment method by default
        if (this.paymentMethods.length > 0) {
          this.selectedPaymentMethod = this.paymentMethods[0];
        }
      },
      error: (error) => {
        console.error('Error loading payment methods:', error);
        this.error = 'Failed to load payment methods';
        this.loading = false;
        
        // Use mock payment methods as fallback
        setTimeout(() => {
          this.paymentMethods = this.bookingService.createMockPaymentMethods();
          if (this.paymentMethods.length > 0) {
            this.selectedPaymentMethod = this.paymentMethods[0];
            this.error = ''; // Clear error if we have fallback data
          }
        }, 1000);
      }
    });
  }

  selectPaymentMethod(method: PaymentMethod): void {
    this.selectedPaymentMethod = method;
    this.showNewCardForm = false;
  }

  toggleNewCardForm(): void {
    this.showNewCardForm = !this.showNewCardForm;
    if (this.showNewCardForm) {
      this.selectedPaymentMethod = null;
    }
  }

  addNewCard(): void {
    if (this.newCardForm.invalid) {
      this.markFormGroupTouched(this.newCardForm);
      return;
    }
    
    const cardNumber = this.newCardForm.get('cardNumber')?.value;
    const lastFour = cardNumber.slice(-4);
    const nameOnCard = this.newCardForm.get('nameOnCard')?.value;
    const expiryDate = this.newCardForm.get('expiryDate')?.value;
    
    const newMethod: Partial<PaymentMethod> = {
      type: PaymentMethodType.CREDIT_CARD,
      name: `${nameOnCard} (${lastFour})`,
      icon: PAYMENT_METHOD_METADATA[PaymentMethodType.CREDIT_CARD].icon,
      lastFour,
      expiryDate
    };
    
    this.loading = true;
    
    this.bookingService.addPaymentMethod(newMethod).subscribe({
      next: (method) => {
        this.paymentMethods.push(method);
        this.selectedPaymentMethod = method;
        this.showNewCardForm = false;
        this.loading = false;
        this.newCardForm.reset();
        
        // If we're in the middle of completing a booking, continue with the booking process
        if (this.processing) {
          this.completeBooking();
        }
      },
      error: (error) => {
        console.error('Error adding payment method:', error);
        this.error = 'Failed to add payment method';
        this.loading = false;
        this.processing = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/booking/seat-selection'], {
      queryParams: {
        showId: this.showId,
        scheduleId: this.scheduleId
      }
    });
  }
  
  retryPayment(): void {
    this.error = '';
    this.processing = false;
    this.completeBooking();
  }

  getErrorMessage(controlName: string): string {
    const control = this.newCardForm.get(controlName);
    
    if (!control || !control.errors || !control.touched) return '';
    
    if (control.errors['required']) {
      return 'This field is required';
    }
    
    switch (controlName) {
      case 'cardNumber':
        return control.errors['pattern'] ? 'Please enter a valid 16-digit card number' : '';
      case 'nameOnCard':
        return control.errors['pattern'] ? 'Please enter a valid name (letters and spaces only)' : '';
      case 'expiryDate':
        return control.errors['pattern'] ? 'Please enter a valid expiry date (MM/YY)' : '';
      case 'cvv':
        return control.errors['pattern'] ? 'Please enter a valid CVV (3-4 digits)' : '';
      default:
        return '';
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  completeBooking(): void {
    if (!this.selectedPaymentMethod && !this.showNewCardForm) {
      this.error = 'Please select a payment method';
      return;
    }

    if (this.showNewCardForm && this.newCardForm.invalid) {
      this.markFormGroupTouched(this.newCardForm);
      return;
    }

    if (!this.bookingSummary || !this.selectedSeats.length) {
      this.error = 'Invalid booking data';
      return;
    }

    this.processing = true;
    this.error = '';

    // If adding a new card, save it first
    if (this.showNewCardForm) {
      this.addNewCard();
      return;
    }

    // Get customer info from booking summary
    const customerName = this.bookingSummary.customer?.name || 'Guest User';
    const customerEmail = this.bookingSummary.customer?.email || 'guest@example.com';
    const customerPhone = this.bookingSummary.customer?.phone || '';

    // Validate seat data before creating booking request
    if (this.selectedSeats.some(seat => !seat.id)) {
      this.error = 'Invalid seat data. Please go back and select seats again.';
      this.processing = false;
      return;
    }
    
    // Calculate final amount (with promotion discount if applied)
    const finalAmount = this.getFinalTotal();
    
    // Create booking request
    const bookingRequest: BookingRequest = {
      amount: finalAmount,
      totalAmount: finalAmount,
      showId: this.showId,
      scheduleId: this.scheduleId,
      seats: this.selectedSeats.map(seat => ({
        seatId: seat.id as number, // Cast to number to ensure it's not undefined
        row: seat.row,
        seatNumber: seat.seatNumber,
        price: seat.price,
        category: seat.category || SeatCategory.STANDARD // Default to STANDARD if category is undefined
      })),
      paymentMethodId: this.selectedPaymentMethod?.id || '',
      customerName: customerName,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
      sessionId: localStorage.getItem('seat_reservation_session') || undefined, // Include the seat reservation session ID
      promotionCode: this.promotionApplied ? this.promotionCode.trim() : undefined // Include promotion code if applied
    };
    
    console.log('Booking request created with seats:', this.selectedSeats);

    // Process booking
    this.bookingService.createBooking(bookingRequest)
      .pipe(
        finalize(() => this.processing = false)
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            console.log('Booking successful, navigating to confirmation page with data:', response);
            
            // Store booking data in session storage for backup
            try {
              sessionStorage.setItem('bookingResponse', JSON.stringify(response));
              sessionStorage.setItem('bookingSummary', JSON.stringify(this.bookingSummary));
              console.log('Stored booking data in session storage');
            } catch (error) {
              console.error('Error storing booking data in session storage:', error);
            }
            
            // Navigate to confirmation page with complete booking response
            this.router.navigate(['/booking/confirmation'], {
              state: {
                bookingResponse: response,
                bookingSummary: this.bookingSummary
              }
            });
          } else {
            this.error = response.message || 'Booking could not be confirmed';
          }
        },
        error: (error) => {
          console.error('Booking error:', error);
          
          // Check if it's a 400 Bad Request error related to seats
          if (error.status === 400 && error.error && error.error.message) {
            if (error.error.message.includes('seats')) {
              this.error = 'The selected seats are no longer available. Please go back and select different seats.';
            } else {
              this.error = error.error.message;
            }
          } else {
            this.error = error.message || 'Failed to create booking. Please try again.';
          }
          
          // Don't add a retry button to the error message, we'll use the one in the template
        }
      });
  }

  getBadgeClass(seat: { category?: SeatCategory | string }): string {
    if (!seat.category) return 'bg-secondary';
    return `bg-${this.SEAT_CATEGORY_METADATA[seat.category as SeatCategory]?.color || 'secondary'}`;
  }

  getCategoryDisplayName(category: SeatCategory | string | undefined): string {
    if (!category) return 'Standard';
    return this.SEAT_CATEGORY_METADATA[category as SeatCategory]?.displayName || 'Standard';
  }

  /**
   * Apply promotion code
   */
  applyPromotionCode(): void {
    if (!this.promotionCode || this.promotionCode.trim() === '') {
      this.promotionMessage = 'Please enter a promotion code';
      return;
    }

    console.log('Applying promotion code:', this.promotionCode);
    this.processing = true;
    this.promotionMessage = '';

    // Validate promotion code
    this.bookingService.validatePromotionCode(this.promotionCode.trim()).subscribe({
      next: (response) => {
        console.log('Promotion validation response:', response);
        
        if (response.valid && response.promotion) {
          // Calculate discount
          const discountRequest = {
            code: this.promotionCode.trim(),
            price: this.bookingSummary?.pricing.total || 0
          };

          this.bookingService.calculateDiscount(discountRequest).subscribe({
            next: (discountResponse) => {
              console.log('Discount calculation response:', discountResponse);
              
              this.appliedPromotion = response.promotion;
              this.promotionDiscount = discountResponse.discountAmount;
              this.promotionApplied = true;
              this.promotionMessage = `Promotion "${response.promotion.name}" applied successfully!`;
              
              // Update booking summary with discount
              if (this.bookingSummary) {
                this.bookingSummary.pricing.discount = this.promotionDiscount;
                this.bookingSummary.pricing.discountCode = this.promotionCode.trim();
                this.bookingSummary.pricing.savings = this.promotionDiscount;
              }
              
              this.processing = false;
            },
            error: (error) => {
              console.error('Error calculating discount:', error);
              this.promotionMessage = 'Failed to calculate discount. Please try again.';
              this.processing = false;
            }
          });
        } else {
          this.promotionMessage = 'Invalid or expired promotion code';
          this.processing = false;
        }
      },
      error: (error) => {
        console.error('Error validating promotion:', error);
        this.promotionMessage = 'Failed to validate promotion code. Please try again.';
        this.processing = false;
      }
    });
  }

  /**
   * Remove applied promotion code
   */
  removePromotionCode(): void {
    this.promotionCode = '';
    this.promotionApplied = false;
    this.promotionMessage = '';
    this.appliedPromotion = null;
    this.promotionDiscount = 0;

    // Update booking summary to remove discount
    if (this.bookingSummary) {
      this.bookingSummary.pricing.discount = 0;
      this.bookingSummary.pricing.discountCode = '';
      this.bookingSummary.pricing.savings = 0;
    }
  }

  /**
   * Check for stored promotion code from home page
   */
  checkForStoredPromotionCode(): void {
    const storedCode = sessionStorage.getItem('selectedPromotionCode');
    if (storedCode) {
      console.log('Found stored promotion code:', storedCode);
      this.promotionCode = storedCode;
      
      // Auto-apply the promotion code
      setTimeout(() => {
        this.applyPromotionCode();
        // Clear the stored code after applying
        sessionStorage.removeItem('selectedPromotionCode');
      }, 1000);
    }
  }

  /**
   * Get final total after applying promotion discount
   */
  getFinalTotal(): number {
    if (!this.bookingSummary) return 0;
    
    const originalTotal = this.bookingSummary.pricing.total;
    const discount = this.promotionApplied ? this.promotionDiscount : 0;
    const finalTotal = originalTotal - discount;
    
    return Math.max(0, finalTotal); // Ensure total doesn't go below 0
  }

  // The processPayment method is now handled within the createBooking method in the BookingService
  // This method is kept for reference but is no longer used
  private processPayment(bookingId: number): void {
    console.log('This method is deprecated. Payment is now processed as part of the booking creation.');
  }
}