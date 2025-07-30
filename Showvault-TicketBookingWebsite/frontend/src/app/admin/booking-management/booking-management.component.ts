import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { BookingService } from '../../services/booking.service';
import { Booking, BookingStatus, PaymentStatus } from '../../models/booking.model';

@Component({
  selector: 'app-booking-management',
  templateUrl: './booking-management.component.html',
  styleUrls: ['./booking-management.component.css']
})
export class BookingManagementComponent implements OnInit {
  bookings: Booking[] = [];
  totalBookings = 0;
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  isLoading = false;
  error = '';
  success = '';
  selectedBooking: Booking | null = null;
  showBookingDetails = false;
  BookingStatus = BookingStatus; // Make enum available to template
  PaymentStatus = PaymentStatus; // Make enum available to template
  Math = Math; // Make Math available to the template
  
  filterForm: FormGroup;

  constructor(
    private adminService: AdminService,
    private bookingService: BookingService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      status: ['all'],
      date: [null, this.dateValidator],  // Add date validator
      search: ['']
    });
  }
  
  /**
   * Custom validator for date format
   */
  dateValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    
    const dateValue = control.value;
    
    // If it's already in ISO format, it's valid
    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return null;
    }
    
    // Try to convert to a valid date
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return { invalidDate: true };
      }
      return null;
    } catch (error) {
      return { invalidDate: true };
    }
  }
  
  /**
   * Formats a date string to ISO format (YYYY-MM-DD)
   * @param dateStr The date string to format
   * @returns The formatted date string or undefined if invalid
   */
  private formatDateToISO(dateStr: string): string | undefined {
    if (!dateStr) return undefined;
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return undefined;
      
      // Format to YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return undefined;
    }
  }

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.isLoading = true;
    this.error = '';
    
    // Format the date to ISO format (YYYY-MM-DD) if it exists
    let formattedDate: string | undefined = undefined;
    if (this.filterForm.value.date) {
      const isoDate = this.formatDateToISO(this.filterForm.value.date);
      if (isoDate) {
        formattedDate = isoDate;
      }
      console.log('Original date value:', this.filterForm.value.date);
      console.log('Formatted date value:', formattedDate);
    }
    
    const filters = {
      status: this.filterForm.value.status !== 'all' ? this.filterForm.value.status : undefined,
      date: formattedDate, // This is now explicitly string | undefined
      search: this.filterForm.value.search || undefined
    };
    
    console.log('Loading bookings with filters:', filters);
    
    this.adminService.getBookings(this.currentPage, this.pageSize, filters.status, filters.date, filters.search).subscribe({
      next: (response) => {
        this.bookings = response.bookings;
        this.totalBookings = response.total;
        this.totalPages = Math.ceil(this.totalBookings / this.pageSize);
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Failed to load bookings. Please try again.';
        this.isLoading = false;
        console.error('Error loading bookings:', error);
      }
    });
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadBookings();
  }

  applyFilters(): void {
    this.currentPage = 1; // Reset to first page when filters change
    
    // Format the date if needed before applying filters
    if (this.filterForm.value.date) {
      const dateValue = this.filterForm.value.date;
      const formattedDate = this.formatDateToISO(dateValue);
      
      if (formattedDate && formattedDate !== dateValue) {
        this.filterForm.patchValue({ date: formattedDate });
        console.log('Converted date from', dateValue, 'to', formattedDate);
      }
    }
    
    console.log('Applying filters with date:', this.filterForm.value.date);
    this.loadBookings();
  }

  resetFilters(): void {
    // Reset the form with default values
    this.filterForm.reset({
      status: 'all',
      date: null,  // Use null instead of empty string for date
      search: ''
    });
    console.log('Filters reset, date value:', this.filterForm.value.date);
    this.applyFilters();
  }
  
  /**
   * Handle date input changes to ensure proper format
   */
  onDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    
    console.log('Date input changed to:', value);
    
    if (value) {
      // Ensure the date is in ISO format
      const formattedDate = this.formatDateToISO(value);
      console.log('Formatted date:', formattedDate);
      
      if (formattedDate && formattedDate !== value) {
        // Update the form control with the formatted date
        this.filterForm.patchValue({ date: formattedDate });
      }
    }
  }

  viewBookingDetails(booking: Booking): void {
    this.selectedBooking = booking;
    this.showBookingDetails = true;
  }

  closeBookingDetails(): void {
    this.showBookingDetails = false;
    this.selectedBooking = null;
  }

  updateBookingStatus(bookingId: number | undefined, status: BookingStatus): void {
    if (!bookingId) return;
    this.isLoading = true;
    this.error = '';
    
    this.adminService.updateBookingStatus(bookingId, status).subscribe({
      next: (updatedBooking) => {
        // Update booking in the list
        const index = this.bookings.findIndex(b => b.id === bookingId);
        if (index !== -1) {
          this.bookings[index] = updatedBooking;
        }
        this.isLoading = false;
        
        if (this.selectedBooking && this.selectedBooking.id === bookingId) {
          this.selectedBooking = updatedBooking;
        }
      },
      error: (error) => {
        this.error = `Failed to update booking status to ${status}. Please try again.`;
        this.isLoading = false;
        console.error('Error updating booking status:', error);
      }
    });
  }

  processRefund(bookingId: number | undefined): void {
    if (!bookingId || !confirm('Are you sure you want to process a refund for this booking?')) {
      return;
    }
    
    this.isLoading = true;
    this.error = '';
    
    this.adminService.processRefund(bookingId).subscribe({
      next: (updatedBooking) => {
        // Update booking in the list
        const index = this.bookings.findIndex(b => b.id === bookingId);
        if (index !== -1) {
          this.bookings[index] = updatedBooking;
        }
        this.isLoading = false;
        
        if (this.selectedBooking && this.selectedBooking.id === bookingId) {
          this.selectedBooking = updatedBooking;
        }
      },
      error: (error) => {
        this.error = 'Failed to process refund. Please try again.';
        this.isLoading = false;
        console.error('Error processing refund:', error);
      }
    });
  }

  // Helper method to format date
  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }

  // Helper method to format date and time
  formatDateTime(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }

  // Helper method to calculate total amount
  calculateTotal(booking: Booking): number {
    if (booking.totalAmount) {
      return booking.totalAmount;
    }
    
    // Calculate from seat bookings if available
    if (booking.seatBookings && booking.seatBookings.length > 0) {
      return booking.seatBookings.reduce((total, sb) => total + (sb.price || 0), 0);
    }
    
    // Calculate from seats if available
    if (booking.seats && booking.seats.length > 0) {
      return booking.seats.reduce((total, seat) => total + (seat.price || 0), 0);
    }
    
    return 0;
  }
  
  // Helper methods to extract booking information
  getUserName(booking: Booking | null): string {
    if (!booking) return 'N/A';
    
    if (booking.customerName) {
      return booking.customerName;
    }
    
    if (booking.userName) {
      return booking.userName;
    }
    
    if (booking.user) {
      if (booking.user.firstName && booking.user.lastName) {
        return `${booking.user.firstName} ${booking.user.lastName}`;
      }
      if (booking.user.username) {
        return booking.user.username;
      }
    }
    
    return 'N/A';
  }
  
  getUserEmail(booking: Booking | null): string {
    if (!booking) return 'N/A';
    
    if (booking.customerEmail) {
      return booking.customerEmail;
    }
    
    if (booking.userEmail) {
      return booking.userEmail;
    }
    
    if (booking.user && booking.user.email) {
      return booking.user.email;
    }
    
    return 'N/A';
  }
  
  getUserPhone(booking: Booking | null): string {
    if (!booking) return 'N/A';
    
    if (booking.customerPhone) {
      return booking.customerPhone;
    }
    
    if (booking.userPhone) {
      return booking.userPhone;
    }
    
    if (booking.user && booking.user.phoneNumber) {
      return booking.user.phoneNumber;
    }
    
    return 'N/A';
  }
  
  getShowName(booking: Booking | null): string {
    if (!booking) return 'N/A';
    
    if (booking.showName) {
      return booking.showName;
    }
    
    if (booking.showSchedule && booking.showSchedule.show && booking.showSchedule.show.title) {
      return booking.showSchedule.show.title;
    }
    
    if (booking.show && booking.show.title) {
      return booking.show.title;
    }
    
    return 'N/A';
  }
  
  getVenueName(booking: Booking | null): string {
    if (!booking) return 'N/A';
    
    if (booking.venueName) {
      return booking.venueName;
    }
    
    if (booking.showSchedule && booking.showSchedule.venue && booking.showSchedule.venue.name) {
      return booking.showSchedule.venue.name;
    }
    
    return 'N/A';
  }
  
  getShowDate(booking: Booking | null): string {
    if (!booking) return 'N/A';
    
    if (booking.showDate) {
      return this.formatDate(booking.showDate);
    }
    
    if (booking.showDateTime) {
      return this.formatDate(booking.showDateTime);
    }
    
    if (booking.showSchedule && booking.showSchedule.showDate) {
      return this.formatDate(booking.showSchedule.showDate);
    }
    
    return 'N/A';
  }
  
  getShowDateTime(booking: Booking | null): string {
    if (!booking) return 'N/A';
    
    if (booking.showDateTime) {
      return this.formatDateTime(booking.showDateTime);
    }
    
    if (booking.showSchedule) {
      const date = booking.showSchedule.showDate;
      const time = booking.showSchedule.startTime;
      
      if (date) {
        if (time) {
          return `${this.formatDate(date)} ${time}`;
        }
        return this.formatDate(date);
      }
    }
    
    return 'N/A';
  }
  
  getBookingDate(booking: Booking | null): string {
    if (!booking) return 'N/A';
    
    if (booking.bookingDate) {
      return this.formatDate(booking.bookingDate);
    }
    
    if (booking.createdAt) {
      return this.formatDate(booking.createdAt);
    }
    
    return 'N/A';
  }
  
  getPaymentMethod(booking: Booking | null): string {
    if (!booking) return 'N/A';
    
    if (booking.paymentMethod) {
      return booking.paymentMethod;
    }
    
    return 'N/A';
  }
  
  getTransactionId(booking: Booking | null): string {
    if (!booking) return 'N/A';
    
    if (booking.paymentId) {
      return booking.paymentId;
    }
    
    if (booking.transactionId) {
      return booking.transactionId;
    }
    
    return 'N/A';
  }
  
  getSeatsInfo(booking: Booking | null): string {
    if (!booking) return 'N/A';
    
    // Check for seatBookings (preferred)
    if (booking.seatBookings && booking.seatBookings.length > 0) {
      return booking.seatBookings.map(sb => {
        if (sb.seat) {
          return `${sb.seat.rowName}${sb.seat.seatNumber}`;
        }
        return '';
      }).filter(s => s).join(', ');
    }
    
    // Check for seats array
    if (booking.seats && booking.seats.length > 0) {
      // Check if seats are strings
      if (typeof booking.seats[0] === 'string') {
        return booking.seats.join(', ');
      }
      
      // Check if seats are objects
      return booking.seats.map(seat => {
        if (typeof seat === 'object') {
          if (seat.row && seat.seatNumber) {
            return `${seat.row}${seat.seatNumber}`;
          }
        }
        return '';
      }).filter(s => s).join(', ');
    }
    
    return 'N/A';
  }
  
  getNumberOfTickets(booking: Booking | null): number {
    if (!booking) return 0;
    
    if (booking.seatBookings && booking.seatBookings.length > 0) {
      return booking.seatBookings.length;
    }
    
    if (booking.seats && booking.seats.length > 0) {
      return booking.seats.length;
    }
    
    return 0;
  }
  
  getTicketPrice(booking: Booking | null): string {
    if (!booking) return 'N/A';
    
    // Try to get price from first seat booking
    if (booking.seatBookings && booking.seatBookings.length > 0 && booking.seatBookings[0].price) {
      return `₹${booking.seatBookings[0].price.toFixed(2)} each`;
    }
    
    // Try to get price from first seat
    if (booking.seats && booking.seats.length > 0) {
      const seat = booking.seats[0];
      if (typeof seat === 'object' && seat.price) {
        return `₹${seat.price.toFixed(2)} each`;
      }
    }
    
    // Try to get from ticket price
    if (booking.ticketPrice) {
      return `₹${booking.ticketPrice.toFixed(2)} each`;
    }
    
    // Calculate average from total
    const numTickets = this.getNumberOfTickets(booking);
    if (numTickets > 0) {
      const total = this.calculateTotal(booking);
      return `₹${(total / numTickets).toFixed(2)} each`;
    }
    
    return 'N/A';
  }
  
  // Download ticket
  downloadTicket(bookingId: number): void {
    if (!bookingId) return;
    
    console.log('Downloading ticket for booking ID:', bookingId);
    
    // Find the booking to get the booking number if needed
    const booking = this.bookings.find(b => b.id === bookingId);
    // Use bookingNumber if available, otherwise fall back to confirmationCode
    const bookingNumber = booking?.bookingNumber || booking?.confirmationCode;
    
    this.bookingService.downloadTicket(bookingId).subscribe({
      next: (blob) => {
        if (blob.size === 0) {
          this.error = 'Empty ticket received. Please try again later.';
          return;
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-${bookingId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: (error) => {
        console.error('Error downloading ticket by ID:', error);
        
        // If downloading by ID fails and we have a booking number, try by booking number
        if (bookingNumber) {
          console.log('Trying to download by booking number:', bookingNumber);
          
          this.bookingService.downloadTicketByNumber(bookingNumber).subscribe({
            next: (blob) => {
              if (blob.size === 0) {
                this.error = 'Empty ticket received. Please try again later.';
                return;
              }
              
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `ticket-${bookingNumber}.pdf`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            },
            error: (secondError) => {
              console.error('Error downloading ticket by booking number:', secondError);
              this.error = 'Failed to download ticket. Please try again later or contact support.';
              
              // Clear error message after 3 seconds
              setTimeout(() => {
                this.error = '';
              }, 3000);
            }
          });
        } else {
          this.error = 'Failed to download ticket. Please try again.';
          
          // Clear error message after 3 seconds
          setTimeout(() => {
            this.error = '';
          }, 3000);
        }
      }
    });
  }

  /**
   * Get the appropriate CSS class for status badge based on booking status
   */
  getStatusBadgeClass(booking: Booking | null): string {
    if (!booking) return 'bg-secondary';
    
    // Check if payment is refunded first (highest priority)
    if (booking.paymentStatus === PaymentStatus.REFUNDED || 
        booking.paymentStatus === 'REFUNDED' as any) {
      return 'bg-info';
    }
    
    // Then check booking status
    const status = booking.status;
    switch (status) {
      case BookingStatus.CONFIRMED:
      case 'CONFIRMED':
        return 'bg-success';
      case BookingStatus.PENDING:
      case 'PENDING':
        return 'bg-warning';
      case BookingStatus.CANCELLED:
      case 'CANCELLED':
        return 'bg-danger';
      case BookingStatus.COMPLETED:
      case 'COMPLETED':
        return 'bg-primary';
      case BookingStatus.EXPIRED:
      case 'EXPIRED':
        return 'bg-secondary';
      case BookingStatus.REFUND_REQUESTED:
      case 'REFUND_REQUESTED':
        return 'bg-warning';
      case BookingStatus.REFUNDED:
      case 'REFUNDED':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  }

  /**
   * Get the display text for booking status
   */
  getStatusDisplayText(booking: Booking | null): string {
    if (!booking) return 'N/A';
    
    // Check if payment is refunded first (highest priority)
    if (booking.paymentStatus === PaymentStatus.REFUNDED || 
        booking.paymentStatus === 'REFUNDED' as any) {
      return 'Refunded';
    }
    
    // Then format booking status
    const status = booking.status;
    switch (status) {
      case BookingStatus.CONFIRMED:
      case 'CONFIRMED':
        return 'Confirmed';
      case BookingStatus.PENDING:
      case 'PENDING':
        return 'Pending';
      case BookingStatus.CANCELLED:
      case 'CANCELLED':
        return 'Cancelled';
      case BookingStatus.COMPLETED:
      case 'COMPLETED':
        return 'Completed';
      case BookingStatus.EXPIRED:
      case 'EXPIRED':
        return 'Expired';
      case BookingStatus.REFUND_REQUESTED:
      case 'REFUND_REQUESTED':
        return 'Refund Requested';
      case BookingStatus.REFUNDED:
      case 'REFUNDED':
        return 'Refunded';
      default:
        // Fallback: capitalize first letter of status
        return status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Unknown';
    }
  }
}