import { Show, ShowSchedule } from './show.model';
import { SeatCategory, SeatStatus } from './show.model';
import { SEAT_CATEGORY_METADATA, SEAT_STATUS_METADATA } from './seat-metadata';

export interface Booking {
  id?: number;
  bookingNumber?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
  };
  showSchedule?: {
    id: number;
    showDate: Date;
    startTime: string;
    endTime: string;
    basePrice: number;
    venue?: {
      id: number;
      name: string;
    };
    show?: {
      id: number;
      title: string;
      description: string;
      type: string;
      duration: number;
      posterUrl?: string;
    };
  };
  seatBookings?: {
    id: number;
    seat: {
      id: number;
      rowName: string;
      seatNumber: number;
      category: string;
      priceMultiplier: number;
    };
    price: number;
  }[];
  totalAmount: number;
  bookingDate?: Date;
  status: string | BookingStatus;
  createdAt?: Date;
  updatedAt?: Date;
  
  // Legacy properties for backward compatibility
  userId?: number;
  showId?: number;
  scheduleId?: number;
  seats?: BookingSeat[];
  paymentId?: string;
  paymentStatus?: PaymentStatus | PaymentStatusType;
  show?: Show;
  schedule?: ShowSchedule;
  confirmationCode?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  showName?: string;
  showDate?: Date;
  showDateTime?: Date;
  refundReason?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  venueName?: string;
  paymentMethod?: string;
  transactionId?: string;
  ticketPrice?: number;
  notes?: string;
  
  // Deprecated fields - kept for backward compatibility
  booking_number?: string; // Deprecated in favor of bookingNumber
  booking_date?: Date; // Deprecated in favor of bookingDate
  total_amount?: number; // Deprecated in favor of totalAmount
  created_at?: Date; // Deprecated in favor of createdAt
  updated_at?: Date; // Deprecated in favor of updatedAt
}

export interface BookingSeat {
  id?: number;
  bookingId?: number;
  seatId: number;
  row: string;
  seatNumber: number;
  price: number;
  category?: SeatCategory | string;
}

/**
 * Enum representing the possible states of a booking
 */
export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  REFUND_REQUESTED = 'REFUND_REQUESTED',
  REFUNDED = 'REFUNDED'
}

/**
 * Interface for booking status metadata
 */
export interface BookingStatusMetadata {
  value: BookingStatus;
  displayName: string;
  color: string;
  icon: string;
}

/**
 * Metadata for booking statuses
 */
export const BOOKING_STATUS_METADATA: Record<BookingStatus, BookingStatusMetadata> = {
  [BookingStatus.PENDING]: {
    value: BookingStatus.PENDING,
    displayName: 'Pending',
    color: 'warning',
    icon: 'hourglass-half'
  },
  [BookingStatus.CONFIRMED]: {
    value: BookingStatus.CONFIRMED,
    displayName: 'Confirmed',
    color: 'success',
    icon: 'check-circle'
  },
  [BookingStatus.CANCELLED]: {
    value: BookingStatus.CANCELLED,
    displayName: 'Cancelled',
    color: 'danger',
    icon: 'times-circle'
  },
  [BookingStatus.COMPLETED]: {
    value: BookingStatus.COMPLETED,
    displayName: 'Completed',
    color: 'info',
    icon: 'flag-checkered'
  },
  [BookingStatus.EXPIRED]: {
    value: BookingStatus.EXPIRED,
    displayName: 'Expired',
    color: 'secondary',
    icon: 'clock'
  },
  [BookingStatus.REFUND_REQUESTED]: {
    value: BookingStatus.REFUND_REQUESTED,
    displayName: 'Refund Requested',
    color: 'warning',
    icon: 'undo'
  },
  [BookingStatus.REFUNDED]: {
    value: BookingStatus.REFUNDED,
    displayName: 'Refunded',
    color: 'info',
    icon: 'money-bill-wave'
  }
};

/**
 * Enum representing the possible states of a payment
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

/**
 * Interface for payment status metadata
 */
export interface PaymentStatusMetadata {
  value: PaymentStatus;
  displayName: string;
  color: string;
  icon: string;
}

/**
 * Metadata for payment statuses
 */
export const PAYMENT_STATUS_METADATA: Record<PaymentStatus, PaymentStatusMetadata> = {
  [PaymentStatus.PENDING]: {
    value: PaymentStatus.PENDING,
    displayName: 'Pending',
    color: 'warning',
    icon: 'hourglass-half'
  },
  [PaymentStatus.COMPLETED]: {
    value: PaymentStatus.COMPLETED,
    displayName: 'Completed',
    color: 'success',
    icon: 'check-circle'
  },
  [PaymentStatus.FAILED]: {
    value: PaymentStatus.FAILED,
    displayName: 'Failed',
    color: 'danger',
    icon: 'times-circle'
  },
  [PaymentStatus.REFUNDED]: {
    value: PaymentStatus.REFUNDED,
    displayName: 'Refunded',
    color: 'info',
    icon: 'money-bill-wave'
  }
};

// Allow string literals for PaymentStatus
export type PaymentStatusType = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

/**
 * Enum representing the possible payment methods
 */
export enum PaymentMethodType {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  PAYPAL = 'PAYPAL',
  GOOGLE_PAY = 'GOOGLE_PAY',
  APPLE_PAY = 'APPLE_PAY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  MOCK = 'MOCK'
}

/**
 * Interface for payment method metadata
 */
export interface PaymentMethodMetadata {
  value: PaymentMethodType;
  displayName: string;
  color: string;
  icon: string;
}

/**
 * Metadata for payment methods
 */
export const PAYMENT_METHOD_METADATA: Record<PaymentMethodType, PaymentMethodMetadata> = {
  [PaymentMethodType.CREDIT_CARD]: {
    value: PaymentMethodType.CREDIT_CARD,
    displayName: 'Credit Card',
    color: 'primary',
    icon: 'credit-card'
  },
  [PaymentMethodType.DEBIT_CARD]: {
    value: PaymentMethodType.DEBIT_CARD,
    displayName: 'Debit Card',
    color: 'info',
    icon: 'credit-card'
  },
  [PaymentMethodType.PAYPAL]: {
    value: PaymentMethodType.PAYPAL,
    displayName: 'PayPal',
    color: 'primary',
    icon: 'paypal'
  },
  [PaymentMethodType.GOOGLE_PAY]: {
    value: PaymentMethodType.GOOGLE_PAY,
    displayName: 'Google Pay',
    color: 'success',
    icon: 'google-pay'
  },
  [PaymentMethodType.APPLE_PAY]: {
    value: PaymentMethodType.APPLE_PAY,
    displayName: 'Apple Pay',
    color: 'dark',
    icon: 'apple-pay'
  },
  [PaymentMethodType.BANK_TRANSFER]: {
    value: PaymentMethodType.BANK_TRANSFER,
    displayName: 'Bank Transfer',
    color: 'secondary',
    icon: 'university'
  },
  [PaymentMethodType.CASH]: {
    value: PaymentMethodType.CASH,
    displayName: 'Cash',
    color: 'success',
    icon: 'money-bill'
  },
  [PaymentMethodType.MOCK]: {
    value: PaymentMethodType.MOCK,
    displayName: 'Test Payment',
    color: 'warning',
    icon: 'vial'
  }
};

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType | string;
  name: string;
  icon: string;
  lastFour?: string;
  expiryDate?: string;
}

export interface PaymentIntent {
  id: string;
  bookingId: number;
  amount: number;
  currency: string;
  status: PaymentStatus | PaymentStatusType;
  paymentMethod?: PaymentMethod;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SeatSelectionMap {
  rows: SeatRow[];
  screen?: string;
  legend?: SeatLegend;
  metadata?: SeatMapMetadata;
}

export interface SeatMapMetadata {
  totalSeats: number;
  totalRows: number;
  maxSeatsPerRow: number;
  rowLengths: { [key: string]: number };
  theaterLayout?: string;
  venueCapacity?: number;
  receivedSeats?: number;
  expectedSeats?: number;
  needsRefresh?: boolean;
  scheduleTotalSeats?: number;
  scheduleAvailableSeats?: number;
  error?: string;
  screenWidth?: number;
  rowSpacing?: number;
  categoryInfo?: { [category: string]: { displayName: string; color: string; } };
  [key: string]: any; // Allow for additional metadata properties
}

export interface SeatRow {
  rowLabel: string;
  seats: SeatInfo[];
}

export interface SeatInfo {
  id: number;
  seatNumber: number;
  status: SeatStatus | string;
  price: number;
  category?: SeatCategory | string;
  isSelected?: boolean;
  row?: string; // Added to match ShowSeat interface
}

export interface SeatLegend {
  [SeatStatus.AVAILABLE]?: string;
  [SeatStatus.RESERVED]?: string;
  [SeatStatus.SOLD]?: string;
  [SeatStatus.SELECTED]?: string;
  [SeatStatus.DISABLED]?: string;
  [SeatStatus.MAINTENANCE]?: string;
  [SeatCategory.STANDARD]?: string;
  [SeatCategory.PREMIUM]?: string;
  [SeatCategory.VIP]?: string;
  
  // Legacy properties for backward compatibility
  available?: string;
  reserved?: string;
  sold?: string;
  selected?: string;
  standard?: string;
  premium?: string;
  vip?: string;
}

export interface BookingSummary {
  show: {
    id: number;
    title: string;
    type: string;
    image?: string;
    imageUrl?: string;
    posterUrl?: string;
    duration?: number;
  };
  schedule: {
    id: number;
    date: string;
    time: string;
    venue: string;
  };
  seats: {
    count: number;
    details: {
      row: string;
      seatNumber: number;
      price: number;
      category: SeatCategory | string;
    }[];
  };
  pricing: {
    subtotal: number;
    fees: number;
    taxes: number;
    total: number;
    discount?: number;
    discountCode?: string;
    savings?: number;
  };
  customer?: {
    name: string;
    email: string;
    phone?: string;
  };
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentDate?: Date;
  bookingNumber?: string;
  venue?: string;
  showDate?: Date;
  showTime?: string;
  selectedSeats?: BookingSeat[];
}

export interface BookingRequest {
  showId: number;
  scheduleId: number;
  seats: BookingSeat[];
  paymentMethodId: string;
  amount: number;
  totalAmount: number; // Added for consistency with backend
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  sessionId?: string; // Session ID for seat reservations
  promotionCode?: string; // Promotion code for discounts
}

export interface BookingResponse {
  booking: any; // The type should be more specific based on your booking model
  confirmationCode: string;
  paymentIntent?: PaymentIntent;
  success?: boolean;
  message?: string;
}

// Promotion-related interfaces
export interface PromotionValidationResponse {
  valid: boolean;
  promotion?: {
    id: number;
    code: string;
    name: string;
    description: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y';
    discountValue: number;
    maxUses: number;
    currentUses: number;
  };
  message?: string;
}

export interface DiscountCalculationRequest {
  code: string;
  price: number;
}

export interface DiscountCalculationResponse {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
}

export { SeatCategory, SeatStatus };