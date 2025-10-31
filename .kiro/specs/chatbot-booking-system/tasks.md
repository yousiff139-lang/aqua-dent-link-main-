# Implementation Plan: Chatbot Booking System

- [x] 1. Set up database schema and migrations





  - [x] 1.1 Create chatbot_conversations table with RLS policies












    - Write SQL migration to create the conversations table with fields for patient_id, dentist_id, messages JSONB, status, and timestamps
    - Implement RLS policies allowing users to view only their own conversations
    - _Requirements: 7.1, 7.2, 7.4_





  
  - [x] 1.2 Create time_slot_reservations table with expiration logic













    - Write SQL migration for reservations table with dentist_id, slot_time, reserved_by, reservation_expires_at, and status fields
    - Add RLS policies for dentists to view their reservations and patients to create reservations
    - Create database function to auto-expire reservations after 5 minutes

    - _Requirements: 2.3, 2.4, 7.1_
  

  - [x] 1.3 Create dentist_availability table for scheduling











    - Write SQL migration for availability table with day_of_week, start_time, end_time, slot_duration_minutes fields
    - Add RLS policies for dentists to manage their availability and public read access
    - Create indexes on dentist_id and day_of_week for query performance
    - _Requirements: 2.1, 7.1_
  
  - [x] 1.4 Enhance appointments table with new fields


    - Write ALTER TABLE migration to add dentist_id, symptoms, chief_complaint, cause_identified, uncertainty_note, medical_history, booking_summary_url, excel_sheet_url, booking_reference, conversation_id, cancellation_reason, cancelled_at fields
    - Update existing RLS policies to include dentist access
    - Add unique constraint on booking_reference field
    - _Requirements: 1.2, 1.3, 1A.4, 4.2, 7.1, 7.4_




- [x] 2. Implement booking service layer








  - [x] 2.1 Create TypeScript interfaces and types



    - Define ChatMessage, BookingData, TimeSlot, DocumentReference, AppointmentSummary, ConversationSession, BotResponse interfaces
    - Add causeIdentified and uncertaintyNote fields to BookingData interface
    - Create enums for conversation status, appointment status, and message types
    - _Requirements: 1.1, 1A.2, 1A.4, 2.1, 4.2_
  
  - [x] 2.2 Implement bookingService.ts with core methods



    - Write startBookingConversation method to initialize chatbot session
    - Implement sendMessage method for patient-bot communication
    - Create getAvailableSlots method to fetch dentist availability
    - Implement reserveTimeSlot method with 5-minute expiration
    - Write confirmBooking method to finalize appointments


    - Add cancelAppointment method with 1-hour policy validation
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.2, 3.3_
  
  - [x] 2.3 Implement document upload functionality



    - Write uploadDocument method to handle file uploads to Supabase Storage
    - Add file validation for type (PDF, JPG, PNG) and size (max 10MB)
    - Create linkDocumentToAppointment method to associate files with appointments
    - Implement getAppointmentDocuments method for retrieval
    - _Requirements: 1.3, 4.3, 7.2_
  
  - [x] 2.4 Add booking reference generation utility





    - Create generateBookingReference function to generate unique alphanumeric codes
    - Implement checkReferenceUniqueness validation
    - _Requirements: 8.4_

- [x] 3. Build chatbot UI components





  - [x] 3.1 Create ChatbotInterface component




    - Build main chatbot container with message display area
    - Implement message list with auto-scroll to latest message
    - Create patient and bot message bubble components with distinct styling
    - Add typing indicator animation for bot responses
    - _Requirements: 1.1, 1.5_
  



  - [x] 3.2 Implement ChatInput component


    - Create text input field with send button
    - Add file upload button with drag-and-drop support
    - Implement input validation and character limit
    - Add disabled state during bot processing
    - _Requirements: 1.2, 1.3_

  


  - [x] 3.3 Create TimeSlotSelector component


    - Build calendar view for date selection
    - Implement time slot grid showing available times
    - Add visual indicators for reserved vs available slots
    - Create slot selection handler with temporary reservation
    - _Requirements: 2.1, 2.2, 2.3_

  


  - [x] 3.4 Build BookingConfirmation dialog


    - Create modal dialog showing booking summary
    - Display patient info, dentist, time, symptoms, and uploaded documents
    - Add cancellation policy notice (1-hour rule)
    - Implement confirm and cancel buttons
    - _Requirements: 1.5, 3.1, 8.1_

  

  - [x] 3.5 Implement DocumentUploadWidget


    - Create file picker with preview for images
    - Add upload progress indicator
    - Display uploaded files list with remove option
    - Show file size and type validation errors
    - _Requirements: 1.3, 4.3_




- [x] 4. Develop AI-powered chatbot edge function






  - [x] 4.1 Create chat-bot edge function structure



    - Set up Supabase edge function with JWT verification
    - Implement request/response handlers



    - Add error handling and logging
    - Configure CORS for frontend access
    - _Requirements: 1.1, 7.1_
  
  - [x] 4.2 Implement conversation flow manager


    - Create ConversationManager class to track conversation state
    - Implement step-by-step flow: greeting → phone number → symptoms → documents → time slots → confirmation
    - Add context management to maintain conversation history
    - Write logic to determine next step based on patient responses
    - Add phone number validation in conversation flow
    - Implement uncertainty detection logic with keywords array ("I don't know", "not sure", "unsure", etc.)
    - Add logic to suggest possible causes when patient describes vague symptoms
    - Implement handleUncertainResponse function to record uncertainty notes

    - Ensure conversation does NOT loop back after uncertainty is detected
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1A.1, 1A.2, 1A.3, 1A.4, 1A.5, 1A.6_
  
  - [x] 4.3 Integrate OpenAI or Anthropic API (or Gemini)


    - Set up API client with environment variables for API keys
    - Create system prompt for dental booking assistant persona with uncertainty handling instructions
    - Add instructions to suggest possible causes for vague symptoms

    - Add instructions to detect uncertainty and respond empathetically without looping

    - Add instructions to default to "unspecified" or "unknown cause" when uncertainty is detected
    - Implement message formatting for AI API

    - Add response parsing and validation
    - Implement fallback responses for API failures
    - _Requirements: 1.1, 1.2, 1A.1, 1A.2, 1A.3, 1A.5_
  

  - [ ] 4.4 Add conversation persistence

    - Write saveConversationMessage function to store messages in database
    - Implement loadConversationHistory for session resumption
    - Create updateConversationStatus method

    - _Requirements: 7.1, 7.3_

- [x] 5. Implement document generation services






  - [x] 5.1 Create generate-booking-summary edge function



    - Set up edge function with JWT verification
    - Implement fetchAppointmentData to gather all booking information
    - Add error handling for missing data
    - _Requirements: 4.1, 4.2, 7.1_
  


  - [x] 5.2 Implement PDF generation logic


    - Install and configure jsPDF or pdfkit library
    - Create PDF template with sections: patient info (including phone number), appointment details, chief complaint, medical history, documents
    - Add section to display uncertainty note prominently if cause_identified is false
    - Add styling and formatting for professional appearance
    - Implement document link/thumbnail embedding
    - Generate unique filename with booking reference
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 1A.7, 1A.8_

  
  - [x] 5.3 Implement Excel sheet generation


    - Install and configure exceljs library
    - Create Excel template with columns: Patient Name, Phone Number, Age, Gender, Symptoms, Appointment Time, Documents, Status
    - Implement row population with appointment data

    - Add cell formatting and column widths

    - Generate unique filename with dentist ID and date
    - _Requirements: 5.1, 5.2, 5.3_
  

  - [x] 5.4 Upload generated documents to Supabase Storage


    - Implement uploadToStorage function for PDF and Excel files
    - Create storage buckets with appropriate access policies
    - Update appointments table with document URLs
    - Add cleanup logic for old documents
    - _Requirements: 4.3, 4.4, 7.2_

- [x] 6. Enhance patient dashboard






  - [x] 6.1 Create AppointmentsList component


    - Build list view showing upcoming appointments

    - Display appointment cards with dentist, date, time, and status
    - Add visual indicators for appointment status
    - Implement sorting by date

    - _Requirements: 3.1, 8.5_


  

  - [x] 6.2 Implement cancellation functionality


    - Add cancel button to each appointment card
    - Create canCancelAppointment utility function checking 1-hour rule
    - Implement cancellation confirmation dialog
    - Add cancellation reason input (optional)


    - Call cancelAppointment service method
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  

  - [x] 6.3 Add booking history section


    - Create separate tab/section for past appointments

    - Display completed and cancelled appointments
    - Show cancellation reason if applicable

    - _Requirements: 3.1_
  

  - [x] 6.4 Implement real-time appointment updates



    - Set up Supabase real-time subscription for appointments table
    - Update UI when new appointments are created
    - Refresh list when appointments are cancelled

    - _Requirements: 8.5_

- [x] 7. Enhance dentist dashboard









  - [x] 7.1 Create AppointmentSheet component



    - Build table view with columns: Patient Name, Phone Number, Age, Gender, Symptoms, Time, Documents, Status
    - Implement row click handler to view details
    - Add sorting and filtering capabilities
    - Show document indicator icon when documents are present

    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  
  - [x] 7.2 Implement BookingSummaryViewer component



    - Create modal/drawer to display full booking summary
    - Show all patient information and appointment details
    - Display uncertainty note prominently with visual indicator (e.g., warning icon) when cause_identified is false

    - Add document viewer/download links
    - Display medical history if provided
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 1A.7, 1A.8_
  
  - [x] 7.3 Add private notes functionality



    - Create notes input field in booking summary view
    - Implement saveNote method to update appointments table
    - Display existing notes with timestamps

    - Add edit capability for notes
    - _Requirements: 6.5_
  
  - [x] 7.4 Implement real-time booking notifications



    - Set up Supabase real-time subscription for new appointments
    - Display toast notification when new booking arrives
    - Update appointment sheet automatically
    - Add unread indicator for new bookings

    - _Requirements: 5.5, 6.1_
  
  - [x] 7.5 Create availability management interface





    - Build form to set weekly availability schedule
    - Implement day-of-week selector with time ranges
    - Add slot duration configuration
    - Create saveAvailability method to update dentist_availability table
    - _Requirements: 2.1_

- [x] 8. Integrate chatbot into dentist profile page







  - [x] 8.1 Add "Book Appointment" button to DentistProfile page


    - Create prominent CTA button in dentist profile
    - Implement click handler to open chatbot modal
    - Add authentication check before opening chatbot
    - _Requirements: 1.1_
  
  - [x] 8.2 Create ChatbotModal wrapper component


    - Build modal container for chatbot interface


    - Implement open/close state management
    - Add backdrop click to close
    - Pass dentist ID and name as props to ChatbotInterface
    - _Requirements: 1.1_
  

  - [ ] 8.3 Handle booking completion flow


    - Implement onBookingComplete callback
    - Show success message with booking reference
    - Redirect to patient dashboard after confirmation
    - Close chatbot modal
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9. Implement notification system









  - [x] 9.1 Create notification service


    - Write sendBookingConfirmation function for patients
    - Implement sendNewBookingAlert function for dentists
    - Add sendCancellationNotification for both parties


    - Configure email templates or in-app notifications
    - _Requirements: 3.4, 8.1, 8.2, 8.3_
  


  - [ ] 9.2 Add notification preferences

    - Create user preferences table for notification settings
    - Implement UI for users to manage notification preferences
    - Add opt-in/opt-out functionality

    - _Requirements: 8.2_

- [x] 10. Add validation and error handling






  - [x] 10.1 Implement client-side validation



    - Add form validation for booking data

    - Validate file uploads (type, size)
    - Check time slot availability before reservation

    - Validate cancellation timing
    - _Requirements: 2.4, 3.2, 3.3_
  
  - [x] 10.2 Add comprehensive error handling




    - Implement try-catch blocks in all service methods
    - Create user-friendly error messages
    - Add retry logic for network failures
    - Implement error logging
    - _Requirements: 1.1, 2.4, 3.2_

  


  - [x] 10.3 Handle edge cases


    - Implement slot conflict resolution
    - Add session timeout handling with auto-save
    - Handle AI service failures with fallback responses
    - Manage concurrent booking attempts for same slot



    - _Requirements: 2.3, 2.4_

- [x] 11. Security and access control






  - [x] 11.1 Implement RLS policies for new tables


    - Write and test RLS policies for chatbot_conversations


    - Add policies for time_slot_reservations
    - Create policies for dentist_availability
    - Test access control for different user roles
    - _Requirements: 7.1, 7.2_
  
  - [x] 11.2 Add document access controls



    - Implement signed URLs for document access
    - Set expiration times for document links

    - Validate user permissions before document access
    - _Requirements: 6.3, 7.2_
  
  - [x] 11.3 Secure edge functions



    - Verify JWT tokens in all edge functions
    - Add rate limiting to prevent abuse
    - Implement input sanitization
    - Add CORS configuration
    - _Requirements: 7.1_


- [x] 12. Performance optimization






  - [x] 12.1 Add database indexes



    - Create indexes on appointments(dentist_id, appointment_date)
    - Add index on chatbot_conversations(patient_id, status)
    - Create index on time_slot_reservations(dentist_id, slot_time)

    - Add index on dentist_availability(dentist_id, day_of_week)
    - _Requirements: 7.1_
  
  - [x] 12.2 Implement frontend optimizations




    - Add lazy loading for ChatbotInterface component
    - Implement message virtualization for long conversations
    - Add debouncing to chat input
    - Use optimistic UI updates for better UX
    - _Requirements: 1.1_
  

  - [x] 12.3 Optimize document generation


    - Implement background job queue for PDF/Excel generation
    - Add caching for frequently accessed documents
    - Optimize file sizes for faster downloads
    - _Requirements: 4.1, 5.1_

- [x] 13. Testing and quality assurance






  - [x] 13.1 Write unit tests for booking service



    - Test time slot availability calculation
    - Test cancellation policy validation
    - Test document upload validation
    - Test booking reference generation
    - _Requirements: 2.1, 2.3, 3.2_
  

  - [x] 13.2 Write integration tests for chatbot flow


    - Test complete booking flow from start to confirmation
    - Test document upload during conversation
    - Test time slot selection and reservation
    - Test cancellation flow
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1_
  

  - [x] 13.3 Write E2E tests for user journeys


    - Test patient booking journey: profile → chatbot → confirmation → dashboard
    - Test dentist review journey: notification → summary view → document access
    - Test cancellation journey with timing validation
    - _Requirements: 1.1, 3.1, 6.1_

- [x] 14. Documentation and deployment






  - [x] 14.1 Write API documentation

    - Document all edge function endpoints
    - Add request/response examples
    - Document error codes and messages
    - _Requirements: 4.1, 5.1_
  
  - [x] 14.2 Create user guides



    - Write patient guide for using chatbot booking
    - Create dentist guide for managing bookings
    - Document cancellation policies
    - _Requirements: 1.1, 3.1, 6.1_
  

  - [x] 14.3 Deploy edge functions



    - Deploy chat-bot function to Supabase
    - Deploy generate-booking-summary function
    - Configure environment variables
    - Test deployed functions
    - _Requirements: 4.1, 5.1_
