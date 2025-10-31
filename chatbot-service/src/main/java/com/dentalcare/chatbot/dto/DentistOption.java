package com.dentalcare.chatbot.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO representing a dentist option to present to the user.
 */
@Data
@Builder
public class DentistOption {
    /**
     * Dentist ID
     */
    private UUID id;
    
    /**
     * Dentist's name
     */
    private String name;
    
    /**
     * Specialization
     */
    private String specialization;
    
    /**
     * Rating (0.0 to 5.0)
     */
    private BigDecimal rating;
    
    /**
     * Next available appointment time
     */
    private LocalDateTime nextAvailable;
}
