/**
 * Interface representing a notification in the system
 * 
 * @remarks
 * This interface follows the standardized camelCase naming convention.
 * Legacy snake_case fields are marked as deprecated and will be removed in a future version.
 */
export interface Notification {
  /** Unique identifier for the notification */
  id: number;
  
  /** Notification title */
  title: string;
  
  /** Notification message content */
  message: string;
  
  /** Type of notification */
  type: NotificationType;
  
  /** ID of the related entity (e.g., booking ID, show ID) */
  relatedId?: number;
  
  /** Type of the related entity (e.g., "BOOKING", "SHOW") */
  relatedType?: string;
  
  /** Whether the notification has been read */
  read: boolean;
  
  /** When the notification was created */
  createdAt: Date;
  
  /** When the notification was marked as read */
  readAt?: Date;
  
  // Deprecated fields - kept for backward compatibility
  /** @deprecated Use `read` instead */
  is_read?: boolean;
  
  /** @deprecated Use `createdAt` instead */
  created_at?: Date;
  
  /** @deprecated Use `readAt` instead */
  read_at?: Date;
  
  /** @deprecated Use `relatedId` instead */
  related_id?: number;
  
  /** @deprecated Use `relatedType` instead */
  related_type?: string;
}

/**
 * Enum representing the types of notifications in the system
 * This enum must match the backend NotificationType enum
 */
export enum NotificationType {
  /**
   * System notifications for general announcements and updates
   */
  SYSTEM = 'SYSTEM',
  
  /**
   * Booking-related notifications for ticket purchases and reservations
   */
  BOOKING = 'BOOKING',
  
  /**
   * Show update notifications for changes to show details, times, etc.
   */
  SHOW_UPDATE = 'SHOW_UPDATE',
  
  /**
   * Promotion notifications for special offers and discounts
   */
  PROMOTION = 'PROMOTION',
  
  /**
   * Reminder notifications for upcoming shows and events
   */
  REMINDER = 'REMINDER',
  
  /**
   * Payment notifications for successful payments and receipts
   */
  PAYMENT = 'PAYMENT',
  
  /**
   * Refund notifications for processed refunds
   */
  REFUND = 'REFUND',
  
  /**
   * Cancellation notifications for cancelled shows or bookings
   */
  CANCELLATION = 'CANCELLATION'
}

/**
 * Interface for notification type metadata
 */
export interface NotificationTypeMetadata {
  value: NotificationType;
  displayName: string;
  color: string;
  icon: string;
}

/**
 * Metadata for notification types
 * Provides UI-specific information for each notification type
 */
export const NOTIFICATION_TYPE_METADATA: Record<NotificationType, NotificationTypeMetadata> = {
  [NotificationType.SYSTEM]: {
    value: NotificationType.SYSTEM,
    displayName: 'System',
    color: 'secondary',
    icon: 'info-circle'
  },
  [NotificationType.BOOKING]: {
    value: NotificationType.BOOKING,
    displayName: 'Booking',
    color: 'primary',
    icon: 'ticket-alt'
  },
  [NotificationType.SHOW_UPDATE]: {
    value: NotificationType.SHOW_UPDATE,
    displayName: 'Show Update',
    color: 'info',
    icon: 'film'
  },
  [NotificationType.PROMOTION]: {
    value: NotificationType.PROMOTION,
    displayName: 'Promotion',
    color: 'warning',
    icon: 'tag'
  },
  [NotificationType.REMINDER]: {
    value: NotificationType.REMINDER,
    displayName: 'Reminder',
    color: 'info',
    icon: 'bell'
  },
  [NotificationType.PAYMENT]: {
    value: NotificationType.PAYMENT,
    displayName: 'Payment',
    color: 'success',
    icon: 'credit-card'
  },
  [NotificationType.REFUND]: {
    value: NotificationType.REFUND,
    displayName: 'Refund',
    color: 'warning',
    icon: 'money-bill-wave'
  },
  [NotificationType.CANCELLATION]: {
    value: NotificationType.CANCELLATION,
    displayName: 'Cancellation',
    color: 'danger',
    icon: 'times-circle'
  }
}

/**
 * Get metadata for a notification type, with fallback for unknown types
 * @param type The notification type
 * @returns Notification type metadata
 */
export function getNotificationMetadata(type: string | NotificationType): NotificationTypeMetadata {
  // If the type is a valid enum value, return its metadata
  if (type && NOTIFICATION_TYPE_METADATA[type as NotificationType]) {
    return NOTIFICATION_TYPE_METADATA[type as NotificationType];
  }
  
  // Otherwise, return default metadata
  return {
    value: NotificationType.SYSTEM,
    displayName: type?.toString() || 'Unknown',
    color: 'secondary',
    icon: 'bell'
  };
}

/**
 * Interface for notification pagination response
 */
export interface NotificationPage {
  notifications: Notification[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Interface for notification count response
 */
export interface NotificationCount {
  count: number;
}

/**
 * Interface for notification action response
 */
export interface NotificationActionResponse {
  markedCount?: number;
  deletedCount?: number;
}