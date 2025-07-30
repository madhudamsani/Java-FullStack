import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { WebSocketService } from './websocket.service';

import { 
  User, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  PasswordChangeRequest,
  UserPreferences 
} from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private userApiUrl = `${environment.apiUrl}/users`;
  private currentUserKey = 'currentUser';
  private tokenKey = 'auth_token';
  private authStateSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenExpirationTimer: any;
  
  // Observable stream of the current user
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private webSocketService: WebSocketService
  ) { 
    // Initialize auth state
    this.authStateSubject.next(this.isLoggedIn());
    
    // Initialize current user
    const storedUser = localStorage.getItem(this.currentUserKey);
    if (storedUser && this.isLoggedIn()) {
      try {
        const user = JSON.parse(storedUser) as User;
        this.currentUserSubject.next(user);
      } catch (e) {
        console.error('Error parsing stored user:', e);
      }
    }
  }

  login(loginData: LoginRequest): Observable<AuthResponse> {
    return this.http.post<any>(`${this.apiUrl}/signin`, loginData).pipe(
      map(response => {
        if (!response) {
          throw new Error('Empty response received from server');
        }

        // Check if response has the expected structure
        if (typeof response !== 'object') {
          throw new Error('Invalid response format from server');
        }

        console.log('Raw backend response:', response);

        // Validate token existence and format
        // Check for token in either 'token' or 'accessToken' field
        const token = response.token || response.accessToken;
        if (!token || typeof token !== 'string') {
          console.error('Invalid token in response:', response);
          throw new Error('Invalid or missing token in authentication response');
        }

        // Decode and validate token structure
        const decodedToken = this.decodeToken(token);
        if (!decodedToken || !decodedToken.sub) {
          throw new Error('Invalid token format or missing required claims');
        }

        // Extract roles from response or token
        const roles = response.roles || decodedToken.roles || [];
        const role = roles.length > 0 ? this.normalizeRole(roles[0]) : 'ROLE_USER';

        // Construct a proper AuthResponse object
        const authResponse: AuthResponse = {
          token: token,
          user: {
            id: response.id || decodedToken.id,
            username: response.username || decodedToken.sub,
            email: response.email || decodedToken.email || loginData.email || loginData.username,
            firstName: response.firstName || decodedToken.firstName || '',
            lastName: response.lastName || decodedToken.lastName || '',
            role: role,
            status: 'active'
          }
        };

        return authResponse;
      }),
      tap(response => {
        try {
          this.setSession(response);
        } catch (error) {
          console.error('Error setting session:', error);
          throw new Error('Failed to initialize user session');
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        const errorMessage = error.error?.message || error.message || 'Authentication failed';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  private normalizeRole(role: string): User['role'] {
    const normalizedRole = role.toUpperCase();
    return normalizedRole.startsWith('ROLE_') ? normalizedRole as User['role'] : `ROLE_${normalizedRole}` as User['role'];
  }

  private decodeToken(token: string): any {
    try {
      if (!token || token.split('.').length !== 3) {
        throw new Error('Invalid token format');
      }
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
      const decodedToken = JSON.parse(window.atob(paddedBase64));
      
      if (!decodedToken || typeof decodedToken !== 'object') {
        throw new Error('Invalid token payload');
      }
      
      return decodedToken;
    } catch (error) {
      console.error('Token decode error:', error);
      return null;
    }
  }

  private setSession(authResult: AuthResponse): void {
    const token = authResult.token || authResult.accessToken;
    if (!token) {
      throw new Error('No token received');
    }
    
    const decodedToken = this.decodeToken(token);
    if (!decodedToken || !decodedToken.exp) {
      throw new Error('Invalid token format');
    }
    
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.currentUserKey, JSON.stringify(authResult.user));
    console.log('Session data saved successfully');
    
    // Set up token expiration timer
    const expiresIn = (decodedToken.exp * 1000) - Date.now();
    this.setupTokenExpirationTimer(expiresIn);
    
    // Notify subscribers that auth state has changed
    this.authStateSubject.next(true);
    
    // Refresh WebSocket connection with the new token
    try {
      this.webSocketService.refreshConnection();
    } catch (error) {
      console.warn('Error refreshing WebSocket connection:', error);
    }
  }

  private setupTokenExpirationTimer(expiresIn: number): void {
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
    }
    
    this.tokenExpirationTimer = setTimeout(() => {
      this.refreshToken().subscribe({
        error: () => this.handleTokenError('Token refresh failed')
      });
    }, expiresIn - 60000); // Refresh 1 minute before expiration
  }

  register(registerData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<any>(`${this.apiUrl}/signup`, registerData).pipe(
      map(response => {
        if (!response) {
          throw new Error('Empty response received from server');
        }

        // Check if response has the expected structure
        if (typeof response !== 'object') {
          throw new Error('Invalid response format from server');
        }

        console.log('Raw backend registration response:', response);

        // Validate token existence and format
        const token = response.token || response.accessToken;
        if (!token || typeof token !== 'string') {
          console.error('Invalid token in response:', response);
          throw new Error('Invalid or missing token in authentication response');
        }

        // Extract roles from response
        const roles = response.roles || [];
        const role = roles.length > 0 ? this.normalizeRole(roles[0]) : 'ROLE_USER';

        // Construct a proper AuthResponse object
        const authResponse: AuthResponse = {
          token: token,
          user: {
            id: response.id,
            username: response.username,
            email: response.email || registerData.email,
            firstName: registerData.firstName || '',
            lastName: registerData.lastName || '',
            role: role,
            status: 'active'
          }
        };

        return authResponse;
      }),
      tap(response => {
        const roles = registerData.roles || [];
        if (roles.length > 0) {
          const role = roles[0].toUpperCase();
          localStorage.setItem('user_role', `ROLE_${role}`);
        }
        this.setSession(response);
        // Note: Navigation after registration is handled by the component
      }),
      catchError(error => {
        console.error('Registration error:', error);
        let errorMessage = 'Registration failed';
        
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.currentUserKey);
    localStorage.removeItem(this.tokenKey);
    this.authStateSubject.next(false);
    this.router.navigate(['/login']);
  }
  
  // Observable to track authentication state changes
  authStateChanged(): Observable<boolean> {
    return this.authStateSubject.asObservable();
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) return false;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('Invalid token format');
        return false;
      }

      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
      
      const tokenData = JSON.parse(atob(paddedBase64));
      if (!tokenData.exp) {
        console.error('Token missing expiration');
        return false;
      }
      
      const expirationTime = tokenData.exp * 1000;
      return Date.now() < expirationTime;
    } catch (e) {
      console.error('Token validation error:', e);
      return false;
    }
  }
  
  getCurrentUserId(): number | null {
    const storedUser = localStorage.getItem(this.currentUserKey);
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as User;
        return user.id || null;
      } catch (e) {
        console.error('Error parsing stored user:', e);
        return null;
      }
    }
    return null;
  }
  
  // Helper method to get user data synchronously (without Observable)
  getUserData(): User | null {
    const storedUser = localStorage.getItem(this.currentUserKey);
    if (storedUser) {
      try {
        return JSON.parse(storedUser) as User;
      } catch (e) {
        console.error('Error parsing stored user:', e);
        return null;
      }
    }
    return null;
  }

  getCurrentUser(): Observable<User> {
    const storedUser = localStorage.getItem(this.currentUserKey);
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as User;
        return of(user);
      } catch (e) {
        console.error('Error parsing stored user:', e);
      }
    }

    return this.http.get<User>(`${this.userApiUrl}/profile`).pipe(
      map((user: User) => {
        if (!user.name && user.firstName && user.lastName) {
          user.name = `${user.firstName} ${user.lastName}`;
        }
        return user;
      }),
      tap(user => {
        localStorage.setItem(this.currentUserKey, JSON.stringify(user));
      }),
      catchError(error => {
        return throwError(() => new Error(error.error?.message || 'Failed to fetch user profile'));
      })
    );
  }

  getCurrentUserSync(): User | null {
    if (!this.isLoggedIn()) {
      return null;
    }

    const storedUser = localStorage.getItem(this.currentUserKey);
    if (!storedUser) {
      return null;
    }
    
    try {
      const user = JSON.parse(storedUser) as User;
      if (user.role && !user.role.startsWith('ROLE_')) {
        const roleUpperCase = user.role.toUpperCase();
        switch (roleUpperCase) {
          case 'ADMIN':
            user.role = 'ROLE_ADMIN';
            break;
          case 'ORGANIZER':
            user.role = 'ROLE_ORGANIZER';
            break;
          default:
            user.role = 'ROLE_USER';
        }
      }
      return user;
    } catch (e) {
      console.error('Error parsing stored user:', e);
      return null;
    }
  }

  getUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.userApiUrl}/profile`).pipe(
      map(user => {
        if (!user?.id) throw new Error('Invalid user data received');
        if (!user.name && user.firstName && user.lastName) {
          user.name = `${user.firstName} ${user.lastName}`;
        }
        if (!user.preferences) {
          user.preferences = {
            emailNotifications: true,
            smsNotifications: false,
            favoriteCategories: [],
            language: 'en',
            currency: 'INR'
          };
        }
        return user;
      }),
      tap(user => {
        localStorage.setItem(this.currentUserKey, JSON.stringify(user));
        this.currentUserSubject.next(user);
      }),
      catchError(error => {
        if (error.status === 401) this.handleTokenError('Session expired');
        return throwError(() => new Error(error.error?.message || 'Failed to fetch user profile'));
      })
    );
  }

  updateUserProfile(user: User): Observable<User> {
    if (!user.firstName?.trim() || !user.lastName?.trim()) {
      return throwError(() => new Error('First name and last name are required'));
    }

    const updatedUser = {
      ...user,
      firstName: user.firstName.trim(),
      lastName: user.lastName.trim(),
      name: `${user.firstName.trim()} ${user.lastName.trim()}`,
      phone: user.phone?.trim()
    };

    if (updatedUser.phone && !/^\d{10}$/.test(updatedUser.phone)) {
      return throwError(() => new Error('Phone number must be 10 digits'));
    }

    return this.http.put<User>(`${this.userApiUrl}/profile`, updatedUser).pipe(
      map(response => {
        if (!response?.id) throw new Error('Invalid response from server');
        return response;
      }),
      tap(updated => {
        localStorage.setItem(this.currentUserKey, JSON.stringify(updated));
        this.currentUserSubject.next(updated);
      }),
      catchError(error => {
        if (error.status === 401) this.handleTokenError('Session expired');
        return throwError(() => new Error(error.error?.message || 'Failed to update profile'));
      })
    );
  }

  changePassword(passwordData: PasswordChangeRequest): Observable<void> {
    return this.http.patch<void>(`${this.userApiUrl}/password`, null, {
      params: {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }
    }).pipe(
      catchError(error => {
        let errorMessage = 'Failed to change password';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 400) {
          errorMessage = 'Current password is incorrect or new password does not meet requirements';
        }
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  uploadProfilePicture(file: File): Observable<User> {
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    return this.http.post<User>(`${this.userApiUrl}/profile-picture`, formData).pipe(
      tap(updatedUser => {
        const storedUser = localStorage.getItem(this.currentUserKey);
        if (storedUser) {
          const currentUser = JSON.parse(storedUser);
          currentUser.profilePicture = updatedUser.profilePicture;
          localStorage.setItem(this.currentUserKey, JSON.stringify(currentUser));
        }
      }),
      catchError(error => {
        const errorMessage = error.error?.message || 'Failed to upload profile picture';
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  updateUserPreferences(preferences: UserPreferences): Observable<User> {
    if (preferences.language && !['en', 'hi', 'ta', 'te', 'kn', 'ml'].includes(preferences.language)) {
      return throwError(() => new Error('Invalid language selection'));
    }
    
    return this.http.put<User>(`${this.userApiUrl}/preferences`, preferences).pipe(
      map(response => {
        if (!response?.id) throw new Error('Invalid response from server');
        return response;
      }),
      tap(updatedUser => {
        const storedUser = localStorage.getItem(this.currentUserKey);
        if (storedUser) {
          const currentUser = JSON.parse(storedUser);
          currentUser.preferences = updatedUser.preferences;
          localStorage.setItem(this.currentUserKey, JSON.stringify(currentUser));
          this.currentUserSubject.next(currentUser);
        }
      }),
      catchError(error => {
        if (error.status === 401) this.handleTokenError('Session expired');
        return throwError(() => new Error(error.error?.message || 'Failed to update preferences'));
      })
    );
  }

  getToken(): string | null {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) {
      console.warn('No token found in localStorage');
      return null;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('Invalid token structure');
        return null;
      }
      return token;
    } catch (error) {
      console.error('Error parsing token:', error);
      return null;
    }
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const decodedToken = this.decodeToken(token);
      if (!decodedToken || !decodedToken.exp) return true;

      const expirationTime = decodedToken.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      // Consider token expired if less than 30 seconds remaining
      return currentTime > (expirationTime - 30000);
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  refreshToken(): Observable<string> {
    const currentToken = localStorage.getItem(this.tokenKey);
    if (!currentToken) {
      console.warn('No token available to refresh, checking for backup token');
      
      // Try to get token from session storage as backup
      const backupToken = sessionStorage.getItem(this.tokenKey);
      if (backupToken) {
        console.log('Found backup token in session storage');
        // Restore the token to localStorage
        localStorage.setItem(this.tokenKey, backupToken);
        return this.refreshToken(); // Try again with the restored token
      }
      
      console.error('No token available to refresh');
      return throwError(() => new Error('No token available to refresh'));
    }

    // Store a backup of the token in session storage
    sessionStorage.setItem(this.tokenKey, currentToken);
    
    console.log('Attempting to refresh token...');
    
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    
    // Create a direct XMLHttpRequest to avoid interceptor loops
    return new Observable<string>(observer => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.apiUrl}/refresh?timestamp=${timestamp}`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      xhr.setRequestHeader('Pragma', 'no-cache');
      xhr.setRequestHeader('Expires', '0');
      xhr.setRequestHeader('Authorization', `Bearer ${currentToken}`);
      
      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            
            // Check for token in different possible response formats
            const newToken = response.token || response.accessToken;
            
            if (!newToken) {
              console.error('Invalid refresh token response - no token found');
              observer.error(new Error('Invalid refresh token response'));
              return;
            }
            
            console.log('Token refreshed successfully');
            
            // Update stored token
            localStorage.setItem(this.tokenKey, newToken);
            
            // Decode and validate token structure
            const decodedToken = this.decodeToken(newToken);
            if (!decodedToken || !decodedToken.sub) {
              console.error('Invalid token format or missing required claims');
              observer.error(new Error('Invalid token format or missing required claims'));
              return;
            }
            
            console.log('New token expiration:', new Date(decodedToken.exp * 1000));
            
            // Update auth state
            this.authStateSubject.next(true);
            
            // Refresh WebSocket connection with the new token
            try {
              this.webSocketService.refreshConnection();
            } catch (error) {
              console.warn('Error refreshing WebSocket connection after token refresh:', error);
            }
            
            observer.next(newToken);
            observer.complete();
          } catch (e) {
            console.error('Error parsing refresh token response:', e);
            observer.error(new Error('Error parsing refresh token response'));
          }
        } else {
          console.error('Token refresh failed with status:', xhr.status);
          
          // Only logout if it's an authentication error
          if (xhr.status === 401 || xhr.status === 403) {
            console.log('Authentication error during token refresh, logging out');
            this.logout(); // Clear invalid session
          }
          
          observer.error(new Error(`Token refresh failed with status: ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => {
        console.error('Network error during token refresh');
        observer.error(new Error('Network error during token refresh'));
      };
      
      // Send with or without token in body based on server expectations
      xhr.send(JSON.stringify({ token: currentToken }));
    });
  }

  private handleTokenError(reason: string): void {
    console.warn(`Token error: ${reason}`);
    // Clear all auth-related data
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.currentUserKey);
    localStorage.removeItem('userBookings');
    
    // Update auth state
    this.authStateSubject.next(false);
    
    // Only navigate to login if not already there
    if (!window.location.href.includes('/login')) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });
    }
  }

}