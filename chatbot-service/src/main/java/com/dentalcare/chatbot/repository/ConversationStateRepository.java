package com.dentalcare.chatbot.repository;

import com.dentalcare.chatbot.model.ConversationState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * JPA Repository for ConversationState entity.
 */
@Repository
public interface ConversationStateRepository extends JpaRepository<ConversationState, String> {
    
    /**
     * Finds conversation state by session ID.
     * 
     * @param sessionId The session identifier
     * @return Optional containing state if found
     */
    Optional<ConversationState> findBySessionId(String sessionId);
    
    /**
     * Deletes all conversation states that expired before the given time.
     * 
     * @param expiresAt The expiration cutoff time
     */
    void deleteByExpiresAtBefore(LocalDateTime expiresAt);
}
