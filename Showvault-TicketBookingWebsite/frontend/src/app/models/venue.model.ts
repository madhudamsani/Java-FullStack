export interface VenueSeatCategory {
  type: string;
  capacity: number;
  price?: number;
}

export interface Venue {
  id?: number;
  name: string;
  city: string;
  country: string;
  capacity: number;
  address?: string;
  description?: string;
  state?: string;
  amenities?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  imageUrl?: string; // Standardized to use camelCase
  seatCategories?: VenueSeatCategory[]; // Added seat categories
  
  // Deprecated fields - kept for backward compatibility
  created_at?: Date; // Deprecated in favor of createdAt
  updated_at?: Date; // Deprecated in favor of updatedAt
  image_url?: string; // Deprecated in favor of imageUrl
}

export interface VenueResponse {
  id: number;
  name: string;
  city: string;
  country: string;
  capacity: number;
  address: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VenueFilters {
  city?: string;
  country?: string;
  minCapacity?: number;
}

export interface VenueCapacityInfo {
  venueId: number;
  venueName: string;
  configuredCapacity: number;
  actualSeatCount: number;
  hasSeats: boolean;
  capacityMatch: boolean;
}