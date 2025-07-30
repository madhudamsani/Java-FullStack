import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { getCurrentUserRole } from '../utils/role-checker';
import { getShowPermissionErrorMessage } from '../utils/show-permissions';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    console.log(`Intercepting request to: ${request.url} with method ${request.method}`);
    
    // Skip token validation for auth endpoints and image URLs
    if (request.url.includes('/api/auth/signin') || 
        request.url.includes('/api/auth/signup') || 
        this.isImageUrl(request.url)) {
      console.log('Skipping auth for auth endpoint or image URL:', request.url);
      return next.handle(request);
    }
    
    // Special handling for promotion endpoints
    const isPromotionEndpoint = request.url.includes('/api/promotions');
    console.log('Checking promotion endpoint:', request.url, 'isPromotionEndpoint:', isPromotionEndpoint);
    
    // Check for exact matches to ensure we're correctly identifying public promotion endpoints
    const isPublicPromotionEndpoint = isPromotionEndpoint && 
      (request.url.endsWith('/api/promotions/active') ||
       request.url.includes('/api/promotions/validate/') ||
       request.url.endsWith('/api/promotions/calculate'));
    
    console.log('isPublicPromotionEndpoint:', isPublicPromotionEndpoint, 'for URL:', request.url);
    
    if (isPublicPromotionEndpoint) {
      console.log('Skipping auth for public promotion endpoint:', request.url);
      return next.handle(request);
    }
    
    // Special handling for show, schedule, and venue endpoints
    const isShowEndpoint = request.url.includes('/api/shows');
    const isScheduleEndpoint = request.url.includes('/api/schedules');
    const isVenueEndpoint = request.url.includes('/api/venues');
    
    // For show and schedule endpoints, only specific GET requests are public
    const isPublicShowEndpoint = isShowEndpoint && request.method === 'GET' && 
      (request.url.match(/\/api\/shows$/) || // Main shows list
       request.url.match(/\/api\/shows\/\d+$/) || // Show details
       request.url.includes('/reviews') || // Show reviews
       request.url.includes('/recommended') || // Recommended shows
       request.url.includes('/schedules')); // Show schedules
    
    const isPublicScheduleEndpoint = isScheduleEndpoint && request.method === 'GET' &&
      !request.url.includes('/api/shows/'); // Public schedule endpoints, but not show-specific schedules
    
    // For venue endpoints, only GET requests are public
    const isPublicVenueEndpoint = isVenueEndpoint && request.method === 'GET';
    
    if (isPublicShowEndpoint || isPublicScheduleEndpoint || isPublicVenueEndpoint) {
      console.log('Skipping auth for public GET request to show/schedule/venue endpoint:', request.url);
      return next.handle(request);
    }
    
    // For other public endpoints
    if (this.isPublicEndpoint(request.url) && !isShowEndpoint && !isScheduleEndpoint && !isVenueEndpoint) {
      console.log('Skipping auth for other public endpoint:', request.url);
      return next.handle(request);
    }

    // Get the auth token directly from localStorage to avoid circular dependencies
    const authToken = localStorage.getItem('auth_token');
    
    // Check if we have a token
    if (!authToken) {
      console.warn('No auth token found in localStorage');
      
      // If this is a token refresh request, let it through without a token
      if (request.url.includes('/api/auth/refresh')) {
        console.log('Allowing token refresh request without authentication');
        return next.handle(request);
      }
      
      // For other requests, redirect to login
      this.handleAuthError();
      return throwError(() => new Error('Authentication required'));
    }
    
    // Check if token is expired
    try {
      const tokenData = JSON.parse(atob(authToken.split('.')[1]));
      const expirationTime = tokenData.exp * 1000;
      const isExpired = Date.now() > expirationTime;
      
      if (isExpired) {
        console.log('Token is expired, attempting to refresh');
        return this.handleTokenExpiration(request, next);
      }
    } catch (e) {
      console.error('Error parsing token:', e);
      this.handleAuthError();
      return throwError(() => new Error('Invalid authentication token'));
    }

    // Clone the request and add the authorization header
    const authReq = request.clone({
      setHeaders: {
        Authorization: `Bearer ${authToken}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    console.log('Added auth token to request:', request.url);

    // Handle the request and catch any authentication errors
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log(`Error ${error.status} for ${request.url}:`, error.message);
        
        if (error.status === 401) {
          console.error('Authentication error:', error.error?.message || 'Unauthorized');
          
          // Don't try to refresh token if this was already a refresh token request
          if (request.url.includes('/api/auth/refresh')) {
            console.log('Token refresh failed, logging out');
            this.handleAuthError();
            return throwError(() => new Error('Authentication failed'));
          }
          
          // Try to refresh token on any 401 error
          console.log('Attempting to refresh token after 401 error');
          return this.handleTokenExpiration(request, next).pipe(
            catchError(refreshError => {
              console.error('Token refresh failed:', refreshError);
              this.handleAuthError();
              return throwError(() => new Error('Authentication failed'));
            })
          );
        }
        
        if (error.status === 403) {
          console.error('Authorization error:', error.error?.message || 'Forbidden');
          
          // Check if this is a show update endpoint
          const isShowUpdateEndpoint = request.url.match(/\/api\/shows\/\d+$/) && 
                                      (request.method === 'PUT' || request.method === 'DELETE');
          
          // Get the current user role
          const userRole = getCurrentUserRole();
          console.log(`User with role ${userRole} received 403 error for ${request.url}`);
          
          if (isShowUpdateEndpoint) {
            // For show update endpoints, don't redirect to login, just return the error
            console.log('Show update permission error, returning error without redirect');
            
            if (userRole === 'ROLE_USER') {
              return throwError(() => new Error('Regular users cannot update shows. This action requires Organizer or Admin role.'));
            } else if (!userRole) {
              return throwError(() => new Error('You must be logged in with Organizer or Admin role to update shows.'));
            } else {
              return throwError(() => new Error('You do not have permission to update this show. This may be because you are not the creator of this show or your account lacks the necessary privileges.'));
            }
          } else {
            // For other endpoints, handle normally
            this.handleAuthError();
            return throwError(() => new Error('Access denied'));
          }
        }
        
        return throwError(() => error);
      })
    );
  }

  private isImageUrl(url: string): boolean {
    // Check if the URL is for an image resource
    return url.match(/\.(jpg|jpeg|png|gif|svg)$/i) !== null ||
           url.includes('images.unsplash.com') ||
           url.includes('omdbapi.com') ||
           url.includes('m.media-amazon.com') ||
           url.includes('assets-in.bmscdn.com') ||
           url.includes('upload.wikimedia.org');
  }

  private handleTokenExpiration(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    console.log('Attempting to refresh token...');
    
    // Don't remove the token before trying to refresh it
    // This was causing the "No token available to refresh" error
    
    return this.authService.refreshToken().pipe(
      switchMap(newToken => {
        if (!newToken) {
          console.error('Token refresh returned empty token');
          throw new Error('Token refresh failed');
        }
        
        console.log('Token refreshed successfully');
        
        // Update the request with the new token
        const updatedRequest = request.clone({
          setHeaders: {
            Authorization: `Bearer ${newToken}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        console.log('Retrying request with new token');
        return next.handle(updatedRequest);
      }),
      catchError(error => {
        console.error('Token refresh failed:', error);
        
        // Only force logout for specific endpoints that require authentication
        // For user bookings, we want to be more lenient
        if (!request.url.includes('/bookings/my-bookings')) {
          // Force logout to clear any invalid session state
          this.authService.logout();
          
          // Redirect to login
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: this.router.url, error: 'Session expired. Please log in again.' }
          });
        }
        
        return throwError(() => new Error('Token refresh failed'));
      })
    );
  }
  private isPublicEndpoint(url: string): boolean {
    // Define public endpoints
    const publicEndpoints = [
      '/api/schedules/venue/',
      '/api/auth/refresh',
      '/api/bookings/notifications',
      '/api/auth/signup',
      '/api/auth/signin',
      '/api/seat-maps',
      '/api/seats',
      '/api/promotions/active',
      '/api/promotions/validate/',
      '/api/promotions/calculate'
    ];
    
    // Special handling for show endpoints
    // Main shows endpoint is public for GET but not for POST/PUT/DELETE
    const isMainShowsEndpoint = url.includes('/api/shows') && !url.match(/\/api\/shows\/\d+$/);
    
    // Show detail endpoints are public for GET but not for PUT/DELETE
    const isShowDetailEndpoint = url.match(/\/api\/shows\/\d+$/) !== null;
    
    // Schedule endpoints are public for GET but not for POST/PUT/DELETE
    const isScheduleEndpoint = url.includes('/api/schedules') && !url.includes('/api/schedules/venue/');
    
    // Venue endpoints are public for GET but not for POST/PUT/DELETE (handled in intercept method)
    const isVenueEndpoint = url.includes('/api/venues');
    
    // Check if it's a public endpoint from our list
    const isPublic = publicEndpoints.some(endpoint => url.includes(endpoint));
    
    // For special endpoints, we'll return true but the actual method check happens in the intercept method
    if (isMainShowsEndpoint || isShowDetailEndpoint || isScheduleEndpoint || isVenueEndpoint) {
      console.log('Show/schedule/venue endpoint detected, will be checked for method type in intercept');
      return true;
    }
    
    return isPublic;
  }

  private handleAuthError(): void {
    // Check if we're on certain pages where we don't want to force logout
    const isUserBookingsPage = this.router.url.includes('/user/bookings');
    const isShowEditPage = this.router.url.includes('/organizer/shows/edit/');
    const isShowCreatePage = this.router.url.includes('/organizer/shows/create');
    
    // Don't force logout on these pages
    if (isUserBookingsPage || isShowEditPage || isShowCreatePage) {
      console.warn(`Authentication issue on ${this.router.url}, but not forcing logout`);
      // We'll let the component handle this more gracefully
      return;
    }
    
    // For other pages, proceed with logout
    localStorage.setItem('force_logout', 'true');
    
    // Logout the user
    this.authService.logout();
    
    const currentUrl = this.router.url;
    this.router.navigate(['/login'], { 
      queryParams: { 
        returnUrl: currentUrl,
        error: 'Your session has expired. Please log in again.'
      }
    });
  }
}