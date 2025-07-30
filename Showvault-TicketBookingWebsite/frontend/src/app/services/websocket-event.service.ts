import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Service to handle WebSocket events and break circular dependencies
 * This service acts as an intermediary between WebSocketService and other services
 */
@Injectable({
  providedIn: 'root'
})
export class WebSocketEventService {
  private messageSubject = new Subject<any>();
  
  // Observable stream that components can subscribe to
  public messages$ = this.messageSubject.asObservable();
  
  constructor() { }
  
  /**
   * Publish a message to all subscribers
   * @param message The message to publish
   */
  publishMessage(message: any): void {
    this.messageSubject.next(message);
  }
  
  /**
   * Subscribe to messages for a specific topic
   * @param topicFilter Function to filter messages by topic
   * @returns Observable of filtered messages
   */
  getMessages(topicFilter: (message: any) => boolean): Observable<any> {
    return new Observable<any>(observer => {
      const subscription = this.messages$.subscribe(message => {
        if (topicFilter(message)) {
          observer.next(message);
        }
      });
      
      return () => {
        subscription.unsubscribe();
      };
    });
  }
}