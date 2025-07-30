import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SeatReservationService {
  private apiUrl = `${environment.apiUrl}/seat-reservations`;

  constructor(private http: HttpClient) { }

  /**
   * Reserve seats for a show schedule
   * @param scheduleId The show schedule ID
   * @param seatIds The IDs of the seats to reserve
   * @returns Observable with the reservation response
   */
  reserveSeats(scheduleId: number, seatIds: number[]): Observable<any> {
    console.log(`Reserving ${seatIds.length} seats for schedule ${scheduleId}`);
    
    // Get the auth token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('No auth token found, cannot reserve seats');
      return throwError(() => new Error('Authentication required'));
    }
    
    // Create headers with authentication
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.post<any>(
      `${this.apiUrl}/schedule/${scheduleId}`,
      { seatIds: seatIds },
      { headers: headers }
    ).pipe(
      tap(response => {
        console.log('Seat reservation response:', response);
        
        // Store the session ID in localStorage for later use
        if (response && response.sessionId) {
          localStorage.setItem('seat_reservation_session', response.sessionId);
          console.log(`Stored seat reservation session ID: ${response.sessionId}`);
        }
      }),
      catchError(error => {
        console.error('Error reserving seats:', error);
        return throwError(() => new Error('Failed to reserve seats. Please try again.'));
      })
    );
  }

  /**
   * Release seat reservations for a session
   * @param sessionId The session ID
   * @returns Observable with the release response
   */
  releaseReservations(sessionId: string): Observable<any> {
    console.log(`Releasing seat reservations for session ${sessionId}`);
    
    // Get the auth token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('No auth token found, cannot release reservations');
      return throwError(() => new Error('Authentication required'));
    }
    
    // Create headers with authentication
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.delete<any>(
      `${this.apiUrl}/session/${sessionId}`,
      { headers: headers }
    ).pipe(
      tap(response => {
        console.log('Seat reservation release response:', response);
        
        // Remove the session ID from localStorage
        localStorage.removeItem('seat_reservation_session');
      }),
      catchError(error => {
        console.error('Error releasing seat reservations:', error);
        return throwError(() => new Error('Failed to release seat reservations.'));
      })
    );
  }

  /**
   * Get the current seat reservation session ID
   * @returns The session ID or null if none exists
   */
  getCurrentSessionId(): string | null {
    return localStorage.getItem('seat_reservation_session');
  }

  /**
   * Clear the current seat reservation session
   */
  clearCurrentSession(): void {
    localStorage.removeItem('seat_reservation_session');
  }
}