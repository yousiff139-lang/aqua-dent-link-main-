package com.dentalcare.chatbot.model;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Represents a dental appointment.
 * 
 * Contains all appointment details including patient, dentist, time, and symptoms.
 */
@Data
@Builder
public class Appointment {
    /**
     * Unique appointment identifier
     */
    private UUID id;
    
    /**
     * Patient ID (foreign key to patients table)
     */
    private UUID patientId;
    
    /**
     * Dentist ID (foreign key to dentists table)
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
     * Appointment status (e.g., "confirmed", "cancelled", "completed")
     */
    private String status;
    
    /**
     * Patient's reported symptoms or reason for visit
     */
    private String symptoms;
    
    /**
     * Whether the patient identified the cause of their symptoms
     * false if patient was uncertain ("I don't know")
     */
    private Boolean causeIdentified;
    
    /**
     * Note when patient is uncertain about cause
     * e.g., "Patient reports tooth pain but is unsure of the cause"
     */
    private String uncertaintyNote;
    
    /**
     * Unique key to prevent duplicate bookings on retries
     */
    private String idempotencyKey;
    
    /**
     * Human-readable booking reference number
     */
    private String bookingReference;
    
    /**
     * Timestamp when appointment was created
     */
    private LocalDateTime createdAt;
}
