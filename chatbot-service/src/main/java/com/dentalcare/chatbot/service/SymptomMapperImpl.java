package com.dentalcare.chatbot.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Keyword-based symptom to specialization mapper.
 * 
 * Maps patient symptoms to appropriate dental specializations using keyword matching.
 * Configuration can be loaded from YAML file for easy updates without code changes.
 * 
 * Specialization mappings:
 * - pain/ache → endodontist
 * - braces/alignment → orthodontist
 * - gum issues → periodontist
 * - crown/filling → prosthodontist
 * - cosmetic → cosmetic_dentist
 * - cleaning/checkup → general_dentist
 */
@Slf4j
@Component
public class SymptomMapperImpl implements SymptomMapper {
    
    @Value("${chatbot.symptom-mapping-config:classpath:symptom-mapping.yml}")
    private Resource mappingConfig;
    
    private Map<String, List<String>> specializationKeywords;
    
    /**
     * Initializes keyword mappings.
     * TODO: Load from YAML config file for production use.
     */
    @PostConstruct
    public void init() {
        // Load from config file for easy updates without code changes
        specializationKeywords = loadMappingConfig();
        log.info("Symptom mapper initialized with {} specializations", specializationKeywords.size());
    }
    
    @Override
    public String mapToSpecialization(String symptoms) {
        String lowerSymptoms = symptoms.toLowerCase();
        
        log.debug("Mapping symptoms to specialization: {}", symptoms);
        
        // Check endodontist keywords
        if (containsAny(lowerSymptoms, Arrays.asList("pain", "ache", "toothache", "sensitivity", "nerve"))) {
            log.info("Mapped to endodontist");
            return "endodontist";
        }
        
        // Check orthodontist keywords
        if (containsAny(lowerSymptoms, Arrays.asList("braces", "alignment", "crooked", "straighten", "misaligned"))) {
            log.info("Mapped to orthodontist");
            return "orthodontist";
        }
        
        // Check periodontist keywords
        if (containsAny(lowerSymptoms, Arrays.asList("gum", "bleeding", "swollen", "periodontal", "gums"))) {
            log.info("Mapped to periodontist");
            return "periodontist";
        }
        
        // Check prosthodontist keywords
        if (containsAny(lowerSymptoms, Arrays.asList("crown", "filling", "bridge", "denture", "implant"))) {
            log.info("Mapped to prosthodontist");
            return "prosthodontist";
        }
        
        // Check cosmetic dentist keywords
        if (containsAny(lowerSymptoms, Arrays.asList("whitening", "cosmetic", "veneer", "smile", "aesthetic"))) {
            log.info("Mapped to cosmetic_dentist");
            return "cosmetic_dentist";
        }
        
        // Check general dentist keywords
        if (containsAny(lowerSymptoms, Arrays.asList("cleaning", "checkup", "routine", "exam", "cavity"))) {
            log.info("Mapped to general_dentist");
            return "general_dentist";
        }
        
        // Default to general dentist
        log.info("No specific match, defaulting to general_dentist");
        return "general_dentist";
    }
    
    /**
     * Checks if text contains any of the keywords.
     */
    private boolean containsAny(String text, List<String> keywords) {
        return keywords.stream().anyMatch(text::contains);
    }
    
    /**
     * Loads mapping configuration.
     * TODO: Implement YAML parsing for production use.
     * 
     * This allows updating mappings without code changes.
     */
    private Map<String, List<String>> loadMappingConfig() {
        // Hardcoded for now, can be loaded from YAML in production
        return Map.of(
            "endodontist", Arrays.asList("pain", "ache", "toothache", "sensitivity", "nerve"),
            "orthodontist", Arrays.asList("braces", "alignment", "crooked", "straighten", "misaligned"),
            "periodontist", Arrays.asList("gum", "bleeding", "swollen", "periodontal", "gums"),
            "prosthodontist", Arrays.asList("crown", "filling", "bridge", "denture", "implant"),
            "cosmetic_dentist", Arrays.asList("whitening", "cosmetic", "veneer", "smile", "aesthetic"),
            "general_dentist", Arrays.asList("cleaning", "checkup", "routine", "exam", "cavity")
        );
    }
}
