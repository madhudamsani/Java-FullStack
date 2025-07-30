import { SeatStatus, SeatCategory } from './show.model';

export interface ShowSchedule {
  id?: number;
  showId: number;
  showDate: string;
  showTime: string;
  startTime?: string; // Added for backend compatibility
  endTime?: string; // Added for backend compatibility
  venue: Venue;
  basePrice: number;
  status: string;
  seatsAvailable?: number; // Primary field that matches backend
  availableSeats?: number; // Kept for backward compatibility
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
  priceMultiplier: number;
}

export interface SeatMap {
  id?: number;
  scheduleId?: number;
  sections: SeatMapSection[];
  rows: number;
  columns: number;
  layout: string;
}

export interface SeatMapSection {
  id?: number;
  name: string;
  rows: SeatMapRow[];
  priceCategory: SeatCategory;
  priceMultiplier: number;
}

export interface SeatMapRow {
  rowNumber: number;
  rowLabel: string;
  seats: SeatMapSeat[];
}

export interface SeatMapSeat {
  id?: number;
  seatNumber: number;
  status: SeatStatus;
  price: number;
  category: SeatCategory;
}

export interface ShowSeat {
  id?: number;
  row: string;
  seatNumber: number;
  status: SeatStatus;
  price: number;
  category: SeatCategory;
  isSelected?: boolean;
}

export interface ShowAnalytics {
  id?: number;
  showId: number;
  totalBookings: number;
  totalRevenue: number;
  averageOccupancy: number;
  totalViews: number;
  averageTicketPrice: number;
  occupancyRate: number;
  salesByCategory: { [key: string]: number };
  peakBookingTimes?: { [key: string]: number };
  demographicData?: { [key: string]: number };
  salesByDay?: { [key: string]: number };
  refundRate?: number;
  audienceDemographics?: {
    ageGroups: { [key: string]: number };
  };
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