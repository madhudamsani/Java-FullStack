import { SeatStatus, SeatCategory } from './show.model';

interface SeatStatusMetadata {
  displayName: string;
  color: string;
  icon: string;
}

interface SeatCategoryMetadata {
  displayName: string;
  color: string;
  icon: string;
  priceMultiplier: number;
}

export const SEAT_STATUS_METADATA: Record<SeatStatus, SeatStatusMetadata> = {
  [SeatStatus.AVAILABLE]: {
    displayName: 'Available',
    color: 'success',
    icon: 'circle'
  },
  [SeatStatus.RESERVED]: {
    displayName: 'Reserved',
    color: 'warning',
    icon: 'clock'
  },
  [SeatStatus.SOLD]: {
    displayName: 'Sold',
    color: 'danger',
    icon: 'x-circle'
  },
  [SeatStatus.DISABLED]: {
    displayName: 'Disabled',
    color: 'secondary',
    icon: 'dash-circle'
  },
  [SeatStatus.SELECTED]: {
    displayName: 'Selected',
    color: 'primary',
    icon: 'check-circle'
  },
  [SeatStatus.MAINTENANCE]: {
    displayName: 'Maintenance',
    color: 'info',
    icon: 'tools'
  }
};

export const SEAT_CATEGORY_METADATA: Record<SeatCategory, SeatCategoryMetadata> = {
  [SeatCategory.STANDARD]: {
    displayName: 'Standard',
    color: 'secondary',
    icon: 'seat',
    priceMultiplier: 1.0
  },
  [SeatCategory.PREMIUM]: {
    displayName: 'Premium',
    color: 'primary',
    icon: 'seat-premium',
    priceMultiplier: 1.5
  },
  [SeatCategory.VIP]: {
    displayName: 'VIP',
    color: 'warning',
    icon: 'seat-vip',
    priceMultiplier: 2.0
  }
};