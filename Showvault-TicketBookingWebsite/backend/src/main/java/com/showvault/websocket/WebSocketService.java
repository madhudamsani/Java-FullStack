package com.showvault.websocket;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Service for sending messages via WebSocket
 */
@Service
public class WebSocketService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    /**
     * Send a message to a specific topic
     * @param destination The destination topic
     * @param payload The message payload
     */
    public void sendToTopic(String destination, Object payload) {
        messagingTemplate.convertAndSend(destination, payload);
    }
    
    /**
     * Send a message to a specific user
     * @param user The user to send to
     * @param destination The destination topic
     * @param payload The message payload
     */
    public void sendToUser(String user, String destination, Object payload) {
        messagingTemplate.convertAndSendToUser(user, destination, payload);
    }
}