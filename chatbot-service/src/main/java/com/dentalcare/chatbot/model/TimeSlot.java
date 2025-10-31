package com.dentalcare.chatbot.model;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Represents an available time slot for a dentist.
 * 
 * Used to display available appointment times to patients.
 */
@Data
@Builder
public class TimeSlot {
    /**
     * Dentist ID this slot belongs to
     */
    private UUID dentistId;
    
    /**
     * Date of the time slot
     */
    private LocalDate date;
    
    /**
     * Time of the slot
     */
    private LocalTime time;
    
    /**
     * Whether this slot is available for booking
     */
    private Boolean isAvailable;
}
