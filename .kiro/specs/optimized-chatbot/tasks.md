# Optimized Chatbot System - Implementation Tasks

## Task 1: Set up conversation state management

- [ ] 1.1 Create conversation state enum with all required states
  - Define GREETING, MENU_SELECTION, BOOKING_* states, DENTIST_INFO_*, DENTAL_QUESTION_* states
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 1.2 Create ConversationContext interface
  - Define all context fields: patient info, booking data, flow control, metadata
  - _Requirements: 1.4, 11.1, 11.2_

- [ ] 1.3 Implement ConversationManager class
  - Create methods for state transitions
  - Add context update and persistence methods
  - Implement state validation logic
  - _Requirements: 1.5, 11.3, 11.4_

## Task 2: Implement greeting and menu system

- [ ] 2.1 Create greeting message handler
  - Display welcome message when chatbot opens
  - Handle initial user response (any message)
  - _Requirements: 1.1, 1.4_

- [ ] 2.2 Implement menu options display
  - Show three buttons: "Book an Appointment", "Ask About Dentist Info", "Ask Dental Questions"
  - Accept both button clicks and text input for selection
  - _Requirements: 1.2, 1.3_

- [ ] 2.3 Create menu selection handler
  - Parse user selection (button or text)
  - Route to appropriate flow based on selection
  - Store menu_choice in context
  - _Requirements: 1.3, 1.5_

## Task 3: Build booking flow - symptom collection

- [ ] 3.1 Implement symptom question handler
  - Ask "What are you suffering from?" when booking selected
  - Accept free-text input
  - _Requirements: 2.1, 2.2_

- [ ] 3.2 Create uncertainty detection logic
  - Detect phrases: "I don't know", "not sure", "unsure", etc.
  - Set cause_identified to false when uncertainty detected
  - Generate uncertainty_note for PDF
  - _Requirements: 2.3, 2.4_

- [ ] 3.3 Validate and store symptom data
  - Ensure symptom input is not empty
  - Store in context for later use
  - _Requirements: 2.4, 2.5_

## Task 4: Implement dentist matching engine

- [ ] 4.1 Create symptom-to-specialization mapping
  - Define keyword mappings for all specializations
  - Include: General, Endodontics, Orthodontics, Cosmetic, Pediatric, Oral Surgery, Periodontics
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 4.2 Build dentist matching algorithm
  - Analyze symptom keywords
  - Match to appropriate specialization
  - Query database for dentist with that specialization
  - _Requirements: 3.1, 3.2_

- [ ] 4.3 Implement default dentist fallback
  - Return General Dentist if no specific match
  - _Requirements: 3.8_

- [ ] 4.4 Create dentist recommendation message
  - Display dentist name, specialization, and description
  - Explain why this dentist was recommended
  - _Requirements: 3.9_

## Task 5: Build time slot selection system

- [ ] 5.1 Create available slots fetcher
  - Query dentist availability from database
  - Filter out already booked slots
  - _Requirements: 4.1, 4.2_

- [ ] 5.2 Format time slots by day
  - Group slots by day of week
  - Display in user-friendly format (e.g., "Monday 9:00 AM")
  - _Requirements: 4.2, 4.3_

- [ ] 5.3 Implement time slot selection handler
  - Accept button click or text input
  - Validate selected time is still available
  - Store selected date and time in context
  - _Requirements: 4.4, 4.5_

- [ ] 5.4 Handle unavailable slots
  - Detect when slot becomes unavailable
  - Suggest alternative times
  - _Requirements: 4.6, 12.3_

## Task 6: Collect patient information

- [ ] 6.1 Implement patient name collection
  - Ask for patient name after time selection
  - Validate name is not empty
  - Store in context
  - _Requirements: 5.1, 5.4_

- [ ] 6.2 Implement phone number collection (optional)
  - Ask for phone number with "optional" label
  - Allow user to skip
  - Validate format if provided (10-15 digits)
  - _Requirements: 5.2, 5.3, 5.5_

- [ ] 6.3 Store patient information
  - Save all collected data to context
  - Prepare for booking review
  - _Requirements: 5.6_

## Task 7: Create booking review and edit system

- [ ] 7.1 Generate booking summary display
  - Format all collected information
  - Show: name, phone, symptom, dentist, date, time
  - _Requirements: 6.1, 6.2_

- [ ] 7.2 Implement edit confirmation handler
  - Ask "Would you like to edit anything?"
  - Accept yes/no responses
  - _Requirements: 6.3, 6.4_

- [ ] 7.3 Create field editing logic
  - Allow user to specify which field to edit
  - Return to appropriate state for that field
  - Update context with new value
  - _Requirements: 6.4, 6.5_

- [ ] 7.4 Support multiple edit iterations
  - Allow editing until user confirms
  - Re-display summary after each edit
  - _Requirements: 6.5, 6.6_

## Task 8: Implement payment method selection

- [ ] 8.1 Create payment options display
  - Show "Cash" and "Credit Card" buttons
  - Ask "How would you like to pay?"
  - _Requirements: 7.1, 7.2_

- [ ] 8.2 Handle cash payment selection
  - Mark payment_method as "cash"
  - Set payment_status as "pending"
  - Proceed to save appointment
  - _Requirements: 7.3_

- [ ] 8.3 Integrate Stripe payment flow
  - Create payment intent for credit card
  - Handle Stripe redirect
  - Update payment_status on success
  - _Requirements: 7.4_

- [ ] 8.4 Store payment method
  - Save to context and database
  - _Requirements: 7.5_

- [ ] 8.5 Handle payment failures
  - Show error message
  - Offer retry or alternative method
  - _Requirements: 7.6, 12.4_

## Task 9: Implement database storage and PDF generation

- [ ] 9.1 Create appointment save function
  - Insert appointment record to Supabase
  - Include all required fields from context
  - Handle database errors with retry logic
  - _Requirements: 8.1, 8.2, 12.1_

- [ ] 9.2 Build PDF generation service
  - Create PDF with appointment details
  - Include: patient info, dentist info, date/time, symptoms, payment method, booking reference
  - Format professionally with sections
  - _Requirements: 8.3, 8.4_

- [ ] 9.3 Upload PDF to Supabase Storage
  - Save generated PDF to storage bucket
  - Store PDF URL in appointment record
  - _Requirements: 8.5_

- [ ] 9.4 Make PDF accessible to portals
  - Ensure dentist portal can access PDF
  - Ensure admin dashboard can access PDF
  - _Requirements: 8.6_

- [ ] 9.5 Send confirmation message
  - Display booking reference number
  - Show success message
  - Provide PDF download link
  - _Requirements: 8.7_

## Task 10: Build dentist information query system

- [ ] 10.1 Create dentist info query handler
  - Ask what information user needs
  - Parse user query
  - _Requirements: 9.1_

- [ ] 10.2 Implement information providers
  - Provide specialization information
  - List available dentists
  - Show dentist qualifications
  - Display office hours
  - _Requirements: 9.2_

- [ ] 10.3 Handle specific dentist queries
  - Fetch and display detailed dentist profile
  - _Requirements: 9.3_

- [ ] 10.4 Handle specialization queries
  - List all dentists in requested specialty
  - _Requirements: 9.4_

- [ ] 10.5 Offer booking after info
  - Ask if user wants to book appointment
  - Transition to booking flow if yes
  - _Requirements: 9.5_

## Task 11: Implement general dental questions system

- [ ] 11.1 Create dental question handler
  - Accept free-text questions
  - Send to AI for processing
  - _Requirements: 10.1_

- [ ] 11.2 Integrate AI response generation
  - Use Google Gemini API
  - Provide accurate dental health information
  - _Requirements: 10.2_

- [ ] 11.3 Define question categories
  - Dental hygiene tips
  - Common procedures explanations
  - Preventive care advice
  - Dental emergency guidance
  - _Requirements: 10.3_

- [ ] 11.4 Add medical disclaimer
  - Include disclaimer that answers are informational only
  - Do not provide diagnosis or treatment advice
  - _Requirements: 10.4, 10.5_

- [ ] 11.5 Recommend booking for concerns
  - Suggest booking appointment for specific issues
  - Provide easy transition to booking flow
  - _Requirements: 10.5_

## Task 12: Implement conversation persistence

- [ ] 12.1 Create conversation save function
  - Save conversation to chatbot_conversations table
  - Store messages array and context object
  - _Requirements: 11.2_

- [ ] 12.2 Implement conversation loading
  - Load existing conversation on chatbot open
  - Restore context and message history
  - _Requirements: 11.5_

- [ ] 12.3 Add context update triggers
  - Save context after each state change
  - Update timestamp on each save
  - _Requirements: 11.3_

- [ ] 12.4 Implement back navigation
  - Allow users to go back to previous steps
  - Restore previous state and context
  - _Requirements: 11.4_

## Task 13: Add error handling and recovery

- [ ] 13.1 Implement retry logic for database operations
  - Retry up to 3 times on failure
  - Use exponential backoff
  - _Requirements: 12.1_

- [ ] 13.2 Create error message handlers
  - Provide user-friendly error messages
  - Include support contact information
  - _Requirements: 12.2_

- [ ] 13.3 Handle slot unavailability
  - Detect when selected slot becomes unavailable
  - Suggest alternative times automatically
  - _Requirements: 12.3_

- [ ] 13.4 Implement payment retry logic
  - Allow retry on payment failure
  - Offer alternative payment method
  - _Requirements: 12.4_

- [ ] 13.5 Add comprehensive error logging
  - Log all errors with context
  - Include user ID, conversation ID, state
  - _Requirements: 12.5_

- [ ] 13.6 Implement data preservation
  - Never lose user data during errors
  - Persist context before risky operations
  - _Requirements: 12.6_

## Task 14: Create frontend chatbot modal component

- [ ] 14.1 Build ChatbotModal UI component
  - Create modal with message display area
  - Add input field for user messages
  - Include button options for quick replies
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 14.2 Implement message rendering
  - Display bot messages with formatting
  - Show user messages
  - Support button options
  - Add loading indicators
  - _Requirements: 1.4_

- [ ] 14.3 Create API integration
  - Connect to Supabase Edge Function
  - Send user messages
  - Receive and display bot responses
  - Handle errors gracefully
  - _Requirements: 1.5_

- [ ] 14.4 Add conversation history display
  - Show previous messages on scroll
  - Auto-scroll to latest message
  - _Requirements: 11.1_

## Task 15: Testing and validation

- [ ]* 15.1 Write unit tests for state machine
  - Test all state transitions
  - Validate context updates
  - _Requirements: All_

- [ ]* 15.2 Create integration tests for booking flow
  - Test complete booking scenarios
  - Verify database operations
  - Check PDF generation
  - _Requirements: 2.1-8.7_

- [ ]* 15.3 Test error scenarios
  - Simulate database failures
  - Test slot unavailability
  - Verify payment failures
  - _Requirements: 12.1-12.6_

- [ ]* 15.4 Perform end-to-end testing
  - Test all three main flows
  - Verify conversation persistence
  - Check PDF accessibility in portals
  - _Requirements: All_
