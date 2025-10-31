# Complete Admin Dashboard - Requirements

## Introduction

This feature implements a comprehensive admin dashboard for dentists and administrators to manage their practice, view patients, handle appointments, and interact with an AI assistant. The dashboard runs on port 3010+ as a separate application from the patient-facing website (port 8000), sharing the same database and authentication system.

## Glossary

- **Admin Dashboard**: The dentist/admin interface running on port 3010+
- **User Website**: The patient-facing website running on port 8000
- **Dentist**: A healthcare provider who manages their profile and appointments
- **Admin**: A user with elevated privileges who can add new dentist profiles
- **Patient**: A user who books appointments with dentists
- **AI Assistant**: Google Gemini-powered chatbot for diagnostic assistance
- **Profile Sync**: Real-time synchronization of dentist profiles between admin dashboard and user website

## Requirements

### Requirement 1: Patient Management

**User Story:** As a dentist, I want to view all patients who have booked appointments with me so that I can manage my patient list effectively.

#### Acceptance Criteria

1. WHEN a dentist accesses the Patients page, THE Admin Dashboard SHALL display a list of all patients who have booked with them
2. THE Admin Dashboard SHALL display patient name, email, total appointments, and last visit date for each patient
3. WHEN a dentist clicks on a patient, THE Admin Dashboard SHALL open the patient's detailed file
4. THE patient file SHALL display uploaded scans, reports, AI summaries, and appointment history
5. THE Admin Dashboard SHALL allow filtering patients by status (active, inactive, all)

### Requirement 2: Appointment Management

**User Story:** As a dentist, I want to view and manage all my appointments so that I can organize my schedule effectively.

#### Acceptance Criteria

1. WHEN a dentist accesses the Appointments page, THE Admin Dashboard SHALL display all current and upcoming bookings
2. THE Admin Dashboard SHALL display patient name, date, time, appointment type, and status for each appointment
3. THE Admin Dashboard SHALL allow filtering appointments by status (Pending, Confirmed, Completed, Cancelled)
4. WHEN a dentist updates an appointment status, THE Admin Dashboard SHALL save the changes and sync to the patient dashboard
5. THE Admin Dashboard SHALL allow dentists to add notes to appointments

### Requirement 3: Dentist Profile Management

**User Story:** As a dentist, I want to create and manage my professional profile so that patients can find and book appointments with me.

#### Acceptance Criteria

1. WHEN a dentist accesses the Profile page, THE Admin Dashboard SHALL display their current profile information
2. THE Admin Dashboard SHALL allow editing of full name, specialty, education, years of experience, clinic address, contact info, and available times
3. WHEN a dentist updates their profile, THE Admin Dashboard SHALL save changes to the database
4. THE Admin Dashboard SHALL immediately reflect profile updates on the user website (port 8000)
5. THE Admin Dashboard SHALL allow dentists to delete their profile with confirmation

### Requirement 4: Admin - Add New Dentist

**User Story:** As an admin, I want to add new dentist profiles to the system so that more dentists can join the platform.

#### Acceptance Criteria

1. WHEN an admin user accesses the Add Dentist page, THE Admin Dashboard SHALL display a form to create new dentist profiles
2. THE form SHALL include fields for name, specialty, education, experience, clinic address, contact, and available times
3. WHEN an admin submits the form, THE Admin Dashboard SHALL create a new dentist profile in the database
4. THE new dentist profile SHALL immediately appear on the user website dentist list
5. THE Admin Dashboard SHALL send a notification or email to the new dentist with login credentials

### Requirement 5: AI Chat Assistant

**User Story:** As a dentist, I want to interact with an AI assistant to get insights about patients and diagnostic assistance.

#### Acceptance Criteria

1. THE Admin Dashboard SHALL display a chat icon in the bottom-right corner on all pages
2. WHEN a dentist clicks the chat icon, THE Admin Dashboard SHALL open a chat interface
3. THE AI Assistant SHALL identify the logged-in dentist and their patients automatically
4. THE AI Assistant SHALL answer questions about specific patients, uploaded scans, and reports
5. THE AI Assistant SHALL use Google Gemini API for multimodal processing (text + files)

### Requirement 6: Dashboard Overview

**User Story:** As a dentist, I want to see an overview of my practice metrics so that I can monitor my performance.

#### Acceptance Criteria

1. WHEN a dentist accesses the Dashboard page, THE Admin Dashboard SHALL display key metrics
2. THE metrics SHALL include total patients, today's appointments, pending appointments, and completed appointments
3. THE Admin Dashboard SHALL display a "Today's Appointments" summary card
4. THE Admin Dashboard SHALL show recent patient activity
5. THE Admin Dashboard SHALL display appointment analytics with charts (optional)

### Requirement 7: Profile Synchronization

**User Story:** As a system, I want to synchronize dentist profiles between the admin dashboard and user website so that data is always consistent.

#### Acceptance Criteria

1. WHEN a dentist updates their profile on the admin dashboard, THE system SHALL immediately update the profile on the user website
2. WHEN a dentist deletes their profile, THE system SHALL immediately remove it from the user website dentist list
3. WHEN an admin adds a new dentist, THE system SHALL immediately add them to the user website dentist list
4. THE synchronization SHALL happen in real-time without manual refresh
5. THE system SHALL maintain data consistency across both applications

### Requirement 8: Navigation and Layout

**User Story:** As a dentist, I want an intuitive navigation system so that I can easily access different sections of the dashboard.

#### Acceptance Criteria

1. THE Admin Dashboard SHALL display a sidebar navigation with sections: Dashboard, Patients, Appointments, Profile, Add Dentist (admin only), Chat Assistant, Settings
2. THE sidebar SHALL highlight the current active section
3. THE main content area SHALL display the selected section's content
4. THE Admin Dashboard SHALL be responsive for desktop and tablet devices
5. THE Admin Dashboard SHALL hide sign-in buttons after successful login

### Requirement 9: Notifications and Feedback

**User Story:** As a dentist, I want to receive notifications about new appointments and system updates so that I stay informed.

#### Acceptance Criteria

1. THE Admin Dashboard SHALL display a notification bar for new appointments
2. WHEN a dentist performs an action (add, edit, delete), THE Admin Dashboard SHALL show a toast confirmation message
3. THE Admin Dashboard SHALL display error messages when operations fail
4. THE Admin Dashboard SHALL show loading indicators during data fetching
5. THE Admin Dashboard SHALL display success messages after successful operations

### Requirement 10: Security and Authentication

**User Story:** As a system, I want to ensure secure access to the admin dashboard so that only authorized dentists and admins can access it.

#### Acceptance Criteria

1. THE Admin Dashboard SHALL require authentication before granting access
2. THE Admin Dashboard SHALL verify user email against the authorized admin list
3. THE Admin Dashboard SHALL maintain user session using localStorage or JWT tokens
4. THE Admin Dashboard SHALL redirect unauthorized users to the login page
5. THE Admin Dashboard SHALL provide a sign-out function that clears the session
