import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SeatConsistencyService {
  private apiUrl = `${environment.apiUrl}/admin/seat-consistency`;

  constructor(private http: HttpClient) { }

  /**
   * Synchronize seat counts for a specific show schedule
   * @param scheduleId The ID of the show schedule to synchronize
   * @returns Observable with the response
   */
  synchronizeSchedule(scheduleId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/schedule/${scheduleId}`, {});
  }

  /**
   * Synchronize seat counts for a specific venue
   * @param venueId The ID of the venue to synchronize
   * @returns Observable with the response
   */
  synchronizeVenue(venueId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/venue/${venueId}`, {});
  }

  /**
   * Synchronize seat counts for all venues and schedules
   * @returns Observable with the response
   */
  synchronizeAll(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/all`, {});
  }
}