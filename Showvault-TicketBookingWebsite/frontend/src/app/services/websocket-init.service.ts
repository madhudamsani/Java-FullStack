import { Injectable } from '@angular/core';
import { WebSocketService } from './websocket.service';

/**
 * Service to initialize WebSocket connections
 * This service helps break circular dependencies by handling the initialization
 * of WebSocket connections that other services depend on
 */
@Injectable({
  providedIn: 'root'
})
export class WebSocketInitService {
  constructor(private webSocketService: WebSocketService) { }
  
  /**
   * Initialize user notification WebSocket connection
   */
  initUserNotifications(): void {
    this.webSocketService.connect('/user/queue/notifications').subscribe({
      error: (err) => {
        console.error('Failed to connect to user notifications topic:', err);
      }
    });
  }
}