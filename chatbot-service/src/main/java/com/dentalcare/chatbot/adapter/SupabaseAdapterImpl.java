package com.dentalcare.chatbot.adapter;

import com.dentalcare.chatbot.dto.AppointmentInput;
import com.dentalcare.chatbot.dto.PatientInput;
import com.dentalcare.chatbot.exception.SupabaseException;
import com.dentalcare.chatbot.model.Appointment;
import com.dentalcare.chatbot.model.Dentist;
import com.dentalcare.chatbot.model.Patient;
import com.dentalcare.chatbot.model.TimeSlot;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

/**
 * Implementation of SupabaseAdapter using RestTemplate for HTTP communication.
 * 
 * Handles all database operations via Supabase REST API with:
 * - Automatic retry with exponential backoff
 * - Error handling and logging
 * - Idempotency support
 * - JSONB availability parsing
 */
@Slf4j
@Component
public class SupabaseAdapterImpl implements SupabaseAdapter {
    
    @Value("${supabase.url}")
    private String supabaseUrl;
    
    @Value("${supabase.service-role-key}")
    private String serviceRoleKey;
    
    private RestTemplate restTemplate;
    
    /**
     * Initializes RestTemplate with Supabase authentication headers.
     * Service role key is used to bypass RLS policies.
     */
    @PostConstruct
    public void init() {
        restTemplate = new RestTemplate();
        restTemplate.setInterceptors(Collections.singletonList((request, body, execution) -> {
            request.getHeaders().set("apikey", serviceRoleKey);
            request.getHeaders().set("Authorization", "Bearer " + serviceRoleKey);
            request.getHeaders().setContentType(MediaType.APPLICATION_JSON);
            request.getHeaders().set("Prefer", "return=representation");
            return execution.execute(request, body);
        }));
        
        log.info("SupabaseAdapter initialized with URL: {}", supabaseUrl);
    }

    
    /**
     * Retrieves dentists by specialization with retry logic.
     * Orders by rating descending and limits to top 3 results.
     */
    @Override
    @Retryable(
        value = {RestClientException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public List<Dentist> getDentistsBySpecialization(String specialization) {
        try {
            String url = String.format("%s/rest/v1/dentists?specialization=eq.%s&order=rating.desc&limit=3",
                supabaseUrl, specialization);
            
            log.debug("Fetching dentists for specialization: {}", specialization);
            
            ResponseEntity<Dentist[]> response = restTemplate.getForEntity(url, Dentist[].class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("Found {} dentists for specialization: {}", response.getBody().length, specialization);
                return Arrays.asList(response.getBody());
            }
            
            log.warn("No dentists found for specialization: {}", specialization);
            return Collections.emptyList();
            
        } catch (RestClientException e) {
            log.error("Failed to fetch dentists for specialization: {}", specialization, e);
            throw new SupabaseException("Unable to fetch dentists", e);
        }
    }
    
    /**
     * Upserts patient record with retry logic.
     * Uses email as unique key for merge-duplicates.
     */
    @Override
    @Retryable(
        value = {RestClientException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public Patient upsertPatient(PatientInput input) {
        try {
            String url = supabaseUrl + "/rest/v1/patients";
            
            log.debug("Upserting patient with email: {}", input.getEmail());
            
            // Set header for upsert behavior
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Prefer", "resolution=merge-duplicates,return=representation");
            
            HttpEntity<PatientInput> request = new HttpEntity<>(input, headers);
            
            ResponseEntity<Patient[]> response = restTemplate.exchange(
                url, 
                HttpMethod.POST, 
                request, 
                Patient[].class
            );
            
            if (response.getStatusCode().is2xxSuccessful() && 
                response.getBody() != null && 
                response.getBody().length > 0) {
                Patient patient = response.getBody()[0];
                log.info("Patient upserted successfully: {}", patient.getId());
                return patient;
            }
            
            throw new SupabaseException("Failed to upsert patient - no response body");
            
        } catch (RestClientException e) {
            log.error("Failed to upsert patient: {}", input.getEmail(), e);
            throw new SupabaseException("Unable to save patient", e);
        }
    }

    
    /**
     * Creates appointment with idempotency check and retry logic.
     * Prevents duplicate bookings by checking idempotency key first.
     */
    @Override
    @Retryable(
        value = {RestClientException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public Appointment createAppointment(AppointmentInput input) {
        try {
            // Check for duplicate using idempotency key
            Optional<Appointment> existing = findAppointmentByIdempotencyKey(input.getIdempotencyKey());
            if (existing.isPresent()) {
                log.info("Duplicate appointment detected via idempotency key, returning existing: {}", 
                    existing.get().getId());
                return existing.get();
            }
            
            String url = supabaseUrl + "/rest/v1/appointments";
            
            log.debug("Creating appointment for patient: {} with dentist: {}", 
                input.getPatientId(), input.getDentistId());
            
            HttpEntity<AppointmentInput> request = new HttpEntity<>(input);
            
            ResponseEntity<Appointment[]> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                request,
                Appointment[].class
            );
            
            if (response.getStatusCode().is2xxSuccessful() && 
                response.getBody() != null && 
                response.getBody().length > 0) {
                Appointment appointment = response.getBody()[0];
                log.info("Appointment created successfully: {}", appointment.getId());
                return appointment;
            }
            
            throw new SupabaseException("Failed to create appointment - no response body");
            
        } catch (RestClientException e) {
            log.error("Failed to create appointment", e);
            throw new SupabaseException("Unable to save appointment", e);
        }
    }
    
    /**
     * Finds appointment by idempotency key.
     * Used to prevent duplicate bookings on retries.
     */
    @Override
    public Optional<Appointment> findAppointmentByIdempotencyKey(String key) {
        try {
            String url = String.format("%s/rest/v1/appointments?idempotency_key=eq.%s",
                supabaseUrl, key);
            
            ResponseEntity<Appointment[]> response = restTemplate.getForEntity(url, Appointment[].class);
            
            if (response.getStatusCode().is2xxSuccessful() && 
                response.getBody() != null && 
                response.getBody().length > 0) {
                return Optional.of(response.getBody()[0]);
            }
            
            return Optional.empty();
            
        } catch (RestClientException e) {
            log.error("Failed to check idempotency key: {}", key, e);
            return Optional.empty();
        }
    }

    
    /**
     * Retrieves available time slots for a dentist.
     * Tries JSONB availability field first, falls back to normalized table.
     */
    @Override
    public List<TimeSlot> getAvailableSlots(UUID dentistId, LocalDate startDate, int days) {
        try {
            log.debug("Fetching available slots for dentist: {} from {}", dentistId, startDate);
            
            // First, try to get slots from JSONB availability field
            List<TimeSlot> slots = getSlotsFromJsonbAvailability(dentistId, startDate, days);
            
            if (!slots.isEmpty()) {
                log.info("Found {} slots from JSONB availability", slots.size());
                return slots;
            }
            
            // Fallback: query normalized dentist_slots table
            log.debug("No JSONB availability found, trying normalized table");
            return getSlotsFromNormalizedTable(dentistId, startDate, days);
            
        } catch (Exception e) {
            log.error("Failed to fetch available slots for dentist: {}", dentistId, e);
            return Collections.emptyList();
        }
    }
    
    /**
     * Retrieves slots from JSONB availability field.
     * JSONB structure: {"monday": ["09:00", "14:00"], "tuesday": ["10:00"]}
     */
    private List<TimeSlot> getSlotsFromJsonbAvailability(UUID dentistId, LocalDate startDate, int days) {
        try {
            String url = String.format("%s/rest/v1/dentists?id=eq.%s&select=availability",
                supabaseUrl, dentistId);
            
            ResponseEntity<Map[]> response = restTemplate.getForEntity(url, Map[].class);
            
            if (response.getStatusCode().is2xxSuccessful() && 
                response.getBody() != null && 
                response.getBody().length > 0) {
                Map<String, Object> dentist = response.getBody()[0];
                Object availability = dentist.get("availability");
                
                if (availability instanceof Map) {
                    return parseJsonbAvailability((Map<String, Object>) availability, dentistId, startDate, days);
                }
            }
            
            return Collections.emptyList();
            
        } catch (Exception e) {
            log.debug("Could not parse JSONB availability: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
    
    /**
     * Parses JSONB availability structure into TimeSlot objects.
     * Converts day-of-week based availability into specific date/time slots.
     */
    private List<TimeSlot> parseJsonbAvailability(Map<String, Object> availability, 
                                                   UUID dentistId, 
                                                   LocalDate startDate, 
                                                   int days) {
        List<TimeSlot> slots = new ArrayList<>();
        
        // Parse JSONB structure: {"monday": ["09:00", "14:00"], "tuesday": ["10:00"]}
        for (int i = 0; i < days; i++) {
            LocalDate date = startDate.plusDays(i);
            String dayOfWeek = date.getDayOfWeek().toString().toLowerCase();
            
            if (availability.containsKey(dayOfWeek)) {
                Object timesObj = availability.get(dayOfWeek);
                if (timesObj instanceof List) {
                    List<String> times = (List<String>) timesObj;
                    for (String time : times) {
                        try {
                            slots.add(TimeSlot.builder()
                                .dentistId(dentistId)
                                .date(date)
                                .time(LocalTime.parse(time))
                                .isAvailable(true)
                                .build());
                        } catch (Exception e) {
                            log.warn("Could not parse time: {}", time);
                        }
                    }
                }
            }
        }
        
        return slots;
    }
    
    /**
     * Retrieves slots from normalized dentist_slots table.
     * Alternative approach when JSONB availability is not used.
     */
    private List<TimeSlot> getSlotsFromNormalizedTable(UUID dentistId, LocalDate startDate, int days) {
        try {
            LocalDate endDate = startDate.plusDays(days);
            
            String url = String.format(
                "%s/rest/v1/dentist_slots?dentist_id=eq.%s&date=gte.%s&date=lt.%s&is_available=eq.true",
                supabaseUrl, dentistId, startDate, endDate
            );
            
            ResponseEntity<TimeSlot[]> response = restTemplate.getForEntity(url, TimeSlot[].class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("Found {} slots from normalized table", response.getBody().length);
                return Arrays.asList(response.getBody());
            }
            
            return Collections.emptyList();
            
        } catch (RestClientException e) {
            log.error("Failed to fetch slots from normalized table", e);
            return Collections.emptyList();
        }
    }
}
