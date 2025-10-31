package com.dentalcare.chatbot.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Response DTO for chatbot messages.
 */
@Data
@Builder
public class ChatMessageResponse {
    /**
     * Session ID
     */
    private String sessionId;
    
    /**
     * Bot's response message
     */
    private String message;
    
    /**
     * Additional metadata
     */
    private Map<String, Object> metadata;
    
    /**
     * Current conversation state
     */
    private String state;
    
    /**
     * Optional action buttons/options
     */
    private List<String> options;
}
