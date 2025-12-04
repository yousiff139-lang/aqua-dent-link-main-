# Implementation Plan

## Overview
This plan addresses the remaining issues with appointment operations in the dentist portal. The backend authorization is already properly implemented to handle both dentist table and Supabase auth. The main work involves updating the frontend to use the backend API consistently, add proper error handling, implement real-time updates, and improve user experience.

---

## Tasks

- [-] 1. Update DentistDashboard to use backend API for all appointment operations


  - Replace direct Supabase calls with `appointmentService` methods
  - Remove `handleUpdateStatus` function that bypasses backend
  - Update "Mark as Completed" button to use `appointmentService.markComplete()`
  - Update "Cancel Appointment" button to use `appointmentService.cancel()`
  - Ensure all status changes go through the backend API
  - _Requirements: 1.1, 1.2, 1.3, 2.2, 2.3, 2.4, 5.1, 5.2_

- [ ] 2. Add loading states and error handling to appointment operations
  - Add loading state for mark complete operation
  - Add loading state for cancel operation
  - Implement error handling with user-friendly toast messages
  - Handle 401 errors by redirecting to login
  - Handle 403 errors with permission denied message
  - Handle network errors with connection problem message
  - Disable action buttons while operations are in progress
  - _Requirements: 1.4, 1.6, 1.7, 2.5, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Add confirmation dialog for cancel operation
  - Create confirmation dialog component for appointment cancellation
  - Add optional cancellation reason input field
  - Show appointment details in confirmation dialog
  - Pass cancellation reason to `appointmentService.cancel()`
  - Update dialog state management
  - _Requirements: 2.1_

- [ ] 4. Implement real-time appointment updates using Supabase subscriptions
  - Set up Supabase real-time subscription for appointments table
  - Filter subscription to only dentist's appointments
  - Update appointments list when INSERT/UPDATE/DELETE events occur
  - Update selected appointment in dialog when it changes
  - Handle subscription cleanup on component unmount
  - Add error handling for subscription failures
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 5. Improve appointment action button states
  - Show "Mark as Completed" only for upcoming appointments
  - Show "Cancel" only for upcoming appointments
  - Hide action buttons for completed/cancelled appointments
  - Update button states in both list view and detail dialog
  - Add visual feedback when buttons are disabled
  - _Requirements: 1.5, 2.6_

- [ ] 6. Add detailed logging for debugging appointment operations
  - Log appointment operation attempts (mark complete, cancel)
  - Log authorization context (user ID, email, role)
  - Log API responses and errors
  - Add console warnings for authorization failures
  - Include appointment ID and dentist email in all logs
  - _Requirements: 3.5_

- [ ] 7. Test appointment operations end-to-end
  - Test marking appointment as completed with valid dentist
  - Test cancelling appointment with valid dentist
  - Test authorization failure scenarios (wrong dentist)
  - Test network failure scenarios
  - Test session expiration during operations
  - Test real-time updates across multiple browser tabs
  - Verify error messages are user-friendly
  - Verify loading states work correctly
  - _Requirements: All_

---

## Notes

- The backend authorization logic is already properly implemented and handles both dentist table authentication and Supabase auth
- The `appointmentService` already has the correct methods for mark complete and cancel operations
- Focus is on frontend improvements: using the backend API consistently, adding proper UX, and implementing real-time updates
- All tasks build incrementally - start with API integration, then add UX improvements, then real-time features
