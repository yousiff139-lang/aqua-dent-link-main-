package com.dentalcare.chatbot.model;

/**
 * Enum representing user intent detected from their input.
 * 
 * The intent detector analyzes user messages to classify what the user wants to do.
 * This allows the chatbot to route conversations appropriately.
 */
public enum Intent {
    /**
     * User wants to book a dental appointment
     * Keywords: book, appointment, schedule, reserve, visit
     */
    BOOKING,
    
    /**
     * User wants information about dentists
     * Keywords: dentist, doctor, specialist, who, available
     */
    DENTIST_INFO,
    
    /**
     * User has questions about payment
     * Keywords: pay, payment, cost, price, insurance, bill
     */
    PAYMENT,
    
    /**
     * User has general questions or needs help
     * Keywords: help, question, info, information, tell me
     */
    GENERAL_INQUIRY,
    
    /**
     * Intent could not be determined from user input
     */
    UNKNOWN
}
