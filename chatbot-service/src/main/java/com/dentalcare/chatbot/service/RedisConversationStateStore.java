package com.dentalcare.chatbot.service;

import com.dentalcare.chatbot.model.ConversationState;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

/**
 * Redis-based implementation of ConversationStateStore.
 * 
 * Provides fast, in-memory session storage with automatic TTL expiration.
 * Activated when 'redis' profile is active.
 * 
 * Benefits:
 * - Fast read/write operations
 * - Automatic expiration via TTL
 * - Scalable for high-traffic scenarios
 */
@Slf4j
@Component
@Profile("redis")
public class RedisConversationStateStore implements ConversationStateStore {
    
    @Autowired
    private RedisTemplate<String, ConversationState> redisTemplate;
    
    private static final String KEY_PREFIX = "chatbot:session:";
    private static final Duration TTL = Duration.ofMinutes(30);
    
    @Override
    public void save(ConversationState state) {
        String key = KEY_PREFIX + state.getSessionId();
        redisTemplate.opsForValue().set(key, state, TTL);
        log.debug("Saved conversation state to Redis: {}", state.getSessionId());
    }
    
    @Override
    public Optional<ConversationState> findBySessionId(String sessionId) {
        String key = KEY_PREFIX + sessionId;
        ConversationState state = redisTemplate.opsForValue().get(key);
        
        if (state != null) {
            log.debug("Found conversation state in Redis: {}", sessionId);
        } else {
            log.debug("Conversation state not found in Redis: {}", sessionId);
        }
        
        return Optional.ofNullable(state);
    }
    
    @Override
    public void deleteExpired() {
        // Redis handles TTL automatically, no manual cleanup needed
        log.debug("Redis TTL handles expiration automatically");
    }
}
