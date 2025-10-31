package com.dentalcare.chatbot.service;

import com.dentalcare.chatbot.model.Intent;

/**
 * Interface for detecting user intent from text input.
 * 
 * Extension point: Can be implemented with:
 * - Keyword matching (simple, fast)
 * - ML models (TensorFlow, OpenNLP, etc.)
 * - External AI services (OpenAI, etc.)
 */
public interface IntentDetector {
    
    /**
     * Detects user intent from text.
     * 
     * @param text User's input text
     * @return Detected intent
     */
    Intent detectIntent(String text);
}
