package com.dentalcare.chatbot.model;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Represents a message from the chatbot to the user.
 * 
 * Contains the message text, optional action buttons, metadata, and current state.
 */
@Data
@Builder
public class BotMessage {
    /**
     * The message text to display to the user
     */
    private String message;
    
    /**
     * Optional list of action buttons/options for the user to select
     */
    private List<String> options;
    
    /**
     * Additional metadata (e.g., error flags, data for frontend)
     */
    private Map<String, Object> metadata;
    
    /**
     * Current conversation state
     */
    private String state;
    
    /**
     * Creates an error message
     * 
     * @param message Error message text
     * @return BotMessage with error flag set
     */
    public static BotMessage error(String message) {
        return BotMessage.builder()
            .message(message)
            .metadata(Map.of("error", true))
            .build();
    }
}
