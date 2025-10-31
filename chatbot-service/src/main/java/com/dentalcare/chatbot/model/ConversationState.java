package com.dentalcare.chatbot.model;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Entity representing the state of a conversation session.
 * 
 * Stores the current step, collected data, and session metadata.
 * Can be persisted to database or Redis for session management.
 */
@Data
@Entity
@Table(name = "conversation_states")
public class ConversationState {
    
    /**
     * Unique session identifier (UUID)
     */
    @Id
    @Column(name = "session_id")
    private String sessionId;
    
    /**
     * Current step in the conversation flow
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "current_state", nullable = false)
    private ConversationStep currentState;
    
    /**
     * Collected data from the conversation (name, email, symptoms, etc.)
     * Stored as JSONB in PostgreSQL
     */
    @Type(JsonType.class)
    @Column(name = "collected_data", columnDefinition = "jsonb")
    private Map<String, Object> collectedData = new HashMap<>();
    
    /**
     * Timestamp when the conversation was created
     */
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    /**
     * Timestamp of the last update to this conversation
     */
    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;
    
    /**
     * Timestamp when this session expires
     */
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
    
    /**
     * Checks if the session has expired
     * 
     * @return true if current time is after expiration time
     */
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}
