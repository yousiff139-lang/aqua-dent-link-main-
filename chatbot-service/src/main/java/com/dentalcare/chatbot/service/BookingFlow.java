package com.dentalcare.chatbot.service;

import com.dentalcare.chatbot.model.BotMessage;
import com.dentalcare.chatbot.model.ConversationState;

/**
 * Interface for managing the booking conversation flow.
 */
public interface BookingFlow {
    
    /**
     * Starts the booking process.
     */
    BotMessage startBooking(ConversationState state);
    
    /**
     * Processes the current step based on user input.
     */
    BotMessage processStep(ConversationState state, String userInput);
}
