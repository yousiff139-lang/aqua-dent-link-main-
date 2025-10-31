package com.dentalcare.chatbot.exception;

/**
 * Exception thrown when validation fails.
 */
public class ValidationException extends ChatbotException {
    
    public ValidationException(String message) {
        super(message);
    }
}
