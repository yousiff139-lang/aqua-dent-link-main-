# Requirements Document

## Introduction

The Dentist Portal is a web application that enables dentists to manage their profile, availability, and patient appointments. The portal provides authenticated access for dentists to view their published information, manage their schedule, and track patient bookings with the ability to update appointment statuses.

## Glossary

- **Dentist Portal**: The web application running on port 5173 that provides dentists with access to their dashboard
- **Authentication System**: The login mechanism that verifies dentist identity using their Gmail address
- **Dentist Dashboard**: The main interface after login containing profile, availability, and patient management sections
- **Profile Section**: The area displaying dentist's published information (name, specialty, email, photo)
- **Available Times Section**: The interface for viewing and rescheduling dentist availability
- **Patient List Section**: The display of all patients who have booked appointments with the dentist
- **Appointment Status**: The current state of an appointment (pending, completed)
- **Backend API**: The server endpoints that provide dentist data, patient information, and appointment management
- **Protected Routes**: Application routes that require authentication to access
- **Session Storage**: The mechanism for maintaining dentist login state using localStorage or JWT

## Requirements

### Requirement 1

**User Story:** As a dentist, I want to log in using my Gmail address, so that I can access my personalized dashboard

#### Acceptance Criteria

1. THE Dentist Portal SHALL display a login page with an email input field
2. WHEN a dentist enters their Gmail address and submits the form, THE Authentication System SHALL verify the email against the database
3. IF the email verification succeeds, THEN THE Authentication System SHALL redirect the dentist to the Dentist Dashboard
4. IF the email verification fails, THEN THE Authentication System SHALL display an error message to the dentist
5. WHEN a dentist successfully logs in, THE Authentication System SHALL store the session using localStorage or JWT

### Requirement 2

**User Story:** As a dentist, I want to view my profile information on the dashboard, so that I can see what patients see on the public website

#### Acceptance Criteria

1. THE Dentist Dashboard SHALL display a Profile Section containing the dentist's name, specialty, email, and photo
2. WHEN the Dentist Dashboard loads, THE Backend API SHALL fetch dentist information from GET /dentists/:email endpoint
3. THE Profile Section SHALL display all personal information as published on the user website
4. IF the profile data fetch fails, THEN THE Dentist Dashboard SHALL display an error message in the Profile Section

### Requirement 3

**User Story:** As a dentist, I want to view and reschedule my available times, so that I can manage my appointment availability

#### Acceptance Criteria

1. THE Dentist Dashboard SHALL display an Available Times Section showing all scheduled availability slots
2. THE Available Times Section SHALL provide functionality to reschedule existing time slots
3. WHEN a dentist modifies an available time, THE Backend API SHALL update the availability in the database
4. THE Available Times Section SHALL display times in a clear, readable format with date and time information

### Requirement 4

**User Story:** As a dentist, I want to see all patients who booked appointments with me, so that I can manage my patient schedule

#### Acceptance Criteria

1. THE Dentist Dashboard SHALL display a Patient List Section containing all booked appointments
2. WHEN the Patient List Section loads, THE Backend API SHALL fetch patient data from GET /dentists/:email/patients endpoint
3. THE Patient List Section SHALL display patient name, appointment time, and status for each appointment
4. THE Patient List Section SHALL sort appointments in chronological order

### Requirement 5

**User Story:** As a dentist, I want to mark appointments as completed, so that I can track which patients I have seen

#### Acceptance Criteria

1. THE Patient List Section SHALL display a "Mark as Completed" button for each appointment entry
2. WHEN a dentist clicks the "Mark as Completed" button, THE Backend API SHALL send a PUT request to /appointments/:id endpoint
3. WHEN the appointment status update succeeds, THE Patient List Section SHALL update the appointment status to "completed"
4. IF the status update fails, THEN THE Patient List Section SHALL display an error message to the dentist
5. THE Patient List Section SHALL visually distinguish completed appointments from pending appointments

### Requirement 6

**User Story:** As a dentist, I want to navigate between different sections of the dashboard, so that I can access all features efficiently

#### Acceptance Criteria

1. THE Dentist Dashboard SHALL display a navigation sidebar with links to Profile, Available Times, and Patients sections
2. WHEN a dentist clicks a navigation link, THE Dentist Dashboard SHALL display the corresponding section
3. THE Navigation Sidebar SHALL highlight the currently active section
4. THE Dentist Dashboard SHALL maintain responsive layout on mobile and desktop devices

### Requirement 7

**User Story:** As a dentist, I want my dashboard to be protected from unauthorized access, so that my patient information remains secure

#### Acceptance Criteria

1. WHEN an unauthenticated user attempts to access the Dentist Dashboard, THE Authentication System SHALL redirect them to the login page
2. THE Authentication System SHALL verify session validity before rendering protected routes
3. WHEN a dentist logs out, THE Authentication System SHALL clear the stored session data
4. THE Protected Routes SHALL check authentication status on every route change

### Requirement 8

**User Story:** As a dentist, I want the portal to have a clean modern interface, so that I can use it efficiently and professionally

#### Acceptance Criteria

1. THE Dentist Portal SHALL implement TailwindCSS for styling
2. THE Dentist Portal SHALL use a clean, modern design aesthetic throughout all pages
3. THE Dentist Portal SHALL maintain consistent spacing, typography, and color scheme
4. THE Dentist Portal SHALL provide responsive layouts that adapt to mobile and desktop screen sizes
5. THE Dentist Portal SHALL display loading states during data fetching operations
