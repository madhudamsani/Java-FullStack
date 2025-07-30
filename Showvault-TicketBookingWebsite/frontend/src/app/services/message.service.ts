import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Message {
  id: number;
  showId?: number;
  showTitle?: string;
  subject: string;
  content: string;
  recipientType: 'ALL' | 'TICKET_HOLDERS' | 'SPECIFIC';
  recipientFilter?: string;
  recipientCount: number;
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
  createdAt: Date;
  scheduledFor?: Date;
  sentAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = 'http://localhost:8080/api/messages';

  constructor(private http: HttpClient) {}

  getMessages(showId?: number): Observable<Message[]> {
    let params = new HttpParams();
    if (showId) {
      params = params.set('showId', showId.toString());
    }

    return this.http.get<Message[]>(this.apiUrl, { params }).pipe(
      catchError(error => {
        console.error('Error fetching messages:', error);
        return throwError(() => new Error(error.message || 'Failed to fetch messages'));
      })
    );
  }

  getMessage(id: number): Observable<Message> {
    return this.http.get<Message>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => {
        console.error(`Error fetching message ${id}:`, error);
        return throwError(() => new Error(error.message || 'Failed to fetch message'));
      })
    );
  }

  createMessage(message: Omit<Message, 'id' | 'createdAt' | 'sentAt'>): Observable<Message> {
    return this.http.post<Message>(this.apiUrl, message).pipe(
      catchError(error => {
        console.error('Error creating message:', error);
        return throwError(() => new Error(error.message || 'Failed to create message'));
      })
    );
  }

  updateMessage(id: number, message: Partial<Message>): Observable<Message> {
    return this.http.put<Message>(`${this.apiUrl}/${id}`, message).pipe(
      catchError(error => {
        console.error(`Error updating message ${id}:`, error);
        return throwError(() => new Error(error.message || 'Failed to update message'));
      })
    );
  }

  deleteMessage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => {
        console.error(`Error deleting message ${id}:`, error);
        return throwError(() => new Error(error.message || 'Failed to delete message'));
      })
    );
  }

  sendMessage(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/send`, {}).pipe(
      catchError(error => {
        console.error(`Error sending message ${id}:`, error);
        return throwError(() => new Error(error.message || 'Failed to send message'));
      })
    );
  }

  getRecipientCount(showId: number, recipientType: string, recipientFilter?: string): Observable<number> {
    let params = new HttpParams()
      .set('showId', showId.toString())
      .set('recipientType', recipientType);

    if (recipientFilter) {
      params = params.set('recipientFilter', recipientFilter);
    }

    return this.http.get<number>(`${this.apiUrl}/recipient-count`, { params }).pipe(
      catchError(error => {
        console.error('Error getting recipient count:', error);
        return throwError(() => new Error(error.message || 'Failed to get recipient count'));
      })
    );
  }
}