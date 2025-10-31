package com.dentalcare.chatbot.service;

import com.dentalcare.chatbot.model.Intent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Keyword-based intent detector.
 * 
 * Uses simple keyword matching to classify user intent.
 * Fast and reliable for common use cases.
 * 
 * Extension point: Replace with ML-based detector for more sophisticated intent detection.
 */
@Slf4j
@Component
@Profile("!ml")
public class KeywordIntentDetector implements IntentDetector {
    
    private static final Map<Intent, List<String>> INTENT_KEYWORDS = Map.of(
        Intent.BOOKING, Arrays.asList("book", "appointment", "schedule", "reserve", "visit"),
        Intent.DENTIST_INFO, Arrays.asList("dentist", "doctor", "specialist", "who", "available"),
        Intent.PAYMENT, Arrays.asList("pay", "payment", "cost", "price", "insurance", "bill"),
        Intent.GENERAL_INQUIRY, Arrays.asList("help", "question", "info", "information", "tell me")
    );
    
    @Override
    public Intent detectIntent(String text) {
        String lowerText = text.toLowerCase();
        
        log.debug("Detecting intent for text: {}", text);
        
        // Check each intent's keywords
        for (Map.Entry<Intent, List<String>> entry : INTENT_KEYWORDS.entrySet()) {
            for (String keyword : entry.getValue()) {
                if (lowerText.contains(keyword)) {
                    log.info("Detected intent: {} (keyword: {})", entry.getKey(), keyword);
                    return entry.getKey();
                }
            }
        }
        
        log.info("No intent detected, returning UNKNOWN");
        return Intent.UNKNOWN;
    }
}
