export interface User {
  id?: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'ROLE_USER' | 'ROLE_ORGANIZER' | 'ROLE_ADMIN';
  status: 'active' | 'suspended' | 'inactive' | 'deleted';
  createdAt?: Date;
  lastLoginDate?: Date;
  phoneNumber?: string;
  address?: string;
  name?: string; // Full name (computed from firstName and lastName)
  profilePictureUrl?: string; // URL to profile picture - standardized to use camelCase
  preferences?: UserPreferences; // User preferences
  
  // Deprecated fields - kept for backward compatibility
  created_at?: Date; // Deprecated in favor of createdAt
  last_login_date?: Date; // Deprecated in favor of lastLoginDate
  phone_number?: string; // Deprecated in favor of phoneNumber
  phone?: string; // Deprecated in favor of phoneNumber
  profile_picture_url?: string; // Deprecated in favor of profilePictureUrl
  profilePicture?: string; // Deprecated in favor of profilePictureUrl
  lastLogin?: Date; // Deprecated in favor of lastLoginDate
}

export interface AuthResponse {
  user: User;
  token?: string;
  accessToken?: string; // Backend might use this name instead of token
  tokenType?: string;
  expiresIn?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
  email?: string; // Optional since we're using username as email
}

export interface RegisterRequest extends LoginRequest {
  firstName: string;
  lastName: string;
  roles?: string[]; // Array of role names without 'ROLE_' prefix
  termsAccepted: boolean;
  phoneNumber?: string;
}

export interface UserPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  favoriteCategories?: string[];
  language?: string;
  currency?: string;
  
  // Deprecated fields - kept for backward compatibility
  email_notifications?: boolean; // Deprecated in favor of emailNotifications
  sms_notifications?: boolean; // Deprecated in favor of smsNotifications
  favorite_categories?: string[]; // Deprecated in favor of favoriteCategories
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}