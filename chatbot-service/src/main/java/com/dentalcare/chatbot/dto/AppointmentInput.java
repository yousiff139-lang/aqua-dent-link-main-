package com.dentalcare.chatbot.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/**
 * DTO for appointment input data when creating appointments.
 */
@Data
@Builder
public class AppointmentInput {
    /**
     * Patient ID
     */
    private UUID patientId;
    
    /**
     * Dentist ID
     */
    private UUID dentistId;
    
    /**
     * Appointment date
     */
    private LocalDate date;
    
    /**
     * Appointment time
     */
    private LocalTime time;
    
    /**
     * Appointment status (default: "confirmed")
     */
    private String status;
    
    /**
     * Patient's symptoms
     */
    private String symptoms;
    
    /**
     * Whether cause was identified
     */
    private Boolean causeIdentified;
    
    /**
     * Uncertainty note if applicable
     */
    private String uncertaintyNote;
    
    /**
     * Idempotency key to prevent duplicates
     */
    private String idempotencyKey;
}
