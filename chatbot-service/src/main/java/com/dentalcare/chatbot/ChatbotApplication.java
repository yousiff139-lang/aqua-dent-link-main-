package com.dentalcare.chatbot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.retry.annotation.EnableRetry;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Main application class for DentalCare Chatbot Service
 * 
 * This Spring Boot application provides an AI-powered conversational interface
 * for dental appointment booking with Supabase integration.
 */
@SpringBootApplication
@EnableRetry
@EnableScheduling
public class ChatbotApplication {

    public static void main(String[] args) {
        SpringApplication.run(ChatbotApplication.class, args);
    }
}
