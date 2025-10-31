package com.dentalcare.chatbot.exception;

/**
 * Exception thrown when a conversation session is not found.
 */
public class SessionNotFoundException extends ChatbotException {
    
    public SessionNotFoundException(String sessionId) {
        super("Session not found: " + sessionId);
    }
}
