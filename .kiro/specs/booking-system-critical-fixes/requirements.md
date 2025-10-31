# Requirements Document

## Introduction

This feature addresses critical issues in the Dental Care Connect booking system that prevent patients from booking appointments and viewing dentist profiles. The system currently fails with a schema cache error referencing a non-existent `public.appointment` table (the correct table is `public.appointments`), and dentist profile pages load blank or return no data. These issues block core functionality and must be resolved immediately to restore the booking workflow.

## Glossary

- **Booking System**: The software component that manages appointment scheduling between patients and dentists
- **Schema Cache Error**: A database error indicating the system is looking for a table that doesn't exist in the current schema
- **Dentist Profile Page**: The page displaying dentist information, reviews, and booking options
- **Supabase**: The PostgreSQL-based backend-as-a-service platform used for database and authentication
- **RLS (Row Level Security)**: PostgreSQL security policies that control data access at the row level
- **Frontend**: The React-based user interface where patients interact with the system
- **Backend**: The Supabase database and API layer that stores and serves data
- **Appointments Table**: The database table storing all appointment bookings (correct name: `appointments`, not `appointment`)
- **Dentists Table**: The database table storing dentist profile information
- **Mock Data**: Hardcoded dentist data used in the frontend when database queries fail

## Requirements

### Requirement 1

**User Story:** As a patient, I want to book an appointment without encountering schema cache errors, so that I can successfully schedule a dental visit

#### Acceptance Criteria

1. WHEN a Patient submits a booking form, THE Booking System SHALL insert the appointment into the `appointments` table (not `appointment`)
2. THE Booking System SHALL use the correct table name in all database queries
3. WHEN the booking is submitted, THE Booking System SHALL return a success response with the appointment ID
4. THE Booking System SHALL not reference any table named `appointment` in queries
5. WHEN a booking fails, THE Booking System SHALL display a clear error message indicating the specific issue

### Requirement 2

**User Story:** As a patient, I want to view complete dentist profiles with real database data, so that I can make informed decisions about which dentist to book

#### Acceptance Criteria

1. WHEN a Patient navigates to a dentist profile page, THE Frontend SHALL fetch dentist data from the `dentists` table using the dentist ID
2. THE Frontend SHALL display dentist name, specialization, bio, rating, education, expertise, and image
3. WHEN dentist data is not found, THE Frontend SHALL display a user-friendly error message
4. THE Frontend SHALL show a loading state while fetching dentist data
5. THE Frontend SHALL fall back to mock data only if explicitly configured for development mode

### Requirement 3

**User Story:** As a developer, I want all database queries to use the correct table names, so that the system functions reliably

#### Acceptance Criteria

1. THE System SHALL use `appointments` (plural) in all database queries, never `appointment` (singular)
2. THE System SHALL use `dentists` (plural) in all database queries
3. THE System SHALL validate table names against the actual database schema
4. WHEN a query references an incorrect table name, THE System SHALL log a clear error message
5. THE System SHALL include table name validation in automated tests

### Requirement 4

**User Story:** As a patient, I want the booking form to successfully create appointments in the database, so that my bookings are saved and visible to dentists

#### Acceptance Criteria

1. WHEN a Patient submits a booking form, THE Booking System SHALL validate all required fields before submission
2. THE Booking System SHALL insert a new row into the `appointments` table with patient_id, dentist_id, appointment_date, appointment_time, patient_name, patient_email, patient_phone, payment_method, and status
3. WHEN the insert succeeds, THE Booking System SHALL return the created appointment with its unique ID
4. THE Booking System SHALL set the appointment status to 'pending' by default
5. WHEN the insert fails, THE Booking System SHALL capture and display the specific database error

### Requirement 5

**User Story:** As a patient, I want to see dentist profile data loaded from the database, so that I view accurate and up-to-date information

#### Acceptance Criteria

1. THE Frontend SHALL query the `dentists` table using: `supabase.from('dentists').select('*').eq('id', dentistId).single()`
2. WHEN the query succeeds, THE Frontend SHALL display all dentist fields including name, specialization, bio, rating, education, expertise, and image_url
3. WHEN the query returns no data, THE Frontend SHALL display "Dentist not found" and redirect to the dentists list page
4. THE Frontend SHALL handle database errors gracefully with user-friendly messages
5. THE Frontend SHALL log query errors to the console for debugging

### Requirement 6

**User Story:** As a developer, I want to verify that the database schema matches the application code, so that I can prevent schema mismatch errors

#### Acceptance Criteria

1. THE System SHALL include a schema verification script that checks for the existence of required tables
2. THE Verification Script SHALL confirm the `appointments` table exists with all required columns
3. THE Verification Script SHALL confirm the `dentists` table exists with all required columns
4. WHEN schema mismatches are detected, THE Verification Script SHALL output a detailed report of missing or incorrect elements
5. THE Verification Script SHALL be runnable via a simple command (e.g., `npm run verify:schema`)

### Requirement 7

**User Story:** As a patient, I want the dentist list page to display all available dentists from the database, so that I can browse and select a dentist

#### Acceptance Criteria

1. THE Frontend SHALL fetch all dentists from the `dentists` table on the dentists list page
2. THE Frontend SHALL display dentist cards showing name, specialization, rating, and image
3. WHEN no dentists are found, THE Frontend SHALL display "No dentists available" message
4. THE Frontend SHALL include "View Profile" and "Book Now" buttons on each dentist card
5. WHEN a Patient clicks "View Profile", THE Frontend SHALL navigate to the dentist profile page with the correct dentist ID

### Requirement 8

**User Story:** As a developer, I want to replace all mock data references with database queries, so that the application uses real data

#### Acceptance Criteria

1. THE Frontend SHALL remove hardcoded MOCK arrays from dentist-related components
2. THE Frontend SHALL use React Query or similar data-fetching library for all dentist queries
3. THE Frontend SHALL cache dentist data appropriately to reduce unnecessary database calls
4. WHEN database queries fail, THE Frontend SHALL display error states rather than falling back to mock data
5. THE Frontend SHALL include loading states for all data-fetching operations

### Requirement 9

**User Story:** As a system administrator, I want to ensure the database schema is correctly configured, so that all tables and columns exist as expected

#### Acceptance Criteria

1. THE Database SHALL have an `appointments` table with columns: id, patient_id, dentist_id, dentist_email, patient_name, patient_email, patient_phone, appointment_date, appointment_time, status, payment_method, payment_status, chief_complaint, created_at, updated_at
2. THE Database SHALL have a `dentists` table with columns: id, name, email, specialization, rating, experience_years, phone, address, bio, education, expertise, image_url, created_at, updated_at
3. THE Database SHALL have proper indexes on frequently queried columns (patient_id, dentist_id, appointment_date, status)
4. THE Database SHALL have RLS policies configured to allow patients to view their own appointments and dentists to view their assigned appointments
5. THE Database SHALL have constraints to ensure data integrity (e.g., valid status values, valid payment methods)

### Requirement 10

**User Story:** As a patient, I want to see real dentist images and information, so that I can recognize and trust the dentists

#### Acceptance Criteria

1. THE Frontend SHALL display dentist images from the `image_url` column in the `dentists` table
2. WHEN an image URL is invalid or missing, THE Frontend SHALL display a placeholder image
3. THE Frontend SHALL display dentist education as an array or formatted list
4. THE Frontend SHALL display dentist expertise as tags or badges
5. THE Frontend SHALL display dentist rating with star icons or numerical display

### Requirement 11

**User Story:** As a developer, I want comprehensive error logging for database operations, so that I can quickly diagnose and fix issues

#### Acceptance Criteria

1. THE System SHALL log all database query errors to the browser console with full error details
2. THE System SHALL include the query parameters and table name in error logs
3. THE System SHALL log successful database operations in development mode for debugging
4. THE System SHALL use structured logging with consistent format (timestamp, operation, table, result)
5. THE System SHALL not log sensitive patient information (passwords, payment details) in production

### Requirement 12

**User Story:** As a patient, I want the booking confirmation to display accurate appointment details, so that I know my booking was successful

#### Acceptance Criteria

1. WHEN a booking succeeds, THE Booking System SHALL return the complete appointment object including booking_reference
2. THE Frontend SHALL display the booking reference, dentist name, appointment date, appointment time, and payment method
3. THE Frontend SHALL display payment status (pending for cash, paid for successful Stripe payments)
4. THE Frontend SHALL provide a link to view the appointment in the patient dashboard
5. THE Frontend SHALL provide an option to book another appointment or return to the home page

### Requirement 13

**User Story:** As a developer, I want to run database migrations to ensure the schema is up-to-date, so that the application works with the correct database structure

#### Acceptance Criteria

1. THE System SHALL include a migration script that applies all pending database migrations
2. THE Migration Script SHALL check if the `appointments` table exists and create it if missing
3. THE Migration Script SHALL check if the `dentists` table exists and create it if missing
4. THE Migration Script SHALL add any missing columns to existing tables without data loss
5. THE Migration Script SHALL be idempotent (safe to run multiple times)

### Requirement 14

**User Story:** As a patient, I want to see dentist availability information on profile pages, so that I can choose appropriate appointment times

#### Acceptance Criteria

1. THE Frontend SHALL display dentist available time slots on the profile page
2. THE Frontend SHALL fetch availability from the `dentist_availability` table or `available_times` column
3. WHEN no availability data exists, THE Frontend SHALL display "Contact dentist for availability"
4. THE Frontend SHALL disable time slots that are already booked
5. THE Frontend SHALL refresh availability data after each booking

### Requirement 15

**User Story:** As a developer, I want to test database queries in isolation, so that I can verify they work correctly before integrating into the application

#### Acceptance Criteria

1. THE System SHALL include a test script that runs sample queries against the database
2. THE Test Script SHALL test fetching dentists by ID
3. THE Test Script SHALL test creating appointments with valid data
4. THE Test Script SHALL test querying appointments by patient_id
5. THE Test Script SHALL output clear success/failure messages for each test
