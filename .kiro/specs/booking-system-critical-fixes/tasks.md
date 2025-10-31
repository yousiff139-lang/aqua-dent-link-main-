# Implementation Plan

- [x] 1. Verify and fix database schema





  - Run Supabase migrations to ensure appointments table exists with all required columns
  - Verify dentists table has all required columns (id, name, email, specialization, rating, bio, education, expertise, image_url)
  - Confirm RLS policies are correctly configured for appointments and dentists tables
  - Create database indexes for performance (patient_id, dentist_id, appointment_date, status)
  - Test database connectivity and table access from application
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 2. Create React Query hooks for dentist data





  - Create hooks/useDentist.ts hook to fetch single dentist by ID
  - Create hooks/useDentists.ts hook to fetch all dentists
  - Implement proper error handling and loading states in hooks
  - Configure React Query cache settings (5 min staleTime, 10 min cacheTime)
  - Add retry logic (2 retries) for failed queries
  - Export TypeScript interfaces for Dentist type
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.2, 8.3, 8.4, 8.5_

- [x] 3. Update DentistProfile page to use real database data





  - Replace MOCK array with useDentist hook
  - Implement loading state with spinner component
  - Implement error state with user-friendly message
  - Implement not found state with redirect to dentists list
  - Display all dentist fields from database (name, specialization, bio, rating, education, expertise, image_url)
  - Handle missing or invalid image URLs with placeholder
  - Log errors to console for debugging
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 4. Update Dentists list page to use real database data





  - Replace hardcoded dentists array with useDentists hook
  - Implement loading state while fetching dentists
  - Implement empty state when no dentists found
  - Display dentist cards with data from database
  - Ensure "View Profile" button navigates with correct dentist ID
  - Ensure "Book Now" button works correctly
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5_
-

- [x] 5. Verify BookingForm uses correct table name




  - Audit BookingForm.tsx to confirm it uses 'appointments' (plural) table
  - Verify all database insert operations use correct table name
  - Ensure booking_reference is generated and included in insert
  - Confirm status is set to 'upcoming' (valid per schema constraint)
  - Test booking creation with valid data
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Enhance booking error handling





  - Create utils/errorHandler.ts with BookingError class
  - Implement handleDatabaseError function to classify errors
  - Add specific error messages for schema errors (42P01)
  - Add specific error messages for permission errors (42501)
  - Add specific error messages for unique constraint violations (23505)
  - Update BookingForm to use enhanced error handling
  - Display user-friendly error messages in UI
  - Log detailed errors to console for debugging
  - _Requirements: 1.5, 4.5, 5.4, 5.5, 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 7. Implement booking confirmation improvements





  - Ensure booking confirmation displays booking_reference from database
  - Display complete appointment details (dentist name, date, time, payment method)
  - Show payment status (pending for cash, paid for Stripe)
  - Add link to patient dashboard to view appointment
  - Add button to book another appointment
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 8. Create schema verification script





  - Create scripts/verifySchema.ts with schema checking logic
  - Check appointments table exists and is accessible
  - Check dentists table exists and is accessible
  - Verify required columns exist in appointments table
  - Verify required columns exist in dentists table
  - Output detailed report of schema status
  - Add npm script "verify:schema" to run verification
  - _Requirements: 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9. Create database test script





  - Create scripts/testDatabase.ts to test queries in isolation
  - Test fetching dentists by ID
  - Test fetching all dentists
  - Test creating appointment with valid data
  - Test querying appointments by patient_id
  - Output clear success/failure messages for each test
  - Add npm script "test:db" to run database tests
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 10. Add TypeScript type definitions





  - Create types/dentist.ts with Dentist interface
  - Create types/appointment.ts with Appointment interface
  - Export all types from types/index.ts
  - Update components to use typed interfaces
  - Ensure type safety for all database operations
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 11. Implement loading states across application





  - Add loading spinner component if not exists
  - Show loading state in DentistProfile while fetching
  - Show loading state in Dentists list while fetching
  - Show loading state in BookingForm during submission
  - Disable form inputs during submission to prevent duplicate submissions
  - _Requirements: 2.4, 8.5_

- [x] 12. Add comprehensive error logging





  - Log all database query errors with full details
  - Include query parameters and table name in error logs
  - Log successful operations in development mode
  - Use structured logging format (timestamp, operation, table, result)
  - Ensure no sensitive data (passwords, payment details) logged in production
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 13. Update environment variables documentation





  - Document VITE_SUPABASE_URL in README
  - Document VITE_SUPABASE_PUBLISHABLE_KEY in README
  - Create .env.example with all required variables
  - Add instructions for obtaining Supabase credentials
  - Document any other required environment variables
  - _Requirements: 6.5_

- [x] 14. Create migration safety script





  - Create scripts/runMigrations.ts to apply migrations safely
  - Check if appointments table exists before creating
  - Add missing columns without dropping existing ones
  - Update constraints safely (drop then recreate)
  - Make script idempotent (safe to run multiple times)
  - Add npm script "migrate" to run migrations
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 15. Test booking flow end-to-end





  - Navigate to dentists list page and verify dentists load
  - Click "View Profile" and verify profile loads with real data
  - Fill out booking form with valid data
  - Submit booking and verify appointment created in database
  - Verify booking confirmation displays correct details
  - Check browser console for any errors
  - Verify no schema cache errors occur
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 16. Test error scenarios





  - Test with invalid dentist ID and verify error handling
  - Test without authentication and verify redirect to login
  - Test with past date and verify validation error
  - Test with already booked slot and verify conflict handling
  - Test with network error and verify user-friendly message
  - Verify all errors are logged to console
  - _Requirements: 1.5, 2.3, 4.5, 5.4, 5.5_

- [x] 17. Implement dentist availability display





  - Fetch dentist availability from dentist_availability table or available_times column
  - Display available time slots on dentist profile page
  - Show "Contact dentist for availability" when no data exists
  - Disable time slots that are already booked
  - Refresh availability after booking is created
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 18. Add performance monitoring





  - Monitor page load times for dentist profile pages
  - Track booking success rate
  - Monitor database query performance
  - Set up error tracking for production
  - Create dashboard for monitoring key metrics
  - _Requirements: All requirements_

- [x] 19. Create user documentation





  - Document how to book an appointment
  - Document how to view dentist profiles
  - Document error messages and their meanings
  - Create troubleshooting guide for common issues
  - Add FAQ section for patients
  - _Requirements: All requirements_

- [x] 20. Final testing and deployment




  - Run all automated tests
  - Perform manual testing of all features
  - Test on different browsers (Chrome, Firefox, Safari)
  - Test on mobile devices
  - Deploy to staging environment
  - Run smoke tests on staging
  - Deploy to production
  - Monitor production for errors
  - _Requirements: All requirements_
