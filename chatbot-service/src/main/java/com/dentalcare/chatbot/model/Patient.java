package com.dentalcare.chatbot.model;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents a patient in the system.
 * 
 * Contains patient contact information.
 */
@Data
@Builder
public class Patient {
    /**
     * Unique patient identifier
     */
    private UUID id;
    
    /**
     * Patient's full name
     */
    private String name;
    
    /**
     * Patient's email address (unique)
     */
    private String email;
    
    /**
     * Patient's phone number
     */
    private String phone;
    
    /**
     * Timestamp when patient record was created
     */
    private LocalDateTime createdAt;
}
