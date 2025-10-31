package com.dentalcare.chatbot.model;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents a dentist in the system.
 * 
 * Contains dentist information including specialization, rating, and availability.
 */
@Data
@Builder
public class Dentist {
    /**
     * Unique dentist identifier
     */
    private UUID id;
    
    /**
     * Dentist's full name
     */
    private String name;
    
    /**
     * Dental specialization (e.g., endodontist, orthodontist, general_dentist)
     */
    private String specialization;
    
    /**
     * Dentist rating (0.0 to 5.0)
     */
    private BigDecimal rating;
    
    /**
     * Availability schedule (JSONB or parsed structure)
     * Can be either:
     * - JSONB: {"monday": ["09:00", "14:00"], "tuesday": ["10:00"]}
     * - Parsed Map structure
     */
    private Object availability;
    
    /**
     * Timestamp when dentist record was created
     */
    private LocalDateTime createdAt;
}
