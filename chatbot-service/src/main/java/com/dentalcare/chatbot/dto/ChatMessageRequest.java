package com.dentalcare.chatbot.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Request DTO for sending a message to the chatbot.
 */
@Data
public class ChatMessageRequest {
    /**
     * Session ID (UUID format)
     */
    @NotBlank(message = "Session ID is required")
    private String sessionId;
    
    /**
     * User's message text
     */
    @NotBlank(message = "Message text is required")
    @Size(max = 1000, message = "Message must not exceed 1000 characters")
    private String text;
}
