package com.dentalcare.chatbot.service;

import com.dentalcare.chatbot.model.Intent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * ML-based intent detector (placeholder for future implementation).
 * 
 * TODO: Integrate with ML model (TensorFlow, OpenNLP, or external AI service)
 * 
 * Activated when 'ml' profile is active.
 * 
 * Extension points:
 * - Load pre-trained model
 * - Call external AI API (OpenAI, etc.)
 * - Use NLP library (Stanford NLP, spaCy via REST API)
 */
@Slf4j
@Component
@Profile("ml")
public class MLIntentDetector implements IntentDetector {
    
    @Override
    public Intent detectIntent(String text) {
        log.warn("ML Intent Detector not yet implemented, returning UNKNOWN");
        
        // TODO: Implement ML-based intent detection
        // Example approaches:
        // 1. Load TensorFlow model and classify
        // 2. Call OpenAI API for classification
        // 3. Use pre-trained NLP model
        
        return Intent.UNKNOWN;
    }
}
