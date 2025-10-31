package com.dentalcare.chatbot.service;

import com.dentalcare.chatbot.model.ConversationState;

import java.util.Optional;

/**
 * Interface for persisting and retrieving conversation state.
 * 
 * Supports multiple implementations:
 * - Redis-based (fast, in-memory)
 * - Database-based (persistent, reliable)
 * 
 * Extension point: Can be implemented with different storage strategies.
 */
public interface ConversationStateStore {
    
    /**
     * Saves conversation state.
     * 
     * @param state The conversation state to save
     */
    void save(ConversationState state);
    
    /**
     * Finds conversation state by session ID.
     * 
     * @param sessionId The session identifier
     * @return Optional containing state if found
     */
    Optional<ConversationState> findBySessionId(String sessionId);
    
    /**
     * Deletes expired conversation states.
     * Should be called periodically to clean up old sessions.
     */
    void deleteExpired();
}
