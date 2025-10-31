# Implementation Plan

- [x] 1. Set up backend project structure and dependencies


  - Create backend directory structure with controllers, services, repositories folders
  - Initialize Node.js/TypeScript project with necessary dependencies (Express, Supabase client, Winston logger)
  - Configure TypeScript with strict mode and path aliases
  - Set up environment configuration with dotenv
  - _Requirements: 6.1, 6.2, 6.3_




- [ ] 2. Implement database schema extensions
  - [ ] 2.1 Create slot_reservations table migration
    - Write SQL migration for slot_reservations table with indexes


    - Add RLS policies for slot reservations
    - _Requirements: 2.5, 8.2_
  


  - [ ] 2.2 Create realtime_events logging table migration
    - Write SQL migration for realtime_events table for monitoring
    - Add index on created_at for efficient querying

    - _Requirements: 10.1, 10.2_


  
  - [ ] 2.3 Implement database triggers for real-time notifications
    - Create notify_appointment_change() trigger function
    - Create notify_availability_change() trigger function


    - Create cleanup_expired_reservations() scheduled function
    - _Requirements: 1.1, 2.1, 7.5_

- [x] 3. Build authentication and authorization middleware


  - [ ] 3.1 Implement JWT authentication middleware
    - Create authenticateRequest middleware to verify Supabase JWT tokens
    - Extract user information from token and attach to request object

    - Handle token expiration and invalid token errors



    - _Requirements: 5.1, 5.2_
  
  - [x] 3.2 Implement role-based authorization middleware


    - Create requireRole middleware for role checking (admin, dentist, patient)
    - Create requireOwnership middleware for resource ownership validation
    - Query user_roles table to verify permissions
    - _Requirements: 5.3, 5.4, 5.5_


  
  - [ ] 3.3 Create error handling middleware
    - Implement global error handler with standardized error responses

    - Create AppError class for application-specific errors


    - Add error logging with Winston
    - _Requirements: 9.2, 9.4_

- [ ] 4. Implement repository layer for data access
  - [x] 4.1 Create AppointmentsRepository


    - Implement findById, findByPatient, findByDentist methods
    - Implement create, update, delete methods with Supabase client
    - Implement findConflicts method to check for scheduling conflicts
    - _Requirements: 1.1, 3.1, 4.1, 4.2, 4.3, 4.4_
  


  - [ ] 4.2 Create DentistsRepository
    - Implement findById and findAll methods
    - Implement updateAvailability and getAvailability methods for JSONB column
    - Add caching for frequently accessed dentist profiles
    - _Requirements: 2.1, 2.2, 10.5_


  
  - [ ] 4.3 Create SlotReservationsRepository
    - Implement create and delete methods for temporary slot holds

    - Implement findBySlot to check if slot is reserved


    - Implement cleanup method to remove expired reservations
    - _Requirements: 2.5_

- [ ] 5. Implement service layer business logic
  - [ ] 5.1 Create AppointmentsService
    - Implement createAppointment with validation and conflict checking
    - Implement updateAppointment with authorization checks


    - Implement cancelAppointment with 1-hour window validation
    - Implement getAppointmentsByPatient and getAppointmentsByDentist
    - _Requirements: 1.1, 1.4, 3.1, 3.2, 3.3_
  
  - [ ] 5.2 Create AvailabilityService
    - Implement getAvailability to fetch dentist schedule


    - Implement updateAvailability with validation
    - Implement getAvailableSlots to calculate free time slots for a date
    - Implement reserveSlot and releaseSlot for temporary holds



    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 5.3 Create RealtimeService
    - Implement broadcastAppointmentChange using Supabase channels
    - Implement broadcastAvailabilityChange using Supabase channels
    - Implement retry logic with exponential backoff for failed broadcasts
    - Add latency tracking to realtime_events table
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 7.1, 7.2, 9.1_
  
  - [ ] 5.4 Create ValidationService
    - Implement appointment data validation (date format, required fields)
    - Implement availability schedule validation (time format, no overlaps)
    - Implement business rule validation (cancellation window, booking limits)
    - _Requirements: 9.6_

- [ ] 6. Build controller layer for API endpoints
  - [ ] 6.1 Create AppointmentsController
    - Implement POST /api/appointments endpoint
    - Implement GET /api/appointments with filtering and pagination
    - Implement GET /api/appointments/:id endpoint
    - Implement PUT /api/appointments/:id endpoint
    - Implement DELETE /api/appointments/:id endpoint
    - Add request validation and error handling
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ] 6.2 Create AvailabilityController
    - Implement GET /api/availability/:dentistId endpoint
    - Implement PUT /api/availability/:dentistId endpoint
    - Implement GET /api/availability/:dentistId/slots endpoint with date parameter
    - Implement POST /api/availability/reserve endpoint
    - Implement DELETE /api/availability/reserve/:id endpoint
    - _Requirements: 4.5, 2.1, 2.2, 2.5_
  
  - [ ] 6.3 Create ProfilesController
    - Implement GET /api/profiles/me endpoint
    - Implement PUT /api/profiles/me endpoint
    - Implement GET /api/profiles/dentists endpoint
    - _Requirements: 4.6_

- [ ] 7. Set up Express application and routing
  - Create Express app with middleware stack (CORS, body-parser, authentication)
  - Define API routes and connect to controllers
  - Add health check endpoint at GET /health
  - Configure error handling middleware
  - _Requirements: 4.7, 10.3_

- [ ] 8. Implement real-time client subscription helpers
  - [ ] 8.1 Create client-side subscription utilities
    - Write subscribeToAppointments function for React components
    - Write subscribeToAvailability function for React components
    - Implement automatic reconnection logic on connection loss
    - Add subscription cleanup on component unmount
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 8.2 Update admin dashboard to use real-time subscriptions
    - Subscribe to appointments:dentist:{dentistId} channel
    - Subscribe to availability:dentist:{dentistId} channel
    - Update UI automatically when events are received
    - _Requirements: 1.2, 2.2, 3.1_
  
  - [ ] 8.3 Update patient dashboard to use real-time subscriptions
    - Subscribe to appointments:patient:{patientId} channel
    - Update appointment list automatically when status changes
    - Show real-time availability updates when booking
    - _Requirements: 1.3, 2.3, 3.2_

- [ ] 9. Implement caching layer
  - Set up Redis client connection with connection pooling
  - Create CacheService with get, set, and invalidate methods
  - Add caching to DentistsRepository for profile data
  - Implement cache invalidation on availability updates
  - _Requirements: 10.5_

- [ ] 10. Add monitoring and logging infrastructure
  - Configure Winston logger with structured logging format
  - Add request logging middleware for all API calls
  - Implement metrics collection for broadcast latency
  - Create monitoring dashboard queries for realtime_events table
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 11. Integrate with existing admin and patient dashboards
  - Update admin dashboard API calls to use new backend endpoints
  - Update patient dashboard API calls to use new backend endpoints
  - Replace polling with real-time subscriptions in both dashboards
  - Test end-to-end flow: booking → real-time sync → admin sees it
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [ ] 12. Implement chatbot integration
  - Create chatbot-specific API endpoints for booking flow
  - Subscribe chatbot to availability:global channel for all dentists
  - Implement slot reservation during chatbot conversation
  - Release reservation if booking not completed within 5 minutes
  - _Requirements: 1.1, 2.1, 2.5_
