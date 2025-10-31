package com.dentalcare.chatbot.adapter;

import com.dentalcare.chatbot.dto.AppointmentInput;
import com.dentalcare.chatbot.dto.PatientInput;
import com.dentalcare.chatbot.model.Appointment;
import com.dentalcare.chatbot.model.Dentist;
import com.dentalcare.chatbot.model.Patient;
import com.dentalcare.chatbot.model.TimeSlot;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Interface for Supabase database operations.
 * 
 * Provides methods for interacting with Supabase PostgreSQL database
 * via REST API. Implementations should handle retry logic and error handling.
 * 
 * Extension point: Can be implemented with different strategies
 * (REST API, direct JDBC, etc.)
 */
public interface SupabaseAdapter {
    
    /**
     * Retrieves dentists by specialization, ordered by rating descending.
     * 
     * @param specialization The dental specialization to filter by
     * @return List of dentists (max 3) matching the specialization
     */
    List<Dentist> getDentistsBySpecialization(String specialization);
    
    /**
     * Creates or updates a patient record.
     * Uses email as unique key for upsert operation.
     * 
     * @param input Patient data
     * @return Created or updated patient record
     */
    Patient upsertPatient(PatientInput input);
    
    /**
     * Creates a new appointment.
     * Checks for duplicates using idempotency key.
     * 
     * @param input Appointment data
     * @return Created appointment record
     */
    Appointment createAppointment(AppointmentInput input);
    
    /**
     * Retrieves available time slots for a dentist.
     * Supports both JSONB availability field and normalized slots table.
     * 
     * @param dentistId The dentist's ID
     * @param startDate Starting date for slot search
     * @param days Number of days to search forward
     * @return List of available time slots
     */
    List<TimeSlot> getAvailableSlots(UUID dentistId, LocalDate startDate, int days);
    
    /**
     * Finds an appointment by idempotency key.
     * Used to prevent duplicate bookings on retries.
     * 
     * @param key The idempotency key
     * @return Optional containing appointment if found
     */
    Optional<Appointment> findAppointmentByIdempotencyKey(String key);
}
