import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { BookingService } from '../../services/booking.service';
import { ImageService } from '../../services/image.service';
import { 
  BookingResponse, 
  BookingSummary, 
  BookingStatus, 
  BOOKING_STATUS_METADATA,
  PaymentStatus,
  PAYMENT_STATUS_METADATA
} from '../../models/booking.model';
import { SeatCategory, SEAT_CATEGORY_METADATA } from '../../models/show.model';

@Component({
  selector: 'app-booking-confirmation',
  templateUrl: './booking-confirmation.component.html',
  styleUrls: ['./booking-confirmation.component.css']
})
export class BookingConfirmationComponent implements OnInit, OnDestroy {
  bookingResponse: BookingResponse | null = null;
  bookingSummary: BookingSummary | null = null;
  downloadingTicket = false;
  error = '';
  qrCodeData: string | null = null;
  qrCodeImageUrl: string | null = null;
  
  // Make enums and metadata available to the template
  BookingStatus = BookingStatus;
  BOOKING_STATUS_METADATA = BOOKING_STATUS_METADATA;
  PaymentStatus = PaymentStatus;
  PAYMENT_STATUS_METADATA = PAYMENT_STATUS_METADATA;
  SEAT_CATEGORY_METADATA = SEAT_CATEGORY_METADATA;
  
  /**
   * Get image URL with fallback to appropriate default image
   * @param imageUrl The original image URL
   * @param type The type of content (show, movie, concert, etc.)
   * @param subType Optional subtype for more specific images (action, rock, ballet, etc.)
   * @param title Optional title for searching specific content images
   * @returns A valid image URL
   */
  getImageUrl(imageUrl: string | null | undefined, type: string, subType: string = '', title: string = ''): string {
    return this.imageService.getImageUrl(imageUrl, type, subType, title);
  }

  constructor(
    private router: Router,
    private bookingService: BookingService,
    private imageService: ImageService
  ) {
    // Refresh user bookings when the confirmation page is loaded
    // Add a small delay to ensure the backend has processed everything
    setTimeout(() => {
      this.bookingService.getUserBookings().subscribe({
        next: bookings => {
          console.log('User bookings from confirmation page:', bookings);
          if (bookings.length === 0) {
            console.warn('No bookings found for user. This might indicate an issue with booking creation or retrieval.');
          } else {
            console.log(`Found ${bookings.length} bookings for user`);
            // Log each booking for debugging
            bookings.forEach(booking => {
              console.log(`Booking ID: ${booking.id}, Number: ${booking.bookingNumber}, Status: ${booking.status}`);
            });
          }
        },
        error: error => {
          console.error('Error fetching user bookings from confirmation page:', error);
        }
      });
    }, 1000);
  }

  ngOnInit(): void {
    // Get data from router state
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as {
      bookingResponse: BookingResponse;
      bookingSummary: BookingSummary;
    };
    
    // Initialize QR code data
    this.qrCodeData = null;
    this.qrCodeImageUrl = null;
    
    // Helper function to enhance show image
    const enhanceShowImage = (summary: BookingSummary | null) => {
      if (summary && summary.show && summary.show.title) {
        console.log(`Enhancing image for show in booking summary: ${summary.show.title}`);
        this.imageService.getSpecificMovieImage(
          summary.show.title, 
          summary.show.type || 'Show', 
          '',
          summary.show.posterUrl || summary.show.imageUrl || summary.show.image || ''
        ).subscribe(imageUrl => {
          console.log(`Setting image URL for booking summary show ${summary.show.title} to: ${imageUrl}`);
          // Set all image properties for consistency
          summary.show.imageUrl = imageUrl;
          summary.show.image = imageUrl;
          summary.show.posterUrl = imageUrl;
        });
      }
    };
    
    if (state && state.bookingResponse && state.bookingSummary) {
      console.log('Booking confirmation received state:', state);
      this.bookingResponse = state.bookingResponse;
      this.bookingSummary = state.bookingSummary;
      
      // Enhance show image
      enhanceShowImage(this.bookingSummary);
      
      // Ensure booking status is set to CONFIRMED
      if (this.bookingResponse && this.bookingResponse.booking) {
        if (!this.bookingResponse.booking.status) {
          console.log('Setting missing booking status to CONFIRMED');
          this.bookingResponse.booking.status = BookingStatus.CONFIRMED;
        }
      }
      
      // Store in session storage for page refreshes
      try {
        sessionStorage.setItem('bookingResponse', JSON.stringify(this.bookingResponse));
        sessionStorage.setItem('bookingSummary', JSON.stringify(this.bookingSummary));
        console.log('Stored booking data in session storage');
      } catch (error) {
        console.error('Error storing booking data in session storage:', error);
      }
      
      // Generate QR code if booking data is available
      this.generateQRCode();
    } else {
      // Try to get from session storage (for page refreshes)
      const storedResponse = sessionStorage.getItem('bookingResponse');
      const storedSummary = sessionStorage.getItem('bookingSummary');
      
      if (storedResponse && storedSummary) {
        this.bookingResponse = JSON.parse(storedResponse);
        this.bookingSummary = JSON.parse(storedSummary);
        
        // Enhance show image
        enhanceShowImage(this.bookingSummary);
        
        // Ensure booking status is set to CONFIRMED
        if (this.bookingResponse && this.bookingResponse.booking) {
          if (!this.bookingResponse.booking.status) {
            console.log('Setting missing booking status to CONFIRMED');
            this.bookingResponse.booking.status = BookingStatus.CONFIRMED;
          }
        }
        
        // Generate QR code if booking data is available
        this.generateQRCode();
      } else {
        // Try to get from history state
        const historyState = window.history.state;
        if (historyState && historyState.bookingResponse && historyState.bookingSummary) {
          this.bookingResponse = historyState.bookingResponse;
          this.bookingSummary = historyState.bookingSummary;
          
          // Enhance show image
          enhanceShowImage(this.bookingSummary);
          
          // Ensure booking status is set to CONFIRMED
          if (this.bookingResponse && this.bookingResponse.booking) {
            if (!this.bookingResponse.booking.status) {
              console.log('Setting missing booking status to CONFIRMED');
              this.bookingResponse.booking.status = BookingStatus.CONFIRMED;
            }
          }
          
          // Store in session storage
          try {
            sessionStorage.setItem('bookingResponse', JSON.stringify(this.bookingResponse));
            sessionStorage.setItem('bookingSummary', JSON.stringify(this.bookingSummary));
          } catch (error) {
            console.error('Error storing booking data in session storage:', error);
          }
          
          // Generate QR code if booking data is available
          this.generateQRCode();
        } else {
          // Try to get the most recent booking from the user's bookings
          this.bookingService.getUserBookings().subscribe({
            next: (bookings) => {
              if (bookings && bookings.length > 0) {
                // Sort by booking date to get the most recent booking
                const sortedBookings = [...bookings].sort((a, b) => {
                  const dateA = new Date(a.bookingDate || 0).getTime();
                  const dateB = new Date(b.bookingDate || 0).getTime();
                  return dateB - dateA;
                });
                
                const mostRecentBooking = sortedBookings[0];
                console.log('Using most recent booking as fallback:', mostRecentBooking);
                
                // Create a booking response from the most recent booking
                this.bookingResponse = {
                  booking: mostRecentBooking,
                  success: true,
                  confirmationCode: mostRecentBooking.bookingNumber || '',
                  message: 'Booking confirmed successfully'
                };
                
                // Create a booking summary from the most recent booking
                const seatDetails = mostRecentBooking.seatBookings?.map(sb => ({
                  row: sb.seat?.rowName || '',
                  seatNumber: sb.seat?.seatNumber || 0,
                  price: sb.price || 0,
                  category: sb.seat?.category || ''
                })) || [];
                
                this.bookingSummary = {
                  show: {
                    id: mostRecentBooking.showSchedule?.show?.id || 0,
                    title: mostRecentBooking.showSchedule?.show?.title || mostRecentBooking.showName || 'Show',
                    type: mostRecentBooking.showSchedule?.show?.type || 'Movie',
                    image: mostRecentBooking.showSchedule?.show?.posterUrl || '',
                    posterUrl: mostRecentBooking.showSchedule?.show?.posterUrl || '',
                    imageUrl: ''
                  },
                  schedule: {
                    id: mostRecentBooking.showSchedule?.id || 0,
                    date: mostRecentBooking.showDate ? new Date(mostRecentBooking.showDate).toISOString().split('T')[0] : 
                          (mostRecentBooking.showSchedule?.showDate ? new Date(mostRecentBooking.showSchedule.showDate).toISOString().split('T')[0] : ''),
                    time: mostRecentBooking.showDate ? new Date(mostRecentBooking.showDate).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) :
                          (mostRecentBooking.showSchedule?.startTime || '19:00'),
                    venue: mostRecentBooking.venueName || mostRecentBooking.showSchedule?.venue?.name || 'Venue'
                  },
                  seats: {
                    count: seatDetails.length,
                    details: seatDetails
                  },
                  pricing: {
                    subtotal: mostRecentBooking.totalAmount || 0,
                    fees: 0,
                    taxes: 0,
                    total: mostRecentBooking.totalAmount || 0
                  },
                  customer: {
                    name: mostRecentBooking.user?.firstName + ' ' + mostRecentBooking.user?.lastName || '',
                    email: mostRecentBooking.user?.email || '',
                    phone: mostRecentBooking.user?.phoneNumber || ''
                  },
                  bookingNumber: mostRecentBooking.bookingNumber || '',
                  venue: mostRecentBooking.showSchedule?.venue?.name || 'Venue'
                };
                
                // Enhance show image
                enhanceShowImage(this.bookingSummary);
                
                // Store in session storage
                try {
                  sessionStorage.setItem('bookingResponse', JSON.stringify(this.bookingResponse));
                  sessionStorage.setItem('bookingSummary', JSON.stringify(this.bookingSummary));
                } catch (error) {
                  console.error('Error storing booking data in session storage:', error);
                }
                
                // Generate QR code
                this.generateQRCode();
              } else {
                // No bookings found, redirect back to shows
                this.error = 'Booking information not found. Redirecting to shows...';
                setTimeout(() => {
                  this.router.navigate(['/shows']);
                }, 3000);
              }
            },
            error: (error) => {
              console.error('Error fetching user bookings:', error);
              this.error = 'Failed to retrieve booking information. Redirecting to shows...';
              setTimeout(() => {
                this.router.navigate(['/shows']);
              }, 3000);
            }
          });
        }
      }
    }
  }


  
  // Helper method to try alternative download methods
  private tryAlternativeDownload(alternativeNumber: string | null, bookingId: number | undefined): void {
    let downloadMethod: Observable<Blob>;
    let identifier: string;
    
    if (alternativeNumber) {
      downloadMethod = this.bookingService.downloadTicketByNumber(alternativeNumber);
      identifier = alternativeNumber;
    } else if (bookingId) {
      downloadMethod = this.bookingService.downloadTicket(bookingId);
      identifier = bookingId.toString();
    } else {
      this.handleDownloadError(new Error('No alternative download method available'));
      return;
    }
    
    downloadMethod.subscribe({
      next: (blob: Blob) => {
        if (!blob || blob.size === 0) {
          this.error = 'Unable to generate ticket. Please try again later.';
          this.downloadingTicket = false;
          return;
        }
        
        try {
          // Create and trigger download
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `ticket-${identifier}.pdf`;
          document.body.appendChild(link);
          link.click();
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }, 100);
          
          this.downloadingTicket = false;
        } catch (error) {
          console.error('Error creating download link:', error);
          this.error = 'Failed to download ticket. Please try again.';
          this.downloadingTicket = false;
        }
      },
      error: (secondError: any) => {
        console.error('Error downloading ticket with alternative method:', secondError);
        this.handleDownloadError(secondError);
      }
    });
  }
  
  // Helper method to handle download errors
  private handleDownloadError(error: any): void {
    this.downloadingTicket = false;
    
    console.error('Download error details:', error);
    
    switch (error.status) {
      case 404:
        this.error = 'Ticket not found. Please ensure your booking is confirmed.';
        break;
      case 403:
        this.error = 'You are not authorized to download this ticket.';
        break;
      case 400:
        this.error = 'Cannot generate ticket. Your booking may not be confirmed yet.';
        break;
      case 500:
        this.error = 'Server error while generating ticket. Please try again later.';
        break;
      default:
        this.error = 'Failed to download ticket. Please try again later or contact support.';
    }
    
    // Log the final error message
    console.error('Final error message displayed to user:', this.error);

    // Clear error message after 5 seconds
    setTimeout(() => {
      this.error = '';
    }, 5000);
  }

  viewBookings(): void {
    this.clearBookingData();
    this.router.navigate(['/user/bookings']);
  }

  browseShows(): void {
    this.clearBookingData();
    this.router.navigate(['/shows']);
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  formatTime(timeString: string): string {
    return timeString;
  }
  
  ngOnDestroy(): void {
    // Clear session storage when navigating away
    this.clearBookingData();
  }
  
  // Helper method to clear session storage
  clearBookingData(): void {
    try {
      sessionStorage.removeItem('bookingResponse');
      sessionStorage.removeItem('bookingSummary');
    } catch (error) {
      console.error('Error clearing booking data from session storage:', error);
    }
  }
  
  // Generate QR code for the booking
  generateQRCode(): void {
    if (!this.bookingResponse?.booking?.id) {
      console.warn('No booking ID available for QR code generation');
      console.warn('Booking response:', this.bookingResponse);
      return;
    }

    const bookingId = this.bookingResponse.booking.id;
    console.log('Generating QR code for booking ID:', bookingId);

    this.bookingService.getBookingQRCode(bookingId).subscribe({
      next: (response) => {
        console.log('QR code response received:', response);
        if (response && response.qrCodeData) {
          this.qrCodeData = response.qrCodeData;
          console.log('QR code data set:', this.qrCodeData);
          
          // Convert QR code data to image URL if it's base64
          if (response.qrCodeImage) {
            this.qrCodeImageUrl = `data:image/png;base64,${response.qrCodeImage}`;
            console.log('QR code image URL set');
          } else {
            console.warn('No QR code image in response');
          }
        } else {
          console.warn('No QR code data in response:', response);
        }
      },
      error: (error) => {
        console.error('Error generating QR code:', error);
        console.error('Error details:', error.error);
        this.error = 'Failed to generate QR code';
      }
    });
  }

  getStatusColor(status: BookingStatus): string {
    return BOOKING_STATUS_METADATA[status]?.color || 'bg-secondary';
  }

  getStatusDisplayName(status: BookingStatus | string): string {
    // Handle both enum and string values
    const bookingStatus = typeof status === 'string' ? this.mapStringToBookingStatus(status) : status;
    return BOOKING_STATUS_METADATA[bookingStatus]?.displayName || 'Unknown';
  }

  // Helper method to map string status to BookingStatus enum
  private mapStringToBookingStatus(status: string): BookingStatus {
    const upperStatus = status.toUpperCase();
    switch (upperStatus) {
      case 'PENDING': return BookingStatus.PENDING;
      case 'CONFIRMED': return BookingStatus.CONFIRMED;
      case 'CANCELLED': return BookingStatus.CANCELLED;
      case 'COMPLETED': return BookingStatus.COMPLETED;
      case 'EXPIRED': return BookingStatus.EXPIRED;
      case 'REFUND_REQUESTED': return BookingStatus.REFUND_REQUESTED;
      case 'REFUNDED': return BookingStatus.REFUNDED;
      default: return BookingStatus.CONFIRMED; // Default to confirmed
    }
  }

  getCategoryDisplayName(category: SeatCategory | string | undefined): string {
    if (!category) return 'Standard';
    return this.SEAT_CATEGORY_METADATA[category as SeatCategory]?.displayName || 'Standard';
  }

  /**
   * Download ticket as PDF
   */
  downloadTicket(): void {
    if (!this.bookingResponse?.booking) {
      this.error = 'No booking data available for ticket generation';
      return;
    }

    this.downloadingTicket = true;
    this.error = '';

    // Generate ticket content
    const ticketContent = this.generateTicketHTML();
    
    // Create and download PDF
    this.generatePDF(ticketContent);
  }

  /**
   * Generate HTML content for the ticket
   */
  private generateTicketHTML(): string {
    const booking = this.bookingResponse?.booking;
    const summary = this.bookingSummary;
    
    if (!booking || !summary) {
      return '<p>Error: Missing booking data</p>';
    }

    const promotionSection = summary.pricing?.discount && summary.pricing.discount > 0 ? `
      <div class="promotion-section">
        <h4>🎟️ Promotion Applied</h4>
        <p><strong>Code:</strong> ${summary.pricing.discountCode || 'N/A'}</p>
        <p><strong>Discount:</strong> ₹${summary.pricing.discount.toFixed(2)}</p>
        <p><strong>You Saved:</strong> ₹${(summary.pricing.savings || summary.pricing.discount).toFixed(2)}</p>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ticket - ${summary.show?.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .ticket { border: 2px solid #e74c3c; border-radius: 10px; padding: 20px; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px dashed #e74c3c; padding-bottom: 20px; margin-bottom: 20px; }
          .title { color: #e74c3c; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .booking-number { background: #e74c3c; color: white; padding: 5px 15px; border-radius: 20px; display: inline-block; }
          .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .section { background: #f8f9fa; padding: 15px; border-radius: 5px; }
          .section h4 { margin-top: 0; color: #e74c3c; }
          .seats { margin: 20px 0; }
          .seat-item { display: inline-block; margin: 5px; padding: 5px 10px; background: #28a745; color: white; border-radius: 5px; }
          .pricing { border-top: 2px dashed #e74c3c; padding-top: 20px; }
          .total { font-size: 18px; font-weight: bold; color: #e74c3c; }
          .promotion-section { background: #e8f5e8; border: 1px solid #28a745; border-radius: 5px; padding: 15px; margin: 15px 0; }
          .qr-section { text-align: center; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <div class="title">${summary.show?.title || 'Show Ticket'}</div>
            <div class="booking-number">Booking #${booking.bookingNumber}</div>
          </div>
          
          <div class="details">
            <div class="section">
              <h4>📅 Show Details</h4>
              <p><strong>Type:</strong> ${summary.show?.type || 'N/A'}</p>
              <p><strong>Venue:</strong> ${summary.schedule?.venue || 'N/A'}</p>
              <p><strong>Date:</strong> ${summary.schedule?.date ? new Date(summary.schedule.date).toLocaleDateString() : 'N/A'}</p>
              <p><strong>Time:</strong> ${summary.schedule?.time || 'N/A'}</p>
            </div>
            
            <div class="section">
              <h4>👤 Booking Details</h4>
              <p><strong>Status:</strong> ${booking.status}</p>
              <p><strong>Booked On:</strong> ${booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString() : 'N/A'}</p>
              <p><strong>Total Seats:</strong> ${summary.seats?.count || 0}</p>
            </div>
          </div>
          
          <div class="seats">
            <h4>🎫 Selected Seats</h4>
            ${summary.seats?.details?.map(seat => 
              `<span class="seat-item">${seat.row}${seat.seatNumber} (${seat.category})</span>`
            ).join('') || '<p>No seat details available</p>'}
          </div>
          
          ${promotionSection}
          
          <div class="pricing">
            <h4>💰 Payment Summary</h4>
            <p>Subtotal: ₹${summary.pricing?.subtotal?.toFixed(2) || '0.00'}</p>
            <p>Booking Fee: ₹${summary.pricing?.fees?.toFixed(2) || '0.00'}</p>
            <p>Tax: ₹${summary.pricing?.taxes?.toFixed(2) || '0.00'}</p>
            ${summary.pricing?.discount && summary.pricing.discount > 0 ? 
              `<p style="color: #28a745;">Promotion Discount: -₹${summary.pricing.discount.toFixed(2)}</p>` : ''}
            <p class="total">Total Paid: ₹${booking.totalAmount?.toFixed(2) || summary.pricing?.total?.toFixed(2) || '0.00'}</p>
          </div>
          
          <div class="qr-section">
            <p><strong>Booking Reference:</strong> ${booking.bookingNumber}</p>
            <p style="font-size: 12px;">Present this ticket at the venue for entry</p>
          </div>
          
          <div class="footer">
            <p>Thank you for booking with ShowVault!</p>
            <p>For support, contact us at support@showvault.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate and download PDF from HTML content
   */
  private generatePDF(htmlContent: string): void {
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Unable to open print window. Please check your popup blocker settings.');
      }

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          this.downloadingTicket = false;
        }, 500);
      };

      // Fallback in case onload doesn't fire
      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          printWindow.print();
          printWindow.close();
        }
        this.downloadingTicket = false;
      }, 2000);

    } catch (error) {
      console.error('Error generating ticket:', error);
      this.error = 'Failed to generate ticket. Please try again.';
      this.downloadingTicket = false;
    }
  }
}