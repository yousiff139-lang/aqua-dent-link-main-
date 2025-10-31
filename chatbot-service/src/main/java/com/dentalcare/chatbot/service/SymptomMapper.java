package com.dentalcare.chatbot.service;

/**
 * Interface for mapping patient symptoms to dentist specializations.
 * 
 * Extension point: Can be implemented with:
 * - Keyword matching (simple, configurable)
 * - ML classification models
 * - Rule-based expert systems
 */
public interface SymptomMapper {
    
    /**
     * Maps symptoms to appropriate dental specialization.
     * 
     * @param symptoms Patient's symptom description
     * @return Specialization code (e.g., "endodontist", "orthodontist")
     */
    String mapToSpecialization(String symptoms);
}
