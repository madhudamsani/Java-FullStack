/**
 * Enum representing the possible states of a show
 */
export enum ShowStatus {
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  SUSPENDED = 'SUSPENDED',
  DRAFT = 'DRAFT'
}

/**
 * Interface for show status metadata
 */
export interface ShowStatusMetadata {
  value: ShowStatus;
  displayName: string;
  color: string;
  icon: string;
}

/**
 * Metadata for show statuses
 */
export const SHOW_STATUS_METADATA: Record<ShowStatus, ShowStatusMetadata> = {
  [ShowStatus.UPCOMING]: {
    value: ShowStatus.UPCOMING,
    displayName: 'Upcoming',
    color: 'primary',
    icon: 'calendar-alt'
  },
  [ShowStatus.ONGOING]: {
    value: ShowStatus.ONGOING,
    displayName: 'Ongoing',
    color: 'success',
    icon: 'play-circle'
  },
  [ShowStatus.COMPLETED]: {
    value: ShowStatus.COMPLETED,
    displayName: 'Completed',
    color: 'secondary',
    icon: 'flag-checkered'
  },
  [ShowStatus.CANCELLED]: {
    value: ShowStatus.CANCELLED,
    displayName: 'Cancelled',
    color: 'danger',
    icon: 'times-circle'
  },
  [ShowStatus.SUSPENDED]: {
    value: ShowStatus.SUSPENDED,
    displayName: 'Suspended',
    color: 'warning',
    icon: 'pause-circle'
  },
  [ShowStatus.DRAFT]: {
    value: ShowStatus.DRAFT,
    displayName: 'Draft',
    color: 'info',
    icon: 'edit'
  }
};

/**
 * Interface representing a show creator
 */
export interface ShowCreator {
  id?: number;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

/**
 * Interface representing a show
 */
export interface Show {
  id?: number;
  title: string;
  type: 'Movie' | 'Theatrical' | 'Concert' | 'Event' | 'Other';
  posterUrl?: string;
  trailerUrl?: string;
  description?: string;
  duration?: number;
  genre?: string;
  language?: string;
  status: ShowStatus;
  rating?: string;
  voteCount?: number;
  category?: string;
  createdAt?: Date;
  updatedAt?: Date;
  schedules?: ShowSchedule[];
  createdBy?: ShowCreator;
  
  // Soft deletion fields
  isDeleted?: boolean;
  deletionReason?: string;
  
  // Fields for creating first schedule
  venue?: string | number;
  date?: string;
  time?: string;
  price?: number;
  availableSeats?: number;
  totalSeats?: number;

  // Deprecated fields - will be removed in future
  image?: string;
  imageUrl?: string;
  image_url?: string;
  poster_url?: string;
}

/**
 * Enum representing the possible states of a show schedule
 */
export enum ScheduleStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  POSTPONED = 'POSTPONED',
  SOLD_OUT = 'SOLD_OUT'
}

/**
 * Interface for schedule status metadata
 */
export interface ScheduleStatusMetadata {
  value: ScheduleStatus;
  displayName: string;
  color: string;
  icon: string;
}

/**
 * Metadata for schedule statuses
 */
export const SCHEDULE_STATUS_METADATA: Record<ScheduleStatus, ScheduleStatusMetadata> = {
  [ScheduleStatus.SCHEDULED]: {
    value: ScheduleStatus.SCHEDULED,
    displayName: 'Scheduled',
    color: 'primary',
    icon: 'calendar-check'
  },
  [ScheduleStatus.CANCELLED]: {
    value: ScheduleStatus.CANCELLED,
    displayName: 'Cancelled',
    color: 'danger',
    icon: 'calendar-times'
  },
  [ScheduleStatus.COMPLETED]: {
    value: ScheduleStatus.COMPLETED,
    displayName: 'Completed',
    color: 'secondary',
    icon: 'calendar-check'
  },
  [ScheduleStatus.POSTPONED]: {
    value: ScheduleStatus.POSTPONED,
    displayName: 'Postponed',
    color: 'warning',
    icon: 'calendar-day'
  },
  [ScheduleStatus.SOLD_OUT]: {
    value: ScheduleStatus.SOLD_OUT,
    displayName: 'Sold Out',
    color: 'success',
    icon: 'ticket-alt'
  }
};

/**
 * Interface representing a show schedule
 */
export interface ShowSchedule {
  id?: number;
  showId: number;
  showDate: string;
  showTime: string;
  venue: Venue;
  basePrice: number;
  status: string;
  availableSeats?: number;
  totalSeats?: number;
}

export interface Venue {
  id?: number;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  capacity: number;
  amenities: string[];
  imageUrl?: string;
}

export interface VenueSection {
  id?: number;
  name: string;
  capacity: number;
  priceMultiplier: number; // e.g., 1.0 for standard, 1.5 for premium, 2.0 for VIP
  rows?: number;
  seatsPerRow?: number;
}

export interface SeatMap {
  id?: number;
  scheduleId?: number;
  sections: SeatMapSection[];
  rows: number;
  columns: number;
  layout: string; // JSON string representing the layout
}

export interface SeatMapSection {
  id?: number;
  name: string;
  rows: SeatMapRow[];
  priceCategory: SeatCategory;
  priceMultiplier: number;
}

export interface ShowFilter {
  type?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  venue?: string;
  priceMin?: number;
  priceMax?: number;
  search?: string;
  status?: string;
  excludeStatus?: string;
  genre?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  [key: string]: string | number | undefined;
}

export interface ShowsResponse {
  content: Show[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ShowAnalytics {
  showId: number;
  showTitle: string;
  totalTicketsSold: number;
  totalRevenue: number;
  averageTicketPrice: number;
  totalBookings: number;
  occupancyRate: number;
  bookingsByStatus?: { [key: string]: number };
  revenueByDate?: { [key: string]: number };
  ticketsByDate?: { [key: string]: number };
  audienceDemographics?: { [key: string]: number };
  popularPerformances?: Array<{ [key: string]: any }>;
  salesByPriceCategory?: Array<{ [key: string]: any }>;
  bookingsByPlatform?: { [key: string]: number };
  viewsBySource?: { [key: string]: number };
  conversionRates?: { [key: string]: number };
  recentBookings?: Array<{ [key: string]: any }>;
  promotionEffectiveness?: { [key: string]: number };
  
  // For backward compatibility with existing component
  salesByDay?: { [key: string]: number };
  salesByCategory?: { [key: string]: number };
}

export interface AudienceDemographics {
  ageGroups: { [range: string]: number }; // e.g., "18-24": 30, "25-34": 45
  genderDistribution: { [gender: string]: number }; // e.g., "male": 55, "female": 45
  locationDistribution: { [location: string]: number }; // e.g., "New York": 30, "Los Angeles": 20
}

export interface Promotion {
  id?: number;
  showId?: number;
  name: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y';
  value: number;
  startDate: string;
  endDate: string;
  maxUses?: number;
  currentUses?: number;
  minPurchaseAmount?: number;
  status: string;
  description?: string;
  discountType: string;
  discountValue: number;
  active: boolean;
}

export interface ShowReview {
  id?: number;
  showId: number;
  userId?: number;
  rating: number;
  review?: string;
  comment?: string; // Added for compatibility with existing code
  userName?: string; // Added for compatibility with existing code
  date?: Date | string; // Added for review date
  createdAt?: Date | string;
  updatedAt?: Date | string;
  showTitle?: string;
  showDate?: Date | string;
  showImageUrl?: string;
  venue?: string;
}

export interface SeatMapRow {
  rowNumber: number;
  rowLabel: string; // e.g., "A", "B", "C"
  seats: Seat[];
}

/**
 * Enum representing the possible states of a seat
 */
export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  DISABLED = 'DISABLED',
  SELECTED = 'SELECTED',
  MAINTENANCE = 'MAINTENANCE'
}

/**
 * Enum representing the possible seat categories
 */
export enum SeatCategory {
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  VIP = 'VIP'
}

/**
 * Interface for seat category metadata
 */
export interface SeatCategoryMetadata {
  value: SeatCategory;
  displayName: string;
  color: string;
  icon: string;
}

/**
 * Metadata for seat categories
 */
export const SEAT_CATEGORY_METADATA: Record<SeatCategory, SeatCategoryMetadata> = {
  [SeatCategory.STANDARD]: {
    value: SeatCategory.STANDARD,
    displayName: 'Standard',
    color: 'success',
    icon: 'chair'
  },
  [SeatCategory.PREMIUM]: {
    value: SeatCategory.PREMIUM,
    displayName: 'Premium',
    color: 'warning',
    icon: 'chair'
  },
  [SeatCategory.VIP]: {
    value: SeatCategory.VIP,
    displayName: 'VIP',
    color: 'danger',
    icon: 'crown'
  }
};

/**
 * Interface representing a seat
 */
export interface Seat {
  id?: number;
  seatNumber: number;
  status: SeatStatus;
  price: number;
  category: SeatCategory;
}

/**
 * Interface representing a show seat
 */
export interface ShowSeat {
  id?: number;
  scheduleId: number;
  row: string;
  seatNumber: number;
  status: SeatStatus;
  price: number;
  category: SeatCategory;
  isSelected?: boolean;
}

// Removed circular dependency with seat-metadata.ts