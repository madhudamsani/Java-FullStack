import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Venue, VenueCapacityInfo } from '../models/venue.model';
import { ShowSchedule } from '../models/show.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VenueService {
  private apiUrl = `${environment.apiUrl}/venues`;
  private schedulesApiUrl = `${environment.apiUrl}/schedules`;
  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  getAllVenues(): Observable<Venue[]> {
    return this.http.get<Venue[]>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  getVenueById(id: number): Observable<Venue> {
    return this.http.get<Venue>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  getVenuesByCity(city: string): Observable<Venue[]> {
    return this.http.get<Venue[]>(`${this.apiUrl}/city/${city}`)
      .pipe(catchError(this.handleError));
  }

  getVenuesByCountry(country: string): Observable<Venue[]> {
    return this.http.get<Venue[]>(`${this.apiUrl}/country/${country}`)
      .pipe(catchError(this.handleError));
  }

  getVenuesByMinimumCapacity(capacity: number): Observable<Venue[]> {
    return this.http.get<Venue[]>(`${this.apiUrl}/capacity/${capacity}`)
      .pipe(catchError(this.handleError));
  }

  getAllCities(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/cities`)
      .pipe(catchError(this.handleError));
  }

  getAllCountries(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/countries`)
      .pipe(catchError(this.handleError));
  }
  
  // Method to search venues by name or city
  searchVenues(query: string): Observable<Venue[]> {
    return this.http.get<Venue[]>(`${this.apiUrl}/search?query=${query}`)
      .pipe(catchError(this.handleError));
  }
  
  // Method to get schedules by venue ID
  getSchedulesByVenueId(venueId: number): Observable<ShowSchedule[]> {
    console.log(`Fetching schedules from: ${this.schedulesApiUrl}/venue/${venueId}`);
    return this.http.get<ShowSchedule[]>(`${this.schedulesApiUrl}/venue/${venueId}`)
      .pipe(
        map(schedules => {
          console.log('Raw schedules response:', schedules);
          return schedules;
        }),
        catchError(this.handleError)
      );
  }

  createVenue(venue: Venue): Observable<Venue> {
    return this.http.post<Venue>(this.apiUrl, venue, this.httpOptions)
      .pipe(
        map(response => {
          // Validate response data
          if (!response || !response.id) {
            throw new Error('Invalid venue data received from server');
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  updateVenue(id: number, venue: Venue): Observable<Venue> {
    return this.http.put<Venue>(`${this.apiUrl}/${id}`, venue, this.httpOptions)
      .pipe(
        map(response => {
          // Validate response data
          if (!response || !response.id) {
            throw new Error('Invalid venue data received from server');
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  deleteVenue(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  getVenueCapacityInfo(id: number): Observable<VenueCapacityInfo> {
    return this.http.get<VenueCapacityInfo>(`${this.apiUrl}/${id}/capacity`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      const message = error.error && error.error.message ? error.error.message : error.message || 'Unknown error';
      errorMessage = `Error Code: ${error.status}\nMessage: ${message}`;
    }
    
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}