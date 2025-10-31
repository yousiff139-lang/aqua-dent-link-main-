# Implementation Plan

- [x] 1. Set up Spring Boot project structure and dependencies


  - Create Maven/Gradle project with Spring Boot 3.x
  - Add dependencies: Spring Web, Spring Data JPA, Lombok, Validation, RestTemplate
  - Add optional Redis dependency for state storage
  - Configure application.yml with Supabase connection properties
  - Set up logging configuration
  - _Requirements: 17_





- [ ] 2. Implement core domain models and enums
  - [x] 2.1 Create ConversationStep enum with all states


    - Define states: START, INTENT_DETECTED, COLLECT_NAME, COLLECT_EMAIL, COLLECT_PHONE, COLLECT_SYMPTOMS, SUGGEST_SPECIALIZATION, FETCH_AVAILABILITY, PROPOSE_SLOT, CONFIRM_SLOT, SAVE_APPOINTMENT, PAYMENT_OFFER, DONE
    - _Requirements: 1, 13_


  
  - [ ] 2.2 Create Intent enum
    - Define intents: BOOKING, DENTIST_INFO, PAYMENT, GENERAL_INQUIRY, UNKNOWN
    - _Requirements: 2_
  


  - [ ] 2.3 Create domain models
    - Implement BotMessage with builder pattern

    - Implement ConversationState entity with JSONB support


    - Implement Dentist, Patient, Appointment, TimeSlot models
    - Add validation annotations


    - _Requirements: 1, 3, 5, 6, 7, 9, 13_
  
  - [ ] 2.4 Create DTOs
    - Implement ChatMessageRequest and ChatMessageResponse
    - Implement PatientInput, AppointmentInput, DentistOption
    - Add validation constraints

    - _Requirements: 3, 9, 16_

- [ ] 3. Implement Supabase adapter for database operations
  - [ ] 3.1 Create SupabaseAdapter interface
    - Define methods: getDentistsBySpecialization, upsertPatient, createAppointment, getAvailableSlots, findAppointmentByIdempotencyKey
    - _Requirements: 5, 6, 7, 9, 14_

  
  - [ ] 3.2 Implement SupabaseAdapterImpl with RestTemplate
    - Configure RestTemplate with Supabase headers and service role key
    - Implement getDentistsBySpecialization with ordering by rating

    - Implement upsertPatient with merge-duplicates preference


    - Implement createAppointment with idempotency check
    - Add @Retryable annotation with exponential backoff


    - _Requirements: 5, 6, 7, 9, 12, 17_
  
  - [ ] 3.3 Implement availability slot parsing
    - Create getSlotsFromJsonbAvailability method to parse JSONB


    - Create getSlotsFromNormalizedTable method for normalized slots table
    - Implement parseJsonbAvailability helper
    - Document both approaches in code comments
    - _Requirements: 7, 14_

  

  - [ ] 3.4 Add error handling and logging
    - Wrap RestTemplate calls in try-catch blocks
    - Throw SupabaseException with user-friendly messages

    - Log all errors with structured context
    - _Requirements: 12_

- [ ] 4. Implement conversation state storage
  - [ ] 4.1 Create ConversationStateStore interface
    - Define methods: save, findBySessionId, deleteExpired

    - _Requirements: 13_
  
  - [x] 4.2 Implement Redis-based state store


    - Create RedisConversationStateStore with @Profile("redis")

    - Configure RedisTemplate with 30-minute TTL
    - Implement save and findBySessionId methods
    - _Requirements: 13_

  
  - [ ] 4.3 Implement database-based state store
    - Create DatabaseConversationStateStore with @Profile("!redis")
    - Create ConversationStateRepository interface
    - Implement save and findBySessionId methods
    - Add @Scheduled method to delete expired sessions
    - _Requirements: 13_

- [ ] 5. Implement intent detection
  - [ ] 5.1 Create IntentDetector interface
    - Define detectIntent method returning Intent enum

    - _Requirements: 2, 15_
  
  - [ ] 5.2 Implement KeywordIntentDetector
    - Create keyword mapping for each intent type
    - Implement keyword matching logic
    - Return UNKNOWN for unmatched input
    - Add inline comments for extensibility
    - _Requirements: 2, 15_
  
  - [ ] 5.3 Create placeholder for ML-based detector
    - Create MLIntentDetector stub with @Profile("ml")
    - Add TODO comments for future ML integration
    - _Requirements: 15_

- [ ] 6. Implement symptom to specialization mapping
  - [ ] 6.1 Create SymptomMapper interface
    - Define mapToSpecialization method
    - _Requirements: 5, 15_
  
  - [ ] 6.2 Implement SymptomMapperImpl
    - Create keyword mappings for each specialization
    - Implement containsAny helper method
    - Map tooth pain → endodontist
    - Map braces/alignment → orthodontist
    - Map gum issues → periodontist
    - Map crown/filling → prosthodontist
    - Map cosmetic → cosmetic_dentist
    - Map cleaning/checkup → general_dentist
    - Default to general_dentist for unmatched symptoms
    - _Requirements: 5_
  
  - [ ] 6.3 Create symptom-mapping.yml configuration file
    - Define specialization keywords in YAML format
    - Load config in @PostConstruct method
    - Add comments explaining extensibility
    - _Requirements: 5, 15_

- [ ] 7. Implement booking flow state machine
  - [ ] 7.1 Create BookingFlow interface
    - Define startBooking and processStep methods
    - _Requirements: 3, 4, 5, 6, 7, 8, 9, 10_
  
  - [ ] 7.2 Implement BookingFlowImpl core structure
    - Inject SymptomMapper, SupabaseAdapter, ValidationService
    - Implement startBooking to transition to COLLECT_NAME
    - Implement processStep with switch statement for all states
    - _Requirements: 3, 4, 5, 6, 7, 8, 9, 10_
  
  - [ ] 7.3 Implement patient information collection steps
    - Implement collectName with validation
    - Implement collectEmail with email format validation
    - Implement collectPhone with phone format validation
    - Store collected data in conversation state
    - Transition between states appropriately
    - _Requirements: 3_
  
  - [ ] 7.4 Implement symptom collection with uncertainty handling
    - Implement collectSymptoms method
    - Create detectUncertainty helper checking for "don't know", "not sure", etc.
    - Set causeIdentified flag based on uncertainty
    - Create uncertainty note when detected
    - Respond empathetically to uncertain patients
    - Transition to SUGGEST_SPECIALIZATION
    - _Requirements: 4_
  
  - [ ] 7.5 Implement specialization suggestion
    - Call SymptomMapper to get specialization
    - Store specialization in conversation state
    - Transition to FETCH_AVAILABILITY
    - _Requirements: 5_
  
  - [ ] 7.6 Implement dentist recommendation
    - Call SupabaseAdapter.getDentistsBySpecialization
    - Format dentist options with name, specialization, rating
    - Handle case when no dentists available
    - Allow patient to select dentist
    - Store selected dentist ID in state
    - Transition to PROPOSE_SLOT
    - _Requirements: 6_
  
  - [ ] 7.7 Implement time slot selection
    - Call SupabaseAdapter.getAvailableSlots for selected dentist
    - Format slots grouped by date
    - Display slots in readable format
    - Validate selected slot is still available
    - Handle slot unavailability with alternatives
    - Store selected date and time in state
    - Transition to CONFIRM_SLOT
    - _Requirements: 7_
  
  - [ ] 7.8 Implement booking confirmation
    - Display complete booking summary
    - Ask for confirmation or edit
    - Handle "yes"/"confirm" to proceed
    - Handle "edit"/"change" to allow field updates
    - Support editing symptoms, dentist, or time slot
    - Re-display summary after edits
    - Transition to SAVE_APPOINTMENT on confirmation
    - _Requirements: 8_
  
  - [ ] 7.9 Implement appointment persistence
    - Generate unique idempotency key
    - Create PatientInput from collected data
    - Call SupabaseAdapter.upsertPatient
    - Create AppointmentInput with all details
    - Call SupabaseAdapter.createAppointment
    - Handle duplicate detection via idempotency key
    - Generate booking reference number
    - Transition to PAYMENT_OFFER
    - _Requirements: 9_
  
  - [ ] 7.10 Implement payment offer placeholder
    - Display payment options: "Pay Now" or "Pay at Appointment"
    - Store payment preference
    - Add TODO comment for future Stripe integration
    - Transition to DONE
    - _Requirements: 10_
  
  - [x] 7.11 Implement booking confirmation message


    - Generate confirmation message with appointment ID

    - Include dentist name, date, time, location
    - Include cancellation policy
    - Mark conversation status as "completed"
    - _Requirements: 11_

- [ ] 8. Implement ChatbotService orchestration
  - [ ] 8.1 Create ChatbotService interface
    - Define startConversation and handleUserInput methods
    - _Requirements: 1, 2_
  
  - [ ] 8.2 Implement ChatbotServiceImpl
    - Inject ConversationStateStore, IntentDetector, BookingFlow
    - Implement startConversation creating new session
    - Set session expiration to 30 minutes
    - Return greeting message with options
    - _Requirements: 1_
  
  - [ ] 8.3 Implement handleUserInput method
    - Retrieve conversation state from store
    - Check session expiration
    - Route to appropriate handler based on current state
    - Handle START state with intent detection
    - Delegate booking flow to BookingFlow component
    - Update state after processing
    - _Requirements: 2, 13_
  
  - [ ] 8.4 Implement helper methods
    - Create handleStartState for intent routing
    - Create provideDentistInfo for dentist information queries
    - Create providePaymentInfo for payment inquiries
    - Create provideGeneralInfo for general questions

    - _Requirements: 2_




- [ ] 9. Implement validation service
  - [ ] 9.1 Create ValidationService component
    - Implement isValidEmail using regex pattern

    - Implement isValidPhone checking 10-15 digits
    - Add validation for empty/null strings
    - _Requirements: 3_

- [ ] 10. Implement REST controller
  - [ ] 10.1 Create ChatbotController
    - Add @RestController and @RequestMapping annotations
    - Inject ChatbotService
    - _Requirements: 16_
  
  - [ ] 10.2 Implement POST /api/chatbot/start endpoint
    - Generate new session ID
    - Call chatbotService.startConversation
    - Return ChatMessageResponse
    - _Requirements: 1, 16_
  
  - [ ] 10.3 Implement POST /api/chatbot/message endpoint
    - Accept ChatMessageRequest with validation
    - Call chatbotService.handleUserInput
    - Map BotMessage to ChatMessageResponse
    - Add request/response logging
    - _Requirements: 16_
  
  - [ ] 10.4 Add CORS configuration
    - Create WebConfig for CORS settings
    - Allow frontend origins
    - Configure allowed methods and headers
    - _Requirements: 16_

- [ ] 11. Implement exception handling
  - [ ] 11.1 Create custom exception classes
    - Create ChatbotException base class
    - Create SessionNotFoundException
    - Create SupabaseException
    - Create ValidationException
    - _Requirements: 12_
  
  - [ ] 11.2 Create global exception handler
    - Create ChatbotExceptionHandler with @RestControllerAdvice
    - Handle SessionNotFoundException returning 404
    - Handle SupabaseException returning 503 with user-friendly message
    - Handle ValidationException returning 400
    - Handle generic Exception returning 500
    - Create ErrorResponse DTO
    - Log all errors with context
    - _Requirements: 12_

- [ ] 12. Create database migration scripts
  - [ ] 12.1 Create Supabase migration for tables
    - Create patients table with unique email constraint
    - Create dentists table with specialization and availability JSONB
    - Create appointments table with foreign keys and idempotency_key
    - Create optional dentist_slots normalized table
    - Create conversation_states table for database-backed storage
    - _Requirements: 9, 13, 14_
  
  - [ ] 12.2 Create database indexes
    - Add index on appointments(patient_id)
    - Add index on appointments(dentist_id)
    - Add index on appointments(date)
    - Add index on dentists(specialization)
    - Add index on dentist_slots(dentist_id, date)
    - Add index on conversation_states(expires_at)
    - _Requirements: 9, 13, 14_

- [ ] 13. Create configuration files
  - [ ] 13.1 Create application.yml
    - Configure Spring application name
    - Add Supabase URL and service role key placeholders
    - Configure Redis connection (optional)
    - Add chatbot configuration properties
    - Configure logging levels
    - _Requirements: 17_
  
  - [ ] 13.2 Create application-dev.yml for development
    - Set development-specific properties
    - Enable debug logging
    - _Requirements: 17_
  
  - [ ] 13.3 Create application-prod.yml for production
    - Set production-specific properties
    - Configure connection pooling
    - Set appropriate logging levels
    - _Requirements: 17_

- [ ] 14. Create Docker deployment files
  - [ ] 14.1 Create Dockerfile
    - Use OpenJDK 17 base image
    - Copy JAR file
    - Expose port 8080
    - Set entrypoint
    - _Requirements: 17_
  
  - [ ] 14.2 Create docker-compose.yml
    - Define chatbot service
    - Define Redis service
    - Configure environment variables
    - Set up service dependencies
    - _Requirements: 17_
  
  - [ ] 14.3 Create .env.example file
    - Document required environment variables
    - Provide example values
    - _Requirements: 17_

- [ ] 15. Create sample data seed script
  - [ ] 15.1 Create SQL script to seed dentists
    - Insert sample dentists with various specializations
    - Set availability JSONB for each dentist
    - Assign ratings
    - _Requirements: 6_

- [ ] 16. Create README documentation
  - [ ] 16.1 Write project overview
    - Describe chatbot functionality
    - List key features
    - _Requirements: All_
  
  - [ ] 16.2 Document setup instructions
    - Prerequisites (Java 17, Maven/Gradle, Supabase account)
    - Environment variable configuration
    - Database setup steps
    - Running the application
    - _Requirements: 17_
  
  - [ ] 16.3 Document API endpoints
    - POST /api/chatbot/start
    - POST /api/chatbot/message
    - Include request/response examples
    - _Requirements: 16_
  
  - [ ] 16.4 Document conversation flow
    - Provide sample conversation transcript
    - Explain state transitions
    - _Requirements: All_
  
  - [ ] 16.5 Document architecture
    - Component diagram
    - Explain modular design
    - Extension points for ML and payment integration
    - _Requirements: 15_

- [ ] 17. Write unit tests
  - [ ] 17.1 Write tests for IntentDetector
    - Test keyword matching for each intent
    - Test unknown intent handling
    - _Requirements: 2_
  
  - [ ] 17.2 Write tests for SymptomMapper
    - Test each symptom-to-specialization mapping
    - Test default to general_dentist
    - _Requirements: 5_
  
  - [ ] 17.3 Write tests for BookingFlow
    - Test each state transition
    - Test uncertainty detection
    - Test validation logic
    - _Requirements: 3, 4, 5, 6, 7, 8, 9, 10_
  
  - [ ] 17.4 Write tests for ChatbotService
    - Test startConversation
    - Test handleUserInput for each state
    - Test session expiration
    - _Requirements: 1, 2, 13_
  
  - [ ] 17.5 Write tests for SupabaseAdapter
    - Mock RestTemplate responses
    - Test retry logic
    - Test error handling
    - Test idempotency
    - _Requirements: 6, 7, 9, 12_

- [ ] 18. Write integration tests
  - [ ] 18.1 Write end-to-end booking flow test
    - Test complete conversation from start to confirmation
    - Verify database persistence
    - _Requirements: All_
  
  - [ ] 18.2 Write API endpoint tests
    - Test /api/chatbot/start endpoint
    - Test /api/chatbot/message endpoint
    - Test error responses
    - _Requirements: 16_
  
  - [ ] 18.3 Write Supabase integration tests
    - Test actual database operations (with test database)
    - Test JSONB availability parsing
    - _Requirements: 6, 7, 9, 14_
