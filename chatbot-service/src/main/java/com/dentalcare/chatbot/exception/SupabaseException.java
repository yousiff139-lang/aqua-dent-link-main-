package com.dentalcare.chatbot.exception;

/**
 * Exception thrown when Supabase operations fail.
 */
public class SupabaseException extends ChatbotException {
    
    public SupabaseException(String message) {
        super(message);
    }
    
    public SupabaseException(String message, Throwable cause) {
        super(message, cause);
    }
}
