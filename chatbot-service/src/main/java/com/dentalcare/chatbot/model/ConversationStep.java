package com.dentalcare.chatbot.model;

/**
 * Enum representing the different states in the chatbot conversation flow.
 * 
 * The conversation follows a state machine pattern where each step transitions
 * to the next based on user input and validation.
 * 
 * Flow: START → INTENT_DETECTED → COLLECT_NAME → COLLECT_EMAIL → COLLECT_PHONE
 *       → COLLECT_SYMPTOMS → SUGGEST_SPECIALIZATION → FETCH_AVAILABILITY
 *       → PROPOSE_SLOT → CONFIRM_SLOT → SAVE_APPOINTMENT → PAYMENT_OFFER → DONE
 */
public enum ConversationStep {
    /**
     * Initial state when conversation starts
     */
    START,
    
    /**
     * User intent has been detected (booking, info, payment, etc.)
     */
    INTENT_DETECTED,
    
    /**
     * Collecting patient's full name
     */
    COLLECT_NAME,
    
    /**
     * Collecting patient's email address
     */
    COLLECT_EMAIL,
    
    /**
     * Collecting patient's phone number
     */
    COLLECT_PHONE,
    
    /**
     * Collecting patient's symptoms or dental issue
     */
    COLLECT_SYMPTOMS,
    
    /**
     * Suggesting appropriate dental specialization based on symptoms
     */
    SUGGEST_SPECIALIZATION,
    
    /**
     * Fetching available dentists for the specialization
     */
    FETCH_AVAILABILITY,
    
    /**
     * Proposing available time slots to the patient
     */
    PROPOSE_SLOT,
    
    /**
     * Confirming booking details with the patient
     */
    CONFIRM_SLOT,
    
    /**
     * Saving the appointment to the database
     */
    SAVE_APPOINTMENT,
    
    /**
     * Offering payment options (placeholder for future Stripe integration)
     */
    PAYMENT_OFFER,
    
    /**
     * Conversation completed successfully
     */
    DONE
}
