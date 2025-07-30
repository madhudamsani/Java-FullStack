import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { catchError, map, tap, switchMap, delay, take } from 'rxjs/operators';

import { 
  Show, 
  ShowSchedule, 
  ShowStatus,
  ShowReview, 
  ShowFilter,
  ShowsResponse,
  Promotion,
  ShowAnalytics,
  SeatMap,
  ShowCreator
} from '../models/show.model';
import { DataTransformerService } from './data-transformer.service';
import { environment } from '../../environments/environment';
import { convert12hTo24h } from '../utils/time-formatter';
import { getCurrentUserRole } from '../utils/role-checker';
import { canUpdateShow, canCreateShow, canDeleteShow, getShowPermissionErrorMessage } from '../utils/show-permissions';
import { 
  determineShowStatus, 
  needsStatusUpdate, 
  hasFutureSchedules, 
  hasTodaySchedules,
  getScheduleWarning 
} from '../utils/schedule-validator';

@Injectable({
  providedIn: 'root'
})
export class ShowService {
  private apiUrl = `${environment.apiUrl}/shows`;
  private get httpOptions() {
    // Get the auth token from localStorage
    const token = localStorage.getItem('auth_token');
    
    // Create headers with content type and auth token if available
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
    
    return { headers };
  };

  constructor(
    private http: HttpClient,
    private dataTransformer: DataTransformerService
  ) {}

  getAllShows(includeCancelled: boolean = false): Observable<Show[]> {
    console.log('Fetching all shows from:', this.apiUrl);
    
    // Add query parameter to exclude cancelled shows
    let params = new HttpParams();
    if (!includeCancelled) {
      params = params.append('excludeStatus', 'CANCELLED');
      console.log('Excluding CANCELLED shows');
    }
    
    return this.http.get<any[]>(this.apiUrl, { params }).pipe(
      tap(response => console.log('Shows API response:', response)),
      map(shows => this.dataTransformer.transformShows(shows)),
      catchError(error => {
        console.error('Error fetching shows:', error);
        return throwError(() => new Error('Failed to fetch shows'));
      })
    );
  }

  getMyShows(): Observable<Show[]> {
    console.log('Fetching organizer shows from:', `${this.apiUrl}/my-shows`);
    return this.http.get<any[]>(`${this.apiUrl}/my-shows`, this.httpOptions).pipe(
      tap(response => console.log('My shows API response:', response)),
      map(shows => this.dataTransformer.transformShows(shows)),
      catchError(error => {
        console.error('Error fetching my shows:', error);
        return throwError(() => new Error('Failed to fetch your shows'));
      })
    );
  }

  getShowById(id: number): Observable<Show> {
    console.log(`Fetching show details for ID: ${id} from ${this.apiUrl}/${id}`);
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      tap(response => console.log(`Raw show response for ID ${id}:`, response)),
      map(show => {
        const transformedShow = this.dataTransformer.transformShow(show);
        console.log(`Transformed show for ID ${id}:`, transformedShow);
        return transformedShow;
      }),
      catchError(error => {
        console.error(`Error fetching show ${id}:`, error);
        return throwError(() => new Error('Failed to fetch show details'));
      })
    );
  }

  getShowsByStatus(status: string): Observable<Show[]> {
    return this.http.get<any[]>(`${this.apiUrl}/status/${status}`).pipe(
      map(shows => this.dataTransformer.transformShows(shows)),
      catchError(error => {
        console.error(`Error fetching shows by status ${status}:`, error);
        return throwError(() => new Error('Failed to fetch shows by status'));
      })
    );
  }

  searchShows(query: string): Observable<Show[]> {
    const params = new HttpParams().set('search', query);
    return this.http.get<any[]>(`${this.apiUrl}/search`, { params }).pipe(
      map(shows => this.dataTransformer.transformShows(shows)),
      catchError(error => {
        console.error('Error searching shows:', error);
        return throwError(() => new Error('Failed to search shows'));
      })
    );
  }

  createShow(show: Show): Observable<Show> {
    // Check if user has permission to create shows
    if (!canCreateShow()) {
      const errorMessage = getShowPermissionErrorMessage('create');
      console.error(errorMessage);
      return throwError(() => new Error(errorMessage));
    }
    
    // Convert time format if needed
    if (show.time && (show.time.includes('AM') || show.time.includes('PM'))) {
      console.log(`Converting time format from ${show.time} to 24-hour format`);
      show = {
        ...show,
        time: convert12hTo24h(show.time)
      };
    }
    
    // Get the auth token directly to ensure we have it for this request
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('No authentication token available for show creation');
      return throwError(() => new Error('Authentication required to create show'));
    }
    
    // Create headers with auth token
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.post<any>(this.apiUrl, show, { headers }).pipe(
      map(response => this.dataTransformer.transformShow(response)),
      catchError(error => {
        console.error('Error creating show:', error);
        if (error.status === 403) {
          return throwError(() => new Error('You do not have permission to create shows. This action requires Organizer or Admin role.'));
        }
        return throwError(() => new Error(error.error?.message || 'Failed to create show'));
      })
    );
  }

  /**
   * Update only the details of a show (title, description, etc.) without affecting schedules
   * @param id ID of the show to update
   * @param details Show details to update
   */
  updateShowDetailsOnly(id: number, details: any): Observable<Show> {
    // Check permission using getShowById and canUpdateShow
    return this.getShowById(id).pipe(
      take(1),
      switchMap(show => {
        if (!canUpdateShow(show)) {
          const errorMessage = getShowPermissionErrorMessage('update', show);
          console.error(errorMessage);
          return throwError(() => new Error(errorMessage));
        }
        
        // If permission check passes, proceed with the update
        return this.http.put<Show>(`${this.apiUrl}/${id}/details`, details)
          .pipe(
            tap(updatedShow => {
              // Just log the update - we can refresh cached data later if needed
              console.log('Successfully updated show details:', updatedShow.title);
            }),
            catchError(error => {
              console.error('Error updating show details:', error);
              return throwError(() => new Error('Failed to update show details: ' + error.message));
            })
          );
      }),
      catchError(error => {
        console.error('Error getting show details:', error);
        return throwError(() => new Error('Failed to get show details: ' + error.message));
      })
    );
  }

  updateShow(id: number, show: Show): Observable<Show> {
    // First check if the user has permission to update this specific show
    if (!canUpdateShow(show)) {
      const errorMessage = getShowPermissionErrorMessage('update', show);
      console.error(errorMessage);
      return throwError(() => new Error(errorMessage));
    }
    
    // Create a copy of the show to avoid modifying the original
    const showToUpdate = { ...show };
    
    // Convert time format if needed
    if (showToUpdate.time && (showToUpdate.time.includes('AM') || showToUpdate.time.includes('PM'))) {
      console.log(`Converting time format from ${showToUpdate.time} to 24-hour format`);
      showToUpdate.time = convert12hTo24h(showToUpdate.time);
    }
    
    // Also check and convert times in schedules if present
    if (showToUpdate.schedules && showToUpdate.schedules.length > 0) {
      showToUpdate.schedules = showToUpdate.schedules.map(schedule => {
        const updatedSchedule = { ...schedule };
        if (updatedSchedule.showTime && (updatedSchedule.showTime.includes('AM') || updatedSchedule.showTime.includes('PM'))) {
          console.log(`Converting schedule time from ${updatedSchedule.showTime} to 24-hour format`);
          updatedSchedule.showTime = convert12hTo24h(updatedSchedule.showTime);
        }
        return updatedSchedule;
      });
    }
    
    console.log(`Sending updated show to backend:`, showToUpdate);
    
    // Get the auth token directly to ensure we have it for this request
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('No authentication token available for show update');
      return throwError(() => new Error('Authentication required to update show'));
    }
    
    // Create headers with auth token
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    // Use explicit headers to ensure authentication is included
    return this.http.put<any>(`${this.apiUrl}/${id}`, showToUpdate, { headers }).pipe(
      map(response => this.dataTransformer.transformShow(response)),
      catchError(error => {
        console.error(`Error updating show ${id}:`, error);
        if (error.status === 403) {
          // Handle forbidden error with more specific message
          const errorMessage = getShowPermissionErrorMessage('update', show);
          return throwError(() => new Error(errorMessage));
        }
        return throwError(() => new Error(error.error?.message || 'Failed to update show'));
      })
    );
  }

  deleteShow(id: number, force?: boolean, reason?: string, show?: Show): Observable<any> {
    // If we have the show object, check permissions first
    if (show && !canDeleteShow(show)) {
      const errorMessage = getShowPermissionErrorMessage('delete', show);
      console.error(errorMessage);
      return throwError(() => new Error(errorMessage));
    }
    
    // Get the auth token directly to ensure we have it for this request
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('No authentication token available for show deletion');
      return throwError(() => new Error('Authentication required to delete show'));
    }
    
    // Create headers with auth token
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    // Build query parameters if needed
    let params = new HttpParams();
    if (force !== undefined) {
      params = params.set('force', force.toString());
    }
    if (reason !== undefined && reason !== null) {
      params = params.set('reason', reason);
    }
    if (show?.status) {
      params = params.set('showStatus', show.status);
    }
    
    return this.http.delete<any>(
      `${this.apiUrl}/${id}`, 
      { 
        headers, 
        params,
        observe: 'response' // Get the full response to check status codes
      }
    ).pipe(
      map(response => {
        // If we get a 200 OK with a body, return the body
        if (response.body) {
          return response.body;
        }
        // Otherwise return an empty object
        return {};
      }),
      catchError(error => {
        console.error(`Error deleting show ${id}:`, error);
        
        // If it's a 409 Conflict with active bookings, pass through the error
        if (error.status === 409 && error.error?.requiresConfirmation) {
          return throwError(() => error);
        }
        
        if (error.status === 403) {
          // Handle forbidden error with more specific message
          const errorMessage = getShowPermissionErrorMessage('delete', show);
          return throwError(() => new Error(errorMessage));
        }
        return throwError(() => new Error(error.error?.message || 'Failed to delete show'));
      })
    );
  }
  
  getSchedules(showId: number): Observable<ShowSchedule[]> {
    // Add timestamp to prevent caching issues
    const timestamp = new Date().getTime();
    const params = new HttpParams().set('_t', timestamp.toString());
    
    return this.http.get<any[]>(`${this.apiUrl}/${showId}/schedules`, { params }).pipe(
      map(schedules => schedules.map(schedule => {
        // Handle both field names for seat availability
        const seatsAvailable = schedule.seatsAvailable !== undefined ? schedule.seatsAvailable : schedule.seats_available;
        
        return {
          id: schedule.id,
          showId: schedule.showId,
          showDate: schedule.showDate,
          showTime: schedule.showTime,
          venue: schedule.venue,
          basePrice: schedule.basePrice,
          status: schedule.status,
          seatsAvailable: seatsAvailable, // Primary field matching backend
          availableSeats: seatsAvailable, // For backward compatibility
          totalSeats: schedule.totalSeats
        };
      })),
      catchError(error => {
        console.error(`Error fetching schedules for show ${showId}:`, error);
        return throwError(() => new Error('Failed to fetch show schedules'));
      })
    );
  }

  updateShowStatus(id: number, status: ShowStatus): Observable<void> {
    // Try both approaches - first with query parameters
    console.log(`Updating show ${id} status to ${status} using query parameters`);
    const params = new HttpParams().set('status', status);
    
    return this.http.patch<void>(
      `${this.apiUrl}/${id}/status`,
      null, // No request body
      { 
        headers: this.httpOptions.headers,
        params: params
      }
    ).pipe(
      catchError(error => {
        console.error(`Error updating show status ${id} with query params:`, error);
        
        // If that fails, try with request body as fallback
        console.log(`Trying fallback with request body for show ${id} status update`);
        return this.http.patch<void>(
          `${this.apiUrl}/${id}/status`,
          { status },
          this.httpOptions
        ).pipe(
          catchError(fallbackError => {
            console.error(`Error updating show status ${id} with request body:`, fallbackError);
            return throwError(() => new Error('Failed to update show status'));
          })
        );
      })
    );
  }

  getShowReviews(showId: number): Observable<ShowReview[]> {
    return this.http.get<ShowReview[]>(`${this.apiUrl}/${showId}/reviews`).pipe(
      catchError(error => {
        console.error('Error fetching show reviews:', error);
        return throwError(() => new Error('Failed to fetch show reviews'));
      })
    );
  }
  
  addReview(showId: number, review: Partial<ShowReview>): Observable<ShowReview> {
    return this.http.post<ShowReview>(
      `${this.apiUrl}/${showId}/reviews`, 
      review,
      this.httpOptions
    ).pipe(
      catchError(error => {
        console.error('Error adding review:', error);
        return throwError(() => new Error('Failed to add review'));
      })
    );
  }
  
  getRecommendedShows(showId?: number): Observable<Show[]> {
    const url = showId ? 
      `${this.apiUrl}/recommended/${showId}` : 
      `${this.apiUrl}/recommended`;
    
    return this.http.get<any[]>(url).pipe(
      map(shows => this.dataTransformer.transformShows(shows)),
      catchError(error => {
        console.error('Error fetching recommended shows:', error);
        return throwError(() => new Error('Failed to fetch recommended shows'));
      })
    );
  }

  searchShowsByFilters(filters: ShowFilter): Observable<ShowsResponse> {
    let params = new HttpParams();
    
    // Log the filters being applied
    console.log('Applying filters:', filters);
    
    // By default, exclude CANCELLED shows unless explicitly requested
    if (filters.status) {
      params = params.append('status', filters.status);
    } else if (filters.excludeStatus) {
      // If a specific status to exclude is provided, use it
      params = params.append('excludeStatus', filters.excludeStatus);
      console.log(`Excluding ${filters.excludeStatus} shows`);
    } else {
      // By default, exclude CANCELLED shows
      params = params.append('excludeStatus', 'CANCELLED');
      console.log('Excluding CANCELLED shows by default');
    }
    
    // Handle type parameter - this is the most important for filtering by show type
    if (filters.type) {
      params = params.append('type', filters.type);
      console.log('Added type filter:', filters.type);
    }
    
    // Handle other filter parameters
    if (filters.genre) {
      params = params.append('genre', filters.genre);
    }
    if (filters.search) {
      params = params.append('search', filters.search);
    }
    if (filters.dateFrom) {
      params = params.append('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      params = params.append('dateTo', filters.dateTo);
    }
    if (filters.venue) {
      params = params.append('venue', filters.venue);
    }
    if (filters.priceMin !== undefined) {
      params = params.append('priceMin', filters.priceMin.toString());
    }
    if (filters.priceMax !== undefined) {
      params = params.append('priceMax', filters.priceMax.toString());
    }
    if (filters.sort) {
      params = params.append('sort', filters.sort);
    }
    if (filters.page !== undefined) {
      params = params.append('page', filters.page.toString());
    }
    if (filters.pageSize !== undefined) {
      params = params.append('size', filters.pageSize.toString()); // Changed to 'size' to match backend
    }
    
    // Handle category parameter (for backward compatibility)
    if (filters['category'] && !filters.type) {
      const category = String(filters['category']).toLowerCase();
      
      // Map category to type if needed
      if (category === 'movies') {
        params = params.append('type', 'Movie');
        console.log('Mapped category "movies" to type "Movie"');
      } else if (category === 'concerts') {
        params = params.append('type', 'Concert');
        console.log('Mapped category "concerts" to type "Concert"');
      } else if (category === 'theater') {
        params = params.append('type', 'Theatrical');
        console.log('Mapped category "theater" to type "Theatrical"');
      } else if (category === 'events') {
        params = params.append('type', 'Event');
        console.log('Mapped category "events" to type "Event"');
      } else if (category === 'sports') {
        params = params.append('genre', 'Sports');
        console.log('Mapped category "sports" to genre "Sports"');
      } else {
        // For other categories, pass as-is
        params = params.append('category', String(filters['category']));
      }
    }

    console.log('Final request params:', params.toString());
    
    return this.http.get<any>(`${this.apiUrl}/filter`, { params }).pipe(
      tap(response => console.log('Filter API response:', response)),
      map(response => {
        // Check if response is in the expected format
        if (response && response.content) {
          return {
            content: this.dataTransformer.transformShows(response.content),
            totalElements: response.totalElements,
            totalPages: response.totalPages,
            size: response.size,
            number: response.number,
            first: response.first,
            last: response.last,
            empty: response.empty
          };
        } else if (Array.isArray(response)) {
          // Handle case where response is an array instead of a page
          console.log('Response is an array, converting to page format');
          return {
            content: this.dataTransformer.transformShows(response),
            totalElements: response.length,
            totalPages: 1,
            size: response.length,
            number: 0,
            first: true,
            last: true,
            empty: response.length === 0
          };
        } else {
          console.error('Unexpected response format:', response);
          return {
            content: [],
            totalElements: 0,
            totalPages: 0,
            size: 0,
            number: 0,
            first: true,
            last: true,
            empty: true
          };
        }
      }),
      catchError(error => {
        console.error('Error filtering shows:', error);
        return throwError(() => new Error('Failed to filter shows'));
      })
    );
  }

  searchMyShowsByFilters(filters: ShowFilter): Observable<ShowsResponse> {
    let params = new HttpParams();
    
    // Log the filters being applied
    console.log('Applying filters for my shows:', filters);
    
    // Handle filter parameters
    if (filters.status) {
      params = params.append('status', filters.status);
    }
    if (filters.search) {
      params = params.append('search', filters.search);
    }
    if (filters.dateFrom) {
      params = params.append('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      params = params.append('dateTo', filters.dateTo);
    }
    if (filters.page !== undefined) {
      params = params.append('page', filters.page.toString());
    }
    if (filters.pageSize !== undefined) {
      params = params.append('size', filters.pageSize.toString());
    }
    
    console.log('Final my shows search params:', params.toString());
    
    return this.http.get<any>(`${this.apiUrl}/my-shows/search`, { params, ...this.httpOptions }).pipe(
      tap(response => console.log('My shows search response:', response)),
      map(response => {
        // Handle both array and paginated responses
        if (Array.isArray(response)) {
          return {
            content: this.dataTransformer.transformShows(response),
            totalElements: response.length,
            totalPages: 1,
            size: response.length,
            number: 0,
            first: true,
            last: true,
            empty: response.length === 0
          };
        } else if (response && response.content) {
          return {
            content: this.dataTransformer.transformShows(response.content),
            totalElements: response.totalElements || 0,
            totalPages: response.totalPages || 1,
            size: response.size || 10,
            number: response.number || 0,
            first: response.first || true,
            last: response.last || true,
            empty: response.empty || false
          };
        } else {
          return {
            content: [],
            totalElements: 0,
            totalPages: 0,
            size: 0,
            number: 0,
            first: true,
            last: true,
            empty: true
          };
        }
      }),
      catchError(error => {
        console.error('Error searching my shows:', error);
        return throwError(() => new Error('Failed to search your shows'));
      })
    );
  }

  getShowTypes(): string[] {
    return ['Movie', 'Theatrical', 'Concert', 'Event', 'Other'];
  }

  getAllGenres(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/genres`).pipe(
      catchError(error => {
        console.error('Error fetching genres:', error);
        return throwError(() => new Error('Failed to fetch genres'));
      })
    );
  }

  getAllLanguages(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/languages`).pipe(
      catchError(error => {
        console.error('Error fetching languages:', error);
        return throwError(() => new Error('Failed to fetch languages'));
      })
    );
  }

  getScheduleById(showId: number, scheduleId: number): Observable<ShowSchedule> {
    return this.http.get<ShowSchedule>(`${this.apiUrl}/${showId}/schedules/${scheduleId}`);
  }

  addSchedule(showId: number, schedule: ShowSchedule): Observable<ShowSchedule> {
    console.log('Adding schedule for show:', showId, schedule);
    return this.http.post<ShowSchedule>(`${this.apiUrl}/${showId}/schedules`, schedule)
      .pipe(
        tap(response => {
          console.log('Schedule creation response:', response);
          
          // Ensure the response has the expected format
          if (response) {
            // If showTime is missing but we have startTime, use that
            if (!response.showTime && (response as any).startTime) {
              response.showTime = (response as any).startTime;
            }
            
            // Make sure we have a valid showId
            if (!response.showId) {
              response.showId = showId;
            }
          }
        }),
        catchError(error => {
          console.error('Error creating schedule:', error);
          
          // Handle validation errors with suggestions
          if (error.status === 409 && error.error) {
            const errorData = error.error;
            let errorMessage = errorData.error || 'Schedule conflict detected';
            
            if (errorData.suggestedTimes && errorData.suggestedTimes.length > 0) {
              errorMessage += '\n\nSuggested alternative times: ' + errorData.suggestedTimes.join(', ');
            }
            
            return throwError(() => new Error(errorMessage));
          }
          
          return throwError(() => new Error('Failed to create schedule: ' + (error.message || 'Unknown error')));
        })
      );
  }

  updateSchedule(showId: number, scheduleId: number, schedule: ShowSchedule): Observable<ShowSchedule> {
    console.log('Updating schedule:', schedule);
    return this.http.put<ShowSchedule>(`${this.apiUrl}/${showId}/schedules/${scheduleId}`, schedule)
      .pipe(
        delay(100), // Small delay to ensure backend commits the changes
        tap(response => {
          console.log('Schedule update response:', response);
          
          // Ensure the response has the expected format
          if (response) {
            // If showTime is missing but we have startTime, use that
            if (!response.showTime && (response as any).startTime) {
              response.showTime = (response as any).startTime;
            }
            
            // Make sure we have a valid showId
            if (!response.showId) {
              response.showId = showId;
            }
          }
        }),
        catchError(error => {
          console.error('Error updating schedule:', error);
          
          // Handle validation errors with suggestions
          if (error.status === 409 && error.error) {
            const errorData = error.error;
            let errorMessage = errorData.error || 'Schedule conflict detected';
            
            if (errorData.suggestedTimes && errorData.suggestedTimes.length > 0) {
              errorMessage += '\n\nSuggested alternative times: ' + errorData.suggestedTimes.join(', ');
            }
            
            return throwError(() => new Error(errorMessage));
          }
          
          return throwError(() => new Error('Failed to update schedule: ' + (error.message || 'Unknown error')));
        })
      );
  }

  deleteSchedule(showId: number, scheduleId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${showId}/schedules/${scheduleId}`);
  }

  addBulkTimeSlots(showId: number, bulkData: any): Observable<ShowSchedule[]> {
    console.log('Adding bulk time slots for show:', showId, bulkData);
    return this.http.post<ShowSchedule[]>(`${this.apiUrl}/${showId}/schedules/bulk-timeslots`, bulkData)
      .pipe(
        tap(response => {
          console.log('Bulk time slots creation response:', response);
          
          // Ensure each schedule has the expected format
          if (response && Array.isArray(response)) {
            response.forEach(schedule => {
              // If showTime is missing but we have startTime, use that
              if (!schedule.showTime && (schedule as any).startTime) {
                schedule.showTime = (schedule as any).startTime;
              }
              
              // Make sure we have a valid showId
              if (!schedule.showId) {
                schedule.showId = showId;
              }
            });
          }
        }),
        catchError(error => {
          console.error('Error creating bulk time slots:', error);
          
          // Handle validation errors with suggestions
          if (error.status === 409 && error.error) {
            const errorData = error.error;
            let errorMessage = errorData.error || 'Schedule conflict detected';
            
            if (errorData.suggestedTimes && errorData.suggestedTimes.length > 0) {
              errorMessage += '\n\nSuggested alternative times: ' + errorData.suggestedTimes.join(', ');
            }
            
            return throwError(() => new Error(errorMessage));
          }
          
          return throwError(() => new Error('Failed to create time slots: ' + (error.message || 'Unknown error')));
        })
      );
  }

  getScheduleAvailability(scheduleId: number): Observable<any> {
    // Add timestamp to prevent caching and ensure real-time data
    const timestamp = new Date().getTime();
    
    // Get the auth token
    const token = localStorage.getItem('auth_token');
    
    // Create headers with authentication and cache control
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Authorization': token ? `Bearer ${token}` : ''
    });
    
    // First try to get the schedule directly to get the correct available seats count
    return this.http.get<any>(
      `${environment.apiUrl}/schedules/${scheduleId}?timestamp=${timestamp}`,
      { headers: headers }
    ).pipe(
      switchMap(schedule => {
        if (schedule && schedule.seatsAvailable !== undefined) {
          console.log(`Schedule ${scheduleId} has ${schedule.seatsAvailable} available seats from direct API call`);
          return of(schedule.seatsAvailable);
        }
        
        // If seatsAvailable is not available in the schedule, fall back to counting available seats
        // Get the show ID from localStorage if available
        let showId = schedule?.showId || 0;
        if (!showId) {
          try {
            const scheduleData = JSON.parse(localStorage.getItem(`schedule_${scheduleId}`) || '{}');
            if (scheduleData && scheduleData.showId) {
              showId = scheduleData.showId;
              console.log(`Using show ID ${showId} from localStorage for schedule ${scheduleId}`);
            }
          } catch (e) {
            console.error('Error getting show ID from localStorage:', e);
          }
        }
        
        console.log(`Fetching seat map for show ${showId}, schedule ${scheduleId} to count available seats`);
        
        // Use the seat-maps endpoint to get the seat map and count available seats
        return this.http.get<any>(
          `${environment.apiUrl}/seat-maps/shows/${showId}/schedules/${scheduleId}?timestamp=${timestamp}`,
          { headers: headers }
        ).pipe(
          map(response => {
            console.log(`Received seat map response for schedule ${scheduleId}`);
            
            // Check if the response is valid and has rows
            if (!response || !response.rows) {
              console.error(`Empty seat map received for schedule ${scheduleId}`);
              return 0; // Return 0 available seats if no data
            }
            
            // Check if the metadata contains the available seats count
            if (response.metadata && response.metadata.scheduleAvailableSeats !== undefined) {
              console.log(`Using scheduleAvailableSeats from metadata: ${response.metadata.scheduleAvailableSeats}`);
              return response.metadata.scheduleAvailableSeats;
            }
            
            // Count available seats manually
            let availableSeats = 0;
            response.rows.forEach((row: any) => {
              if (row.seats) {
                row.seats.forEach((seat: any) => {
                  if (seat.status === 'AVAILABLE') {
                    availableSeats++;
                  }
                });
              }
            });
            
            console.log(`Counted ${availableSeats} available seats for schedule ${scheduleId}`);
            return availableSeats;
          }),
          catchError(error => {
            console.error(`Error fetching seat map for schedule ${scheduleId}:`, error);
            return of(0); // Return 0 instead of throwing error
          })
        );
      }),
      catchError(error => {
        console.error(`Error fetching schedule ${scheduleId}:`, error);
        return of(0); // Return 0 available seats on error
      })
    );
  }

  getPromotions(showId: number): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.apiUrl}/${showId}/promotions`, this.httpOptions).pipe(
      catchError(error => {
        console.error(`Error fetching promotions for show ${showId}:`, error);
        return throwError(() => new Error('Failed to fetch promotions'));
      })
    );
  }

  getAllPromotions(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${environment.apiUrl}/promotions`, this.httpOptions).pipe(
      catchError(error => {
        console.error('Error fetching all promotions:', error);
        return throwError(() => new Error('Failed to fetch promotions'));
      })
    );
  }

  createPromotion(showId: number, promotion: Promotion): Observable<Promotion> {
    return this.http.post<Promotion>(`${this.apiUrl}/${showId}/promotions`, promotion, this.httpOptions).pipe(
      catchError(error => {
        console.error(`Error creating promotion for show ${showId}:`, error);
        return throwError(() => new Error('Failed to create promotion'));
      })
    );
  }

  updatePromotion(showId: number, promotionId: number, promotion: Promotion): Observable<Promotion> {
    return this.http.put<Promotion>(`${this.apiUrl}/${showId}/promotions/${promotionId}`, promotion, this.httpOptions).pipe(
      catchError(error => {
        console.error(`Error updating promotion ${promotionId} for show ${showId}:`, error);
        return throwError(() => new Error('Failed to update promotion'));
      })
    );
  }

  deletePromotion(showId: number, promotionId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${showId}/promotions/${promotionId}`, this.httpOptions).pipe(
      catchError(error => {
        console.error(`Error deleting promotion ${promotionId} for show ${showId}:`, error);
        return throwError(() => new Error('Failed to delete promotion'));
      })
    );
  }

  getShowAnalytics(showId: number): Observable<ShowAnalytics> {
    // Use the correct analytics endpoint
    return this.http.get<ShowAnalytics>(`${environment.apiUrl}/analytics/shows/${showId}`, this.httpOptions).pipe(
      catchError(error => {
        console.error(`Error fetching analytics for show ${showId}:`, error);
        return throwError(() => new Error('Failed to load performance metrics. Please try again.'));
      })
    );
  }

  getUserFavorites(): Observable<Show[]> {
    return this.http.get<Show[]>(`${environment.apiUrl}/users/favorites`);
  }

  addToFavorites(showId: number): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/users/favorites/${showId}`, {});
  }

  removeFromFavorites(showId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/users/favorites/${showId}`);
  }

  getUserRatings(): Observable<ShowReview[]> {
    return this.http.get<ShowReview[]>(`${environment.apiUrl}/users/ratings`);
  }

  addRating(showId: number, rating: ShowReview): Observable<ShowReview> {
    return this.http.post<ShowReview>(`${this.apiUrl}/${showId}/ratings`, rating);
  }

  updateRating(ratingId: number, rating: Partial<ShowReview>): Observable<ShowReview> {
    return this.http.put<ShowReview>(`${environment.apiUrl}/ratings/${ratingId}`, rating);
  }

  deleteRating(ratingId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/ratings/${ratingId}`);
  }

  getSeatMap(showId: number, scheduleId: number): Observable<SeatMap> {
    return this.http.get<SeatMap>(`${this.apiUrl}/${showId}/schedules/${scheduleId}/seats`);
  }

  updateSeatMap(showId: number, scheduleId: number, seatMap: SeatMap): Observable<SeatMap> {
    return this.http.put<SeatMap>(`${this.apiUrl}/${showId}/schedules/${scheduleId}/seats`, seatMap);
  }

  getVenues(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/venues`);
  }

  getShows(filter: ShowFilter): Observable<ShowsResponse> {
    const params = this.buildShowParams(filter);
    return this.http.get<ShowsResponse>(`${environment.apiUrl}/shows`, { params });
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiUrl}/shows/genres`);
  }

  private buildShowParams(filter: ShowFilter): HttpParams {
    let params = new HttpParams();
    Object.keys(filter).forEach(key => {
      if (filter[key] !== undefined && filter[key] !== null) {
        params = params.set(key, filter[key]!.toString());
      }
    });
    return params;
  }

  /**
   * Check if a show needs status update based on its schedules
   */
  checkShowStatusUpdate(show: Show): { needsUpdate: boolean; suggestedStatus: ShowStatus; warning?: string } {
    const needsUpdate = needsStatusUpdate(show);
    const suggestedStatus = determineShowStatus(show);
    const warning = getScheduleWarning(show);

    return {
      needsUpdate,
      suggestedStatus,
      warning: warning || undefined
    };
  }

  /**
   * Automatically update show status if needed
   */
  autoUpdateShowStatus(show: Show): Observable<Show | null> {
    const statusCheck = this.checkShowStatusUpdate(show);
    
    if (!statusCheck.needsUpdate || !show.id) {
      return of(null);
    }

    console.log(`Auto-updating show ${show.id} status from ${show.status} to ${statusCheck.suggestedStatus}`);
    
    return this.updateShowStatus(show.id, statusCheck.suggestedStatus).pipe(
      switchMap(() => this.getShowById(show.id!)),
      catchError(error => {
        console.error(`Failed to auto-update show ${show.id} status:`, error);
        return of(null);
      })
    );
  }

  /**
   * Check multiple shows for status updates
   */
  checkMultipleShowsStatus(shows: Show[]): Observable<{ show: Show; statusCheck: any }[]> {
    const results = shows.map(show => ({
      show,
      statusCheck: this.checkShowStatusUpdate(show)
    }));

    return of(results);
  }

  /**
   * Get shows that need attention (warnings or status updates)
   */
  getShowsNeedingAttention(): Observable<{ show: Show; issues: string[] }[]> {
    return this.getMyShows().pipe(
      map(shows => {
        return shows.map(show => {
          const issues: string[] = [];
          const statusCheck = this.checkShowStatusUpdate(show);
          
          if (statusCheck.warning) {
            issues.push(statusCheck.warning);
          }
          
          if (statusCheck.needsUpdate) {
            issues.push(`Status should be updated to ${statusCheck.suggestedStatus}`);
          }

          // Additional checks
          if (!hasFutureSchedules(show) && hasTodaySchedules(show)) {
            issues.push('Playing today but no future schedules');
          }

          if (!show.schedules || show.schedules.length === 0) {
            issues.push('No schedules defined');
          }

          return { show, issues };
        }).filter(item => item.issues.length > 0);
      })
    );
  }

  /**
   * Batch update show statuses for shows that need it
   */
  batchUpdateShowStatuses(shows: Show[]): Observable<{ updated: Show[]; failed: { show: Show; error: any }[] }> {
    const showsNeedingUpdate = shows.filter(show => needsStatusUpdate(show) && show.id);
    
    if (showsNeedingUpdate.length === 0) {
      return of({ updated: [], failed: [] });
    }

    const updateObservables = showsNeedingUpdate.map(show => {
      const suggestedStatus = determineShowStatus(show);
      return this.updateShowStatus(show.id!, suggestedStatus).pipe(
        switchMap(() => this.getShowById(show.id!)),
        map(updatedShow => ({ success: true as const, show: updatedShow, originalShow: show })),
        catchError(error => of({ success: false as const, show, error }))
      );
    });

    return forkJoin(updateObservables).pipe(
      map(results => {
        const updated = results.filter(r => r.success).map(r => r.show);
        const failed = results.filter(r => !r.success).map(r => ({ 
          show: r.show, 
          error: (r as any).error 
        }));
        return { updated, failed };
      })
    );
  }
}