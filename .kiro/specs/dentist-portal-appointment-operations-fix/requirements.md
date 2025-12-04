# Requirements Document

## Introduction

This document outlines the requirements for fixing the "Mark as Completed" and "Cancel" appointment operations in the dentist portal. Currently, these operations may not be functioning correctly due to authorization issues, API communication problems, or data flow inconsistencies between the frontend and backend.

## Glossary

- **Dentist Portal**: The web application interface used by dentists to manage their appointments and patient interactions
- **Appointment**: A scheduled meeting between a dentist and a patient at a specific date and time
- **Mark as Completed**: The action of changing an appointment's status from pending/confirmed/upcoming to completed
- **Cancel Operation**: The action of changing an appointment's status to cancelled
- **Backend API**: The Node.js/Express server that handles appointment data operations
- **Frontend Service**: The TypeScript service layer that communicates with the Backend API
- **Authorization**: The process of verifying that a dentist has permission to perform operations on specific appointments

## Requirements

### Requirement 1

**User Story:** As a dentist, I want to mark appointments as completed, so that I can accurately track which patient visits have been finished.

#### Acceptance Criteria

1. WHEN a dentist clicks the "Mark as Completed" button on an appointment THEN the system SHALL send a request to the backend API with the appointment ID and dentist credentials
2. WHEN the backend receives a mark-as-completed request THEN the system SHALL verify the dentist is authorized to complete that specific appointment
3. WHEN authorization succeeds THEN the system SHALL update the appointment status to "completed" in the database
4. WHEN the appointment is successfully marked as completed THEN the system SHALL display a success message to the dentist
5. WHEN the appointment status changes THEN the system SHALL update the UI to reflect the new status without requiring a page refresh
6. IF the dentist is not authorized to complete the appointment THEN the system SHALL display an error message indicating insufficient permissions
7. IF the backend request fails THEN the system SHALL display a user-friendly error message and maintain the current appointment state

### Requirement 2

**User Story:** As a dentist, I want to cancel appointments, so that I can manage my schedule when appointments need to be removed.

#### Acceptance Criteria

1. WHEN a dentist clicks the "Cancel" button on an appointment THEN the system SHALL display a confirmation dialog
2. WHEN the dentist confirms cancellation THEN the system SHALL send a DELETE request to the backend API with the appointment ID
3. WHEN the backend receives a cancellation request THEN the system SHALL verify the dentist is authorized to cancel that specific appointment
4. WHEN authorization succeeds THEN the system SHALL update the appointment status to "cancelled" in the database
5. WHEN the appointment is successfully cancelled THEN the system SHALL display a success message to the dentist
6. WHEN the appointment status changes to cancelled THEN the system SHALL update the UI to reflect the cancellation
7. IF the dentist is not authorized to cancel the appointment THEN the system SHALL display an error message indicating insufficient permissions
8. IF the backend request fails THEN the system SHALL display a user-friendly error message and maintain the current appointment state

### Requirement 3

**User Story:** As a dentist, I want proper error handling for appointment operations, so that I understand what went wrong when operations fail.

#### Acceptance Criteria

1. WHEN an appointment operation fails due to network issues THEN the system SHALL display a message indicating connection problems
2. WHEN an appointment operation fails due to authorization THEN the system SHALL display a message indicating permission issues
3. WHEN an appointment operation fails due to invalid data THEN the system SHALL display a message indicating what data is invalid
4. WHEN a session expires during an operation THEN the system SHALL redirect the dentist to the login page with an appropriate message
5. WHEN an error occurs THEN the system SHALL log detailed error information to the console for debugging purposes

### Requirement 4

**User Story:** As a dentist, I want real-time updates when appointment statuses change, so that I always see the current state of my appointments.

#### Acceptance Criteria

1. WHEN an appointment status is updated THEN the system SHALL broadcast the change via Supabase real-time subscriptions
2. WHEN the dentist portal receives a real-time update THEN the system SHALL update the appointments list automatically
3. WHEN multiple appointments are displayed THEN the system SHALL update only the affected appointment without refreshing the entire list
4. WHEN the dentist is viewing an appointment card THEN the system SHALL update the card's status badge and available actions immediately

### Requirement 5

**User Story:** As a system administrator, I want proper authorization checks for appointment operations, so that dentists can only modify their own appointments.

#### Acceptance Criteria

1. WHEN a dentist attempts to mark an appointment as completed THEN the system SHALL verify the appointment belongs to that dentist by email or ID
2. WHEN a dentist attempts to cancel an appointment THEN the system SHALL verify the appointment belongs to that dentist by email or ID
3. WHEN authorization verification occurs THEN the system SHALL check both the dentist ID and dentist email fields
4. WHEN a dentist is authenticated via the dentists table THEN the system SHALL use their email to match against appointment records
5. IF authorization fails THEN the system SHALL return a 403 Forbidden status code with a descriptive error message
