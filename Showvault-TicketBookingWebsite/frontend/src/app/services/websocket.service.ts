import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import * as SockJS from 'sockjs-client';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { WebSocketEventService } from './websocket-event.service';

/**
 * WebSocket service for real-time communication
 * Uses SockJS and STOMP protocol for WebSocket connections
 */
@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private stompClient: Client;
  private messageSubject = new Subject<any>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private subscriptions: Map<string, StompSubscription> = new Map();
  
  // Observable streams that components can subscribe to
  public messages$ = this.messageSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  
  constructor(private webSocketEventService: WebSocketEventService) {
    this.stompClient = new Client();
    
    // Listen for connection status changes
    this.connectionStatus$.subscribe(connected => {
      if (!connected && this.stompClient) {
        // If disconnected, try to reconnect with a fresh token after a delay
        setTimeout(() => {
          if (!this.stompClient.active) {
            console.log('Attempting to reconnect WebSocket with fresh token...');
            this.reconnect();
          }
        }, 5000);
      }
    });
  }
  
  /**
   * Reconnect with a fresh token
   */
  private reconnect(): void {
    // Disconnect first if needed
    if (this.stompClient.active) {
      this.disconnect();
    }
    
    // Get a list of current topics
    const topics = Array.from(this.subscriptions.keys());
    
    // Clear subscriptions as we're going to recreate them
    this.subscriptions.clear();
    
    // Reconnect to each topic
    if (topics.length > 0) {
      topics.forEach(topic => this.connect(topic));
    } else {
      // Just reconnect without subscribing to any topics
      this.connect('/user/queue/notifications');
    }
  }
  
  /**
   * Connect to WebSocket endpoint and subscribe to a topic
   * @param topic The topic to subscribe to
   * @returns Observable of messages from the topic
   */
  connect(topic: string): Observable<any> {
    // Create a new subject for this specific topic
    const topicSubject = new Subject<any>();
    
    // Configure the STOMP client if not already connected
    if (!this.stompClient.active) {
      // Get the authentication token
      const token = localStorage.getItem('auth_token');
      
      // Configure the client
      this.stompClient.configure({
        // Create SockJS instance with the correct path
        webSocketFactory: () => {
          console.log('Creating SockJS connection to', `${environment.apiUrl}/ws`);
          // Add token as URL parameter for SockJS handshake
          const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
          const sockjs = new SockJS(`${environment.apiUrl}/ws${tokenParam}`);
          return sockjs;
        },
        // Add authentication headers to STOMP connection
        connectHeaders: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        // Get fresh token before connecting
        beforeConnect: () => {
          // Get a fresh token before each connection attempt
          const freshToken = localStorage.getItem('auth_token');
          if (freshToken) {
            this.stompClient.connectHeaders = {
              'Authorization': `Bearer ${freshToken}`
            };
          }
        },
        debug: (msg) => console.log('STOMP: ' + msg),
        onConnect: (frame) => {
          // On successful connection
          this.connectionStatusSubject.next(true);
          
          // Log the server information with the actual server URL
          console.log('STOMP: connected to server', `${environment.apiUrl}/ws`);
          
          // Subscribe to the requested topic
          const subscription = this.stompClient.subscribe(topic, (message: IMessage) => {
            const parsedMessage = JSON.parse(message.body);
            this.messageSubject.next(parsedMessage);
            this.webSocketEventService.publishMessage({
              topic: topic,
              data: parsedMessage
            });
            topicSubject.next(parsedMessage);
          });
          
          // Store the subscription
          this.subscriptions.set(topic, subscription);
        },
        onStompError: (error) => {
          // On connection error
          console.error('WebSocket STOMP error:', error);
          this.connectionStatusSubject.next(false);
          topicSubject.error(error);
        },
        onWebSocketError: (error) => {
          console.error('WebSocket connection error:', error);
          this.connectionStatusSubject.next(false);
          topicSubject.error(error);
        },
        // Reconnect automatically
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000
      });
      
      // Activate the connection
      this.stompClient.activate();
    } else if (this.stompClient.active && !this.subscriptions.has(topic)) {
      // Already connected, just subscribe to the topic
      const subscription = this.stompClient.subscribe(topic, (message: IMessage) => {
        const parsedMessage = JSON.parse(message.body);
        this.messageSubject.next(parsedMessage);
        this.webSocketEventService.publishMessage({
          topic: topic,
          data: parsedMessage
        });
        topicSubject.next(parsedMessage);
      });
      
      // Store the subscription
      this.subscriptions.set(topic, subscription);
    }
    
    return topicSubject.asObservable();
  }
  
  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    // Unsubscribe from all topics
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
    
    if (this.stompClient && this.stompClient.active) {
      this.stompClient.deactivate();
      this.connectionStatusSubject.next(false);
    }
  }
  
  /**
   * Send a message to a destination
   * @param destination The destination endpoint
   * @param body The message body
   */
  send(destination: string, body: any): void {
    if (this.stompClient && this.stompClient.active) {
      this.stompClient.publish({
        destination: destination,
        body: JSON.stringify(body)
      });
    } else {
      console.error('Cannot send message: WebSocket not connected');
    }
  }
  
  /**
   * Check if WebSocket is connected
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean {
    return this.stompClient && this.stompClient.active;
  }
  
  /**
   * Refresh the connection with a new token
   * Call this method after user login or token refresh
   */
  refreshConnection(): void {
    console.log('Refreshing WebSocket connection with new token...');
    this.reconnect();
  }
}