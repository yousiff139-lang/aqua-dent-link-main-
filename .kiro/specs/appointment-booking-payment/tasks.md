# Implementation Plan

- [x] 1. Set up database schema and migrations



  - Create appointments table with proper columns, constraints, and indexes
  - Create payment_transactions table for tracking Stripe payments
  - Add unique constraint on dentist_email, appointment_date, appointment_time to prevent double-booking
  - Create database indexes for optimized queries on dentist_email, patient_email, status, and dates
  - _Requirements: 1.1, 1.4, 1.5, 1.6, 9.1, 9.2, 9.3, 9.4, 9.5, 15.2, 15.4_

- [x] 2. Implement backend appointment types and DTOs



  - Extend existing types in backend/src/types/index.ts with payment-related fields
  - Create CreateAppointmentDTO with patient info, dentist info, date/time, payment method
  - Create UpdateAppointmentDTO for appointment modifications
  - Create PaymentTransactionDTO for Stripe payment tracking
  - Add payment status and payment method enums
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Create appointments repository layer





  - Implement AppointmentsRepository class in backend/src/repositories/appointments.repository.ts
  - Add method to create new appointment with validation
  - Add method to get appointments by dentist email with filtering and pagination
  - Add method to get appointments by patient email with filtering
  - Add method to update appointment (status, date, time, notes)
  - Add method to check slot availability before booking
  - Add method to get appointment by ID
  - Implement database transaction support for atomic operations
  - _Requirements: 1.1, 1.4, 1.5, 1.6, 5.1, 5.2, 5.3, 5.4, 5.5, 9.1, 9.2, 9.4, 15.1, 15.2, 15.4_
-

- [x] 4. Create payment repository layer




  - Implement PaymentRepository class in backend/src/repositories/payment.repository.ts
  - Add method to create payment transaction record
  - Add method to update payment status
  - Add method to get payment details by appointment ID
  - Add method to get payment by Stripe session ID
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.1, 9.2_

- [x] 5. Implement appointments service layer





  - Create AppointmentsService class in backend/src/services/appointments.service.ts
  - Implement createAppointment method with validation and slot availability check
  - Implement getAppointmentsByDentist with filtering and pagination
  - Implement getAppointmentsByPatient with filtering
  - Implement updateAppointment with authorization checks
  - Implement markAppointmentComplete for dentists
  - Implement rescheduleAppointment with validation
  - Implement checkSlotAvailability to prevent double-booking
  - Add business logic for preventing past date bookings
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 15.1, 15.2, 15.3, 15.4, 15.5_
-

- [x] 6. Implement Stripe payment service




  - Install Stripe SDK in backend (npm install stripe)
  - Create PaymentService class in backend/src/services/payment.service.ts
  - Implement createCheckoutSession method to generate Stripe Checkout URL
  - Implement handleWebhookEvent method to process Stripe webhook events
  - Implement updatePaymentStatus method to update appointment payment status
  - Add webhook signature verification for security
  - Add idempotency handling for webhook events
  - Store appointment ID in Stripe session metadata
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 10.5_
-

- [x] 7. Create appointments API endpoints




  - Create appointments controller in backend/src/controllers/appointments.controller.ts
  - Implement POST /api/appointments endpoint to create appointments
  - Implement GET /api/appointments/dentist/:dentistEmail endpoint with query filters
  - Implement GET /api/appointments/patient/:email endpoint
  - Implement PUT /api/appointments/:id endpoint for updates
  - Implement DELETE /api/appointments/:id endpoint for cancellations
  - Add request validation using Zod schemas
  - Add authentication middleware to protect endpoints
  - Add authorization checks (patients can only access their appointments, dentists can access their appointments)
  - _Requirements: 1.1, 1.4, 1.5, 1.6, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 10.1, 10.2, 10.3, 10.4, 10.6, 10.7, 10.8_
- [x] 8. Create payment API endpoints




















- [ ] 8. Create payment API endpoints

  - Create payments controller in backend/src/controllers/payments.controller.ts
  - Implement POST /api/payments/create-checkout-session endpoint
  - Implement POST /api/payments/webhook endpoint for Stripe webhooks
  - Add Stripe signature verification middleware for webhook endpoint
  - Add error handling for payment failures
  - Return Stripe Checkout URL to frontend
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 10.5, 10.6, 10.7_
- [x] 9. Set up API routes and middleware














- [ ] 9. Set up API routes and middleware

  - Register appointments routes in backend/src/routes/index.ts
  - Register payment routes in backend/src/routes/index.ts
  - Configure CORS to allow User Website and Dentist Portal origins
  - Add rate limiting middleware to prevent abuse
  - Add request logging middleware
  - _Requirements: 10.6, 10.7, 10.8_


- [x] 10. Create booking form component for User Website



  - Create BookingForm component in src/components/BookingForm.tsx
  - Add form fields: patient name, email, phone, reason, date, time, payment method
  - Implement form validation using React Hook Form and Zod
  - Add date picker component with past date restrictions
  - Add time picker/dropdown for appointment time selection
  - Add payment method radio buttons (Stripe/Cash)
  - Add loading state during form submission
  - Add error message display for validation and API errors
  - Auto-fill dentist information from props
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 11.1, 11.2, 11.3, 11.4, 11.5, 14.1, 14.4_

- [x] 11. Implement Stripe payment integration in User Website





  - Install Stripe.js in User Website (npm install @stripe/stripe-js)
  - Create useStripeCheckout hook for payment flow
  - Implement logic to create Stripe Checkout session when Stripe payment is selected
  - Redirect user to Stripe Checkout URL
  - Handle return from Stripe (success/cancel URLs)
  - Display payment processing status
  - Handle payment errors and display user-friendly messages
  - _Requirements: 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 13.2, 13.3, 14.3_
-

- [x] 12. Create booking confirmation component




  - Create BookingConfirmation component in src/components/BookingConfirmation.tsx
  - Display appointment details (dentist, date, time, booking reference)
  - Show payment status (paid for Stripe, pending for cash)
  - Add reminder message for cash payments
  - Add buttons to view appointment details or return home
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
-

- [x] 13. Integrate booking form into dentist profile page




  - Update DentistProfile page to include BookingForm component
  - Pass dentist information (ID, name, email) to BookingForm
  - Handle successful booking by showing BookingConfirmation
  - Add smooth scroll to booking form section
  - _Requirements: 1.1, 1.2_

- [x] 14. Create My Appointments page for patients





  - Create MyAppointments page component in src/pages/MyAppointments.tsx
  - Fetch patient appointments from API using React Query
  - Display appointments in list/card format
  - Show appointment details: dentist, date, time, status, payment status
  - Add filter dropdown for appointment status (all, upcoming, completed, cancelled)
  - Sort appointments by date (upcoming first)
  - Add loading and error states
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 14.2_

- [x] 15. Create appointments tab in Dentist Portal




  - Create AppointmentsTab component in dentist-portal/src/components/AppointmentsTab.tsx
  - Fetch dentist appointments from API using React Query
  - Display appointments in table format with columns: patient name, date, time, reason, payment method, payment status, status
  - Sort appointments by date/time (upcoming first)
  - Add filter dropdown for appointment status
  - Implement real-time updates using Supabase subscriptions
  - Add loading and error states
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 14.2_
-

- [x] 16. Implement appointment actions in Dentist Portal




  - Add "Mark as Completed" button for pending appointments
  - Implement markComplete handler that calls PUT /api/appointments/:id
  - Add "Reschedule" button that opens reschedule dialog
  - Create RescheduleDialog component with date/time pickers
  - Implement reschedule handler that calls PUT /api/appointments/:id
  - Update UI optimistically and refetch on success
  - Add confirmation dialogs for destructive actions
  - Display patient contact information (email, phone) with click-to-call/email
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 12.1, 12.2, 12.3, 12.4, 12.5_
- [x] 17. Implement appointment card component for Dentist Portal










- [ ] 17. Implement appointment card component for Dentist Portal

  - Create AppointmentCard component in dentist-portal/src/components/AppointmentCard.tsx
  - Display all appointment details in a card layout
  - Show patient information prominently
  - Display payment method and status with visual indicators
  - Add action buttons (mark complete, reschedule)
  - Style completed appointments differently from pending
  - Add hover effects and transitions
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.3, 12.1, 12.2, 12.3, 12.4, 12.5_
-

- [x] 18. Add error handling and user feedback




  - Implement toast notifications for success/error messages in User Website
  - Implement toast notifications in Dentist Portal
  - Add specific error messages for validation failures
  - Add user-friendly messages for API errors
  - Add retry mechanisms for failed API calls
  - Display loading spinners during async operations
  - Add empty states for no appointments
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 19. Implement concurrent booking prevention










  - Add database unique constraint on (dentist_email, appointment_date, appointment_time)
  - Implement slot availability check in appointments service before creating appointment
  - Handle conflict errors (409) gracefully in frontend
  - Display "slot unavailable" message to users
  - Suggest alternative time slots when slot is taken
  - Use database transactions for atomic booking operations
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 20. Set up environment variables and configuration








  - Add Stripe API keys to backend .env file (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
  - Add Stripe publishable key to User Website .env file (VITE_STRIPE_PUBLISHABLE_KEY)
  - Add API URL to frontend .env files (VITE_API_URL)
  - Configure CORS origins for User Website and Dentist Portal
  - Add payment amount configuration (can be hardcoded or configurable)
  - Document all required environment variables in README
  - _Requirements: 3.1, 3.2, 10.8_
-

- [x] 21. Add API request/response logging





  - Implement request logging middleware in backend
  - Log all API requests with timestamp, method, path, user ID
  - Log all API responses with status code and duration
  - Log errors with full stack traces
  - Use Winston logger for structured logging
  - Add request ID for tracing
  - _Requirements: 13.5_

- [x] 22. Write backend unit tests





  - Write unit tests for AppointmentsService methods
  - Write unit tests for PaymentService methods
  - Write unit tests for validation schemas
  - Mock database and Stripe calls
  - Test error handling paths
  - Test business logic (slot availability, date validation)
  - _Requirements: All requirements_

- [x] 23. Write backend integration tests














  - Write integration tests for POST /api/appointments endpoint
  - Write integration tests for GET /api/appointments endpoints
  - Write integration tests for PUT /api/appointments/:id endpoint
  - Write integration tests for payment endpoints
  - Test authentication and authorization
  - Test Stripe webhook handling with mock events
  - _Requirements: All requirements_

- [x] 24. Write frontend component tests






  - Write tests for BookingForm component (validation, submission)
  - Write tests for BookingConfirmation component
  - Write tests for AppointmentsTab component
  - Write tests for AppointmentCard component
  - Write tests for RescheduleDialog component
  - Mock API calls and test response handling
  - Test loading and error states
  - _Requirements: All requirements_

- [ ] 25. Create API documentation

  - Document all API endpoints with request/response examples
  - Create Postman/Insomnia collection for API testing
  - Document authentication requirements
  - Document error codes and messages
  - Add example curl commands
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [ ] 26. Add end-to-end tests

  - Write E2E test for complete booking flow (form → payment → confirmation)
  - Write E2E test for dentist viewing appointments
  - Write E2E test for marking appointment complete
  - Write E2E test for rescheduling appointment
  - Test error scenarios (invalid data, payment failures)
  - _Requirements: All requirements_
