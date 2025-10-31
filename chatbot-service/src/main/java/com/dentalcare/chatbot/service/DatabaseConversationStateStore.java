package com.dentalcare.chatbot.service;

import com.dentalcare.chatbot.model.ConversationState;
import com.dentalcare.chatbot.repository.ConversationStateRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Database-based implementation of ConversationStateStore.
 * 
 * Provides persistent session storage using PostgreSQL.
 * Activated when 'redis' profile is NOT active (default).
 * 
 * Benefits:
 * - Persistent storage (survives restarts)
 * - No additional infrastructure needed
 * - Reliable for production use
 */
@Slf4j
@Component
@Profile("!redis")
public class DatabaseConversationStateStore implements ConversationStateStore {
    
    @Autowired
    private ConversationStateRepository repository;
    
    @Override
    @Transactional
    public void save(ConversationState state) {
        repository.save(state);
        log.debug("Saved conversation state to database: {}", state.getSessionId());
    }
    
    @Override
    public Optional<ConversationState> findBySessionId(String sessionId) {
        Optional<ConversationState> state = repository.findBySessionId(sessionId);
        
        if (state.isPresent()) {
            log.debug("Found conversation state in database: {}", sessionId);
        } else {
            log.debug("Conversation state not found in database: {}", sessionId);
        }
        
        return state;
    }
    
    /**
     * Scheduled task to delete expired sessions.
     * Runs every 5 minutes.
     */
    @Override
    @Scheduled(fixedRate = 300000) // Every 5 minutes
    @Transactional
    public void deleteExpired() {
        LocalDateTime now = LocalDateTime.now();
        repository.deleteByExpiresAtBefore(now);
        log.debug("Deleted expired conversation states before: {}", now);
    }
}
