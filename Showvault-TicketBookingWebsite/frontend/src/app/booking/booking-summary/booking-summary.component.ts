import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { 
  BookingSummary, 
  BookingStatus,
  BOOKING_STATUS_METADATA,
  PaymentStatus,
  PAYMENT_STATUS_METADATA,
  PaymentMethodType,
  PAYMENT_METHOD_METADATA
} from '../../models/booking.model';
import { ImageService } from '../../services/image.service';

@Component({
  selector: 'app-booking-summary',
  templateUrl: './booking-summary.component.html',
  styleUrls: ['./booking-summary.component.css']
})
export class BookingSummaryComponent implements OnInit {
  @Input() summary: BookingSummary | null = null;
  @Input() showEditButton = false;
  @Input() showPaymentButton = false;
  @Input() isProcessing = false;
  
  @Output() editSeats = new EventEmitter<void>();
  @Output() proceedToPayment = new EventEmitter<void>();
  
  // Make enums and metadata available to template
  BookingStatus = BookingStatus;
  BOOKING_STATUS_METADATA = BOOKING_STATUS_METADATA;
  PaymentStatus = PaymentStatus;
  PAYMENT_STATUS_METADATA = PAYMENT_STATUS_METADATA;
  PaymentMethodType = PaymentMethodType;
  PAYMENT_METHOD_METADATA = PAYMENT_METHOD_METADATA;
  
  constructor(private imageService: ImageService) { }
  
  // This function is defined again below, so removing this duplicate
  
  onEditSeats(): void {
    this.editSeats.emit();
  }
  
  onProceedToPayment(): void {
    console.log('Payment button clicked');
    this.proceedToPayment.emit();
  }
  
  formatDate(dateValue: string | Date): string {
    try {
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return String(dateValue);
    }
  }
  
  formatTime(timeString: string): string {
    try {
      // Assuming time is in HH:mm format
      const [hours, minutes] = timeString.split(':');
      const time = new Date();
      time.setHours(parseInt(hours), parseInt(minutes));
      
      return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString;
    }
  }
  
  getPaymentMethodIcon(paymentMethod: any): string {
    if (!paymentMethod) return 'bi-credit-card';
    
    try {
      // If it's an object with a type property
      if (typeof paymentMethod === 'object' && paymentMethod.type) {
        const methodType = paymentMethod.type as PaymentMethodType;
        if (PAYMENT_METHOD_METADATA[methodType]) {
          return 'bi-' + PAYMENT_METHOD_METADATA[methodType].icon;
        }
        
        // If it has an icon property, use that
        if (paymentMethod.icon) {
          return 'bi-' + paymentMethod.icon;
        }
      }
      
      // If it's a string, try to match with a known payment method type
      if (typeof paymentMethod === 'string') {
        const methodType = paymentMethod as PaymentMethodType;
        if (PAYMENT_METHOD_METADATA[methodType]) {
          return 'bi-' + PAYMENT_METHOD_METADATA[methodType].icon;
        }
        
        // Default fallbacks based on common terms
        if (paymentMethod.toLowerCase().includes('card')) return 'bi-credit-card';
        if (paymentMethod.toLowerCase().includes('paypal')) return 'bi-paypal';
        if (paymentMethod.toLowerCase().includes('google')) return 'bi-google';
        if (paymentMethod.toLowerCase().includes('apple')) return 'bi-apple';
      }
      
      // Default
      return 'bi-credit-card';
    } catch (error) {
      console.error('Error getting payment method icon:', error);
      return 'bi-credit-card';
    }
  }
  
  formatPaymentMethod(paymentMethod: any): string {
    if (!paymentMethod) return 'Credit Card';
    
    try {
      // If it's an object with a name property, use that
      if (typeof paymentMethod === 'object' && paymentMethod.name) {
        return paymentMethod.name;
      }
      
      // If it's an object with a type property
      if (typeof paymentMethod === 'object' && paymentMethod.type) {
        const methodType = paymentMethod.type as PaymentMethodType;
        if (PAYMENT_METHOD_METADATA[methodType]) {
          return PAYMENT_METHOD_METADATA[methodType].displayName;
        }
      }
      
      // If it's a string, try to match with a known payment method type
      if (typeof paymentMethod === 'string') {
        const methodType = paymentMethod as PaymentMethodType;
        if (PAYMENT_METHOD_METADATA[methodType]) {
          return PAYMENT_METHOD_METADATA[methodType].displayName;
        }
        
        // If it's not a known type, just return the string with proper formatting
        return paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      
      return 'Credit Card';
    } catch (error) {
      console.error('Error formatting payment method:', error);
      return String(paymentMethod);
    }
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
  
  /**
   * Initialize image enhancement for the show in the summary
   */
  ngOnInit(): void {
    if (this.summary?.show && this.summary.show.title) {
      // Enhance the show image for all show types
      this.imageService.getSpecificMovieImage(
        this.summary.show.title,
        this.summary.show.type || 'Show',
        '',
        this.summary.show.posterUrl || this.summary.show.imageUrl || this.summary.show.image || ''
      ).subscribe(imageUrl => {
        if (this.summary && this.summary.show) {
          // Set all image properties for consistency
          this.summary.show.image = imageUrl;
          this.summary.show.imageUrl = imageUrl;
          this.summary.show.posterUrl = imageUrl;
        }
      });
    }
  }
}