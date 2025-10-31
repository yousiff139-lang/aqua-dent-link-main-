# Requirements Document

## Introduction

This feature introduces a Java Spring Boot backend implementation of an AI-powered chatbot system for DentalCareConnect. The system handles patient interactions, dentist recommendations, appointment booking, and integrates with Supabase (PostgreSQL) database. The chatbot uses a stateful conversation system to guide patients through booking appointments, collecting symptoms, matching with appropriate dentists, and managing the complete booking lifecycle.

## Glossary

- **Chatbot Service**: The Java Spring Boot service that manages conversational logic and state transitions
- **Intent Detector**: Component that identifies user intent from input text (booking, dentist_info, payment, general_inquiry)
- **Booking Flow**: State machine that guides patients through appointment scheduling steps
- **Conversation State**: Persistent session data tracking current step and collected information
- **Supabase Adapter**: Java client wrapper for Supabase REST API interactions
- **Symptom Mapper**: Component that maps patient symptoms to dentist specializations
- **Time Slot**: Available appointment time for a specific dentist
- **Idempotency Key**: Unique identifier preventing duplicate bookings on retries
- **Patient**: User seeking dental care and booking appointments
- **Dentist**: Healthcare provider with specific specialization and availability
- **Appointment**: Scheduled meeting between patient and dentist
- **Bot Message**: Response from chatbot to patient including text and metadata

## Requirements

### Requirement 1: Conversation Initialization

**User Story:** As a patient, I want to start a conversation with the chatbot, so that I can begin the booking process

#### Acceptance Criteria

1. WHEN a Patient initiates contact, THE Chatbot Service SHALL create a new conversation session with unique session ID
2. THE Chatbot Service SHALL store the conversation state in the Conversation State Store
3. THE Chatbot Service SHALL return a greeting message with available options: booking, dentist information, payment inquiry, general questions
4. THE Conversation State SHALL initialize with status "START" and empty collected data
5. THE Chatbot Service SHALL set session expiration to 30 minutes from creation

### Requirement 2: Intent Detection

**User Story:** As a system, I want to detect user intent from their input, so that I can route them to the appropriate flow

#### Acceptance Criteria

1. WHEN a Patient sends a message, THE Intent Detector SHALL analyze the text for keywords and patterns
2. THE Intent Detector SHALL classify intent as one of: "booking", "dentist_info", "payment", "general_inquiry", "unknown"
3. IF intent is "booking", THE Chatbot Service SHALL transition to COLLECT_NAME state
4. IF intent is "dentist_info", THE Chatbot Service SHALL provide dentist information and return to START
5. IF intent is "payment" or "general_inquiry", THE Chatbot Service SHALL provide relevant information
6. IF intent is "unknown", THE Chatbot Service SHALL request clarification with suggested options
7. THE Intent Detector SHALL support keyword matching for: "book", "appointment", "schedule", "dentist", "payment", "help"

### Requirement 3: Patient Information Collection

**User Story:** As a patient, I want to provide my contact information, so that the dentist can reach me

#### Acceptance Criteria

1. WHEN conversation state is COLLECT_NAME, THE Chatbot Service SHALL prompt for patient name
2. WHEN patient provides name, THE Chatbot Service SHALL validate it is not empty and store in conversation state
3. THE Chatbot Service SHALL transition to COLLECT_EMAIL state
4. WHEN conversation state is COLLECT_EMAIL, THE Chatbot Service SHALL prompt for email address
5. THE Chatbot Service SHALL validate email format using regex pattern
6. THE Chatbot Service SHALL transition to COLLECT_PHONE state
7. WHEN conversation state is COLLECT_PHONE, THE Chatbot Service SHALL prompt for phone number
8. THE Chatbot Service SHALL validate phone number contains 10-15 digits
9. AFTER collecting all contact information, THE Chatbot Service SHALL transition to COLLECT_SYMPTOMS state

### Requirement 4: Symptom Collection and Uncertainty Handling

**User Story:** As a patient, I want to describe my symptoms even if I don't know the exact cause, so that I can still book an appointment

#### Acceptance Criteria

1. WHEN conversation state is COLLECT_SYMPTOMS, THE Chatbot Service SHALL ask "What dental issue are you experiencing?"
2. THE Chatbot Service SHALL accept free-text symptom description
3. THE Chatbot Service SHALL detect uncertainty indicators: "I don't know", "not sure", "unsure", "no idea", "idk", "dunno", "maybe"
4. IF uncertainty is detected, THE Chatbot Service SHALL store symptom with flag cause_identified=false
5. IF uncertainty is detected, THE Chatbot Service SHALL create uncertainty note: "Patient reports [symptom] but is unsure of the cause"
6. THE Chatbot Service SHALL respond empathetically: "It's okay not to know, the dentist can help find the cause"
7. THE Chatbot Service SHALL NOT repeatedly ask about the cause after uncertainty is expressed
8. THE Chatbot Service SHALL transition to SUGGEST_SPECIALIZATION state

### Requirement 5: Symptom to Specialization Mapping

**User Story:** As a system, I want to map patient symptoms to dentist specializations, so that I can recommend the appropriate specialist

#### Acceptance Criteria

1. WHEN conversation state is SUGGEST_SPECIALIZATION, THE Symptom Mapper SHALL analyze symptom keywords
2. IF symptom contains "pain", "ache", "toothache", "sensitivity", THE Symptom Mapper SHALL map to "endodontist"
3. IF symptom contains "braces", "alignment", "crooked", "straighten", THE Symptom Mapper SHALL map to "orthodontist"
4. IF symptom contains "gum", "bleeding", "swollen", "periodontal", THE Symptom Mapper SHALL map to "periodontist"
5. IF symptom contains "crown", "filling", "bridge", "denture", THE Symptom Mapper SHALL map to "prosthodontist"
6. IF symptom contains "whitening", "cosmetic", "veneer", "smile", THE Symptom Mapper SHALL map to "cosmetic_dentist"
7. IF symptom contains "cleaning", "checkup", "routine", THE Symptom Mapper SHALL map to "general_dentist"
8. IF no keyword match, THE Symptom Mapper SHALL default to "general_dentist"
9. THE Chatbot Service SHALL store mapped specialization in conversation state
10. THE Chatbot Service SHALL transition to FETCH_AVAILABILITY state

### Requirement 6: Dentist Recommendation

**User Story:** As a patient, I want to see recommended dentists based on my symptoms, so that I can choose an appropriate specialist

#### Acceptance Criteria

1. WHEN conversation state is FETCH_AVAILABILITY, THE Supabase Adapter SHALL query dentists table filtered by specialization
2. THE Supabase Adapter SHALL order results by rating DESC, then by earliest availability
3. THE Supabase Adapter SHALL return top 3 dentist options with: name, specialization, rating, next available slot
4. IF proximity data is available, THE Supabase Adapter SHALL include distance in sorting criteria
5. THE Chatbot Service SHALL present dentist options to patient with details
6. THE Chatbot Service SHALL allow patient to select a dentist by number or name
7. IF no dentists available for specialization, THE Chatbot Service SHALL suggest general dentists as alternative
8. THE Chatbot Service SHALL store selected dentist ID in conversation state
9. THE Chatbot Service SHALL transition to PROPOSE_SLOT state

### Requirement 7: Time Slot Selection

**User Story:** As a patient, I want to see available appointment times, so that I can choose a convenient slot

#### Acceptance Criteria

1. WHEN conversation state is PROPOSE_SLOT, THE Supabase Adapter SHALL fetch available time slots for selected dentist
2. THE Supabase Adapter SHALL parse dentist availability from JSONB field or query normalized slots table
3. THE Supabase Adapter SHALL return slots for next 7 days grouped by date
4. THE Chatbot Service SHALL display slots in readable format: "Monday, Oct 30 - 9:00 AM, 2:00 PM, 4:00 PM"
5. THE Chatbot Service SHALL allow patient to select slot by date and time
6. THE Chatbot Service SHALL validate selected slot is still available before proceeding
7. IF slot becomes unavailable, THE Chatbot Service SHALL suggest alternative times
8. THE Chatbot Service SHALL store selected date and time in conversation state
9. THE Chatbot Service SHALL transition to CONFIRM_SLOT state

### Requirement 8: Booking Confirmation

**User Story:** As a patient, I want to review my booking details before confirming, so that I can ensure everything is correct

#### Acceptance Criteria

1. WHEN conversation state is CONFIRM_SLOT, THE Chatbot Service SHALL display complete booking summary
2. THE summary SHALL include: patient name, email, phone, symptom, dentist name, specialization, appointment date, appointment time
3. THE Chatbot Service SHALL ask "Does this look correct? Reply 'yes' to confirm or 'edit' to make changes"
4. IF patient responds "yes", "confirm", "correct", THE Chatbot Service SHALL transition to SAVE_APPOINTMENT state
5. IF patient responds "edit", "change", "no", THE Chatbot Service SHALL allow field-specific edits
6. THE Chatbot Service SHALL support editing: symptoms, dentist selection, time slot
7. AFTER edits, THE Chatbot Service SHALL re-display summary for confirmation

### Requirement 9: Appointment Persistence

**User Story:** As a system, I want to save confirmed appointments to the database, so that dentists and admins can access booking details

#### Acceptance Criteria

1. WHEN conversation state is SAVE_APPOINTMENT, THE Supabase Adapter SHALL create patient record if not exists
2. THE Supabase Adapter SHALL use upsertPatient method with email as unique key
3. THE Supabase Adapter SHALL create appointment record with all collected data
4. THE appointment record SHALL include: patient_id, dentist_id, date, time, status="confirmed", symptoms, cause_identified, uncertainty_note (if applicable)
5. THE Supabase Adapter SHALL generate unique idempotency key for the booking
6. THE Supabase Adapter SHALL check for duplicate appointments using idempotency key
7. IF duplicate detected, THE Supabase Adapter SHALL return existing appointment without creating new record
8. THE Supabase Adapter SHALL return appointment ID and booking reference number
9. THE Chatbot Service SHALL transition to PAYMENT_OFFER state
10. IF database save fails, THE Chatbot Service SHALL retry up to 2 times with exponential backoff

### Requirement 10: Payment Integration Placeholder

**User Story:** As a patient, I want to be offered payment options after booking, so that I can complete the transaction

#### Acceptance Criteria

1. WHEN conversation state is PAYMENT_OFFER, THE Chatbot Service SHALL display payment options: "Pay Now" or "Pay at Appointment"
2. THE Chatbot Service SHALL store payment preference in appointment record
3. IF patient selects "Pay Now", THE Chatbot Service SHALL provide payment link placeholder (future Stripe integration)
4. IF patient selects "Pay at Appointment", THE Chatbot Service SHALL mark payment_status as "pending"
5. THE Chatbot Service SHALL transition to DONE state

### Requirement 11: Booking Confirmation Message

**User Story:** As a patient, I want to receive a confirmation message with my appointment details, so that I have a record of my booking

#### Acceptance Criteria

1. WHEN conversation state is DONE, THE Chatbot Service SHALL generate confirmation message
2. THE confirmation SHALL include: appointment ID, dentist name, date, time, location, cancellation policy
3. THE Chatbot Service SHALL display message: "Your appointment is confirmed! Appointment ID: [ID]. Dr. [Name] will see you on [Date] at [Time]."
4. THE Chatbot Service SHALL mark conversation status as "completed"
5. THE Chatbot Service SHALL persist final conversation state

### Requirement 12: Error Handling and Fallbacks

**User Story:** As a system, I want to handle errors gracefully, so that patients receive helpful messages and can recover from failures

#### Acceptance Criteria

1. IF Supabase connection fails, THE Chatbot Service SHALL retry with exponential backoff (1s, 2s, 4s)
2. AFTER 3 failed retries, THE Chatbot Service SHALL return error message: "We're experiencing technical difficulties. Please try again in a few minutes."
3. IF dentist table is missing or empty, THE Chatbot Service SHALL log structured error with context
4. THE Chatbot Service SHALL return user-friendly message: "No dentists are currently available. Please contact support."
5. IF no available time slots, THE Chatbot Service SHALL offer to add patient to waitlist
6. IF unrecognized input during state transition, THE Chatbot Service SHALL provide clarification prompt with examples
7. THE Chatbot Service SHALL log all errors with: timestamp, session ID, state, error type, stack trace
8. THE Chatbot Service SHALL never expose internal error details to patients

### Requirement 13: Conversation State Persistence

**User Story:** As a system, I want to persist conversation state, so that patients can resume if disconnected

#### Acceptance Criteria

1. THE Conversation State Store SHALL save state after each user interaction
2. THE state record SHALL include: session_id, current_state, collected_payload (JSON), last_updated, expires_at
3. THE Conversation State Store SHALL support Redis or database-backed storage
4. THE Chatbot Service SHALL retrieve existing state when patient reconnects with same session ID
5. THE Chatbot Service SHALL expire sessions after 30 minutes of inactivity
6. THE Conversation State Store SHALL clean up expired sessions automatically

### Requirement 14: Availability Parsing

**User Story:** As a system, I want to parse dentist availability from JSONB or normalized tables, so that I can support flexible availability storage

#### Acceptance Criteria

1. THE Supabase Adapter SHALL check if dentists.availability column exists and is JSONB type
2. IF JSONB availability exists, THE Supabase Adapter SHALL parse JSON structure: `{"monday": ["09:00", "14:00"], "tuesday": ["10:00", "15:00"]}`
3. IF normalized slots table exists, THE Supabase Adapter SHALL query: `SELECT * FROM dentist_slots WHERE dentist_id = ? AND date >= ? AND is_available = true`
4. THE Supabase Adapter SHALL convert parsed slots to TimeSlot objects with: dentist_id, date, time, duration
5. THE Supabase Adapter SHALL document both approaches in code comments

### Requirement 15: Modular Architecture

**User Story:** As a developer, I want modular components, so that I can extend functionality without modifying core logic

#### Acceptance Criteria

1. THE Chatbot Service SHALL use dependency injection for all components
2. THE Intent Detector SHALL be interface-based to allow ML model replacement
3. THE Symptom Mapper SHALL load mappings from configuration file (YAML or properties)
4. THE Supabase Adapter SHALL implement repository pattern for data access
5. THE Conversation State Store SHALL be interface-based to support Redis or database implementations
6. THE Booking Flow SHALL use state pattern for conversation management
7. ALL components SHALL have clear single responsibilities
8. ALL components SHALL include inline comments explaining business logic and extension points

### Requirement 16: API Endpoint

**User Story:** As a frontend application, I want a REST endpoint to send messages and receive responses, so that I can integrate the chatbot

#### Acceptance Criteria

1. THE Chatbot Service SHALL expose POST endpoint: `/api/chatbot/message`
2. THE endpoint SHALL accept JSON payload: `{"sessionId": "string", "text": "string"}`
3. THE endpoint SHALL return JSON response: `{"sessionId": "string", "message": "string", "metadata": {}, "state": "string"}`
4. THE endpoint SHALL validate sessionId format (UUID)
5. THE endpoint SHALL validate text is not empty and max 1000 characters
6. THE endpoint SHALL return 400 Bad Request for invalid input
7. THE endpoint SHALL return 500 Internal Server Error for system failures
8. THE endpoint SHALL include CORS headers for frontend integration
9. THE endpoint SHALL log request/response for debugging

### Requirement 17: Supabase Configuration

**User Story:** As a system administrator, I want to configure Supabase connection via environment variables, so that I can deploy to different environments

#### Acceptance Criteria

1. THE Supabase Adapter SHALL read configuration from environment variables
2. THE required variables SHALL be: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
3. THE Supabase Adapter SHALL validate configuration on startup
4. IF configuration is missing, THE application SHALL fail to start with clear error message
5. THE Supabase Adapter SHALL use service role key for bypassing RLS policies
6. THE Supabase Adapter SHALL include connection pooling for performance
7. THE configuration SHALL support connection timeout and retry settings
