# Implementation Plan

- [ ] 1. Extend dentists table schema with required fields
  - Add migration to extend dentists table with education, clinic_address, available_times, contact_email, and profile_image_url columns
  - Ensure all new columns have appropriate data types (text for education/address/email, jsonb for available_times)
  - Add indexes for performance optimization if needed
  - _Requirements: 1.1, 1.2, 1.5_

- [ ] 2. Create database migration for Dr. Michael Chen seed data
  - [ ] 2.1 Create migration file to seed default dentist account
    - Write SQL migration to insert Dr. Michael Chen into auth.users table with hashed password
    - Create corresponding profile record in profiles table with full name, email, and phone
    - Insert dentist role into user_roles table
    - Create dentist profile in dentists table with all required fields (specialization, bio, education, clinic_address, available_times, etc.)
    - Use ON CONFLICT DO NOTHING for idempotent operations
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 2.2 Add Dr. Michael Chen's complete profile data
    - Set specialization to "General & Cosmetic Dentistry"
    - Set bio to "Friendly and precise dental professional focused on patient comfort and oral health."
    - Set education to "DDS, University of Toronto"
    - Set years_of_experience to 10
    - Set rating to 5.0
    - Set clinic_address to "Downtown Dental Care, Toronto, Canada"
    - Set available_times JSONB with Monday-Friday 09:00-17:00, Saturday 10:00-14:00
    - Set contact_email to "dr.michaelchen@clinic.com"
    - _Requirements: 1.1, 1.2, 1.5_

- [ ] 3. Update Dentists page to fetch from database
  - [ ] 3.1 Replace hardcoded dentist data with Supabase query
    - Remove mock dentists array from Dentists.tsx
    - Implement fetchDentists function using Supabase client
    - Query dentists table with join to profiles table for full_name and email
    - Add loading state while fetching data
    - Add error handling for failed queries
    - _Requirements: 2.1, 2.2, 2.5_
  
  - [ ] 3.2 Update dentist card rendering logic
    - Map database records to dentist card components
    - Use profile_image_url from database or fallback to default images
    - Display all profile fields (name, specialization, bio, rating, reviews)
    - Ensure Dr. Michael Chen appears in the dentist list
    - Update Link components to use database dentist IDs
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 4. Create Today's Appointments component for admin dashboard
  - [ ] 4.1 Build TodaysAppointments component
    - Create new component file in admin-app/src/components/TodaysAppointments.tsx
    - Implement props interface accepting dentistId
    - Design card layout matching admin dashboard theme with gradient background
    - Add empty state UI for when no appointments exist
    - Style appointment list items with patient name, time, service type, and status badge
    - _Requirements: 4.1, 4.3_
  
  - [ ] 4.2 Implement appointment fetching logic
    - Write fetchTodaysAppointments function to query appointments table
    - Filter by dentist_id matching authenticated user
    - Filter by appointment_date for current day (00:00:00 to 23:59:59)
    - Join with profiles table to get patient full_name
    - Order appointments by appointment_date ascending
    - Handle loading and error states
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ] 4.3 Add real-time updates for appointments
    - Implement Supabase real-time subscription for appointments table
    - Filter subscription by dentist_id
    - Update component state when appointments are inserted, updated, or deleted
    - Clean up subscription on component unmount
    - _Requirements: 4.5_

- [ ] 5. Integrate Today's Appointments into admin dashboard
  - Import TodaysAppointments component into admin Dashboard.tsx
  - Add component below stats cards in dashboard layout
  - Pass authenticated user's ID as dentistId prop
  - Adjust spacing and layout to accommodate new component
  - Ensure component displays correctly on different screen sizes
  - _Requirements: 3.2, 4.1, 4.5_

- [ ] 6. Update DentistProfile page to fetch from database
  - [ ] 6.1 Replace mock data with database query
    - Remove MOCK dentists array from DentistProfile.tsx
    - Implement fetchDentistById function using Supabase client
    - Query dentists table by ID from route params
    - Join with profiles table for full_name and email
    - Handle case when dentist ID is not found (redirect to dentists page)
    - _Requirements: 2.4, 2.5_
  
  - [ ] 6.2 Update profile display with new fields
    - Display education field in Education card
    - Display clinic_address in profile information
    - Display available_times in formatted schedule
    - Show contact_email if available
    - Use profile_image_url or fallback to default image
    - _Requirements: 2.4, 2.5_

- [ ] 7. Implement profile sync between admin and user site
  - [ ] 7.1 Add profile update functionality in admin dashboard
    - Create or update Profile page in admin-app to allow editing dentist information
    - Add form fields for all editable profile data (specialization, bio, education, clinic_address, available_times)
    - Implement save function that updates dentists table
    - Show success/error toast notifications on save
    - Validate data before submitting
    - _Requirements: 5.1, 5.2, 5.4_
  
  - [ ] 7.2 Ensure user website reflects profile changes
    - Verify Dentists page refetches data on navigation or uses cache invalidation
    - Test that profile updates in admin dashboard appear on user website within 2 seconds
    - Implement optimistic UI updates if needed for better UX
    - Add error handling for sync failures
    - _Requirements: 5.2, 5.3, 5.5_

- [ ] 8. Test default dentist login and functionality
  - Verify Dr. Michael Chen can log into admin dashboard with email "dr.michaelchen@clinic.com" and password "securetest123"
  - Confirm Today's Appointments card displays on admin dashboard after login
  - Test that Dr. Chen's profile appears on user website Dentists page
  - Verify profile link navigates to detailed profile page with correct data
  - Test booking appointment with Dr. Chen and seeing it appear in Today's Appointments
  - Confirm profile updates in admin dashboard sync to user website
  - _Requirements: 1.3, 2.1, 3.1, 3.2, 4.1, 5.1, 5.2_
