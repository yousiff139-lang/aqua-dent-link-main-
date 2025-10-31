# Requirements Document

## Introduction

This feature implements a complete appointment booking and payment system for the dental care platform. The system enables patients to book appointments with specific dentists through a user-friendly form, process payments securely via Stripe or cash, and allows dentists to manage their appointments through their dedicated portal. The system provides real-time synchronization between patient bookings and dentist dashboards, ensuring seamless communication and appointment management.

## Glossary

- **Booking System**: The software component that manages the complete appointment scheduling workflow between patients and dentists
- **Patient**: A user who books dental appointments through the platform
- **Dentist**: A healthcare provider who receives and manages appointment bookings through the Dentist Portal
- **Appointment**: A scheduled meeting between a patient and a dentist at a specific date and time
- **Payment System**: The Stripe-integrated component that processes online payments for appointments
- **Dentist Portal**: The web application (port 5173) where dentists view and manage their appointments
- **User Website**: The patient-facing website where patients browse dentists and book appointments
- **Stripe Checkout**: The secure payment interface provided by Stripe for processing online payments
- **Backend API**: The Node.js Express server that handles appointment and payment operations
- **Appointment Status**: The current state of an appointment (pending, confirmed, completed, cancelled)
- **Payment Status**: The current state of payment (pending, paid, failed)
- **Payment Method**: The method used for payment (stripe for online, cash for in-person)

## Requirements

### Requirement 1

**User Story:** As a patient, I want to book an appointment with a specific dentist from their profile page, so that I can schedule a dental visit

#### Acceptance Criteria

1. WHEN a Patient views a dentist profile page, THE User Website SHALL display a "Book Appointment" button or form
2. THE Booking System SHALL display a form with fields for patient name, email, phone number, reason for visit, preferred date, preferred time, and payment method
3. THE Booking System SHALL auto-fill the selected dentist information in the booking form
4. WHEN a Patient submits the booking form, THE Booking System SHALL validate all required fields are completed
5. THE Booking System SHALL validate that the email address follows a valid email format
6. THE Booking System SHALL validate that the phone number contains only valid characters
7. THE Booking System SHALL validate that the selected date is not in the past
8. IF validation fails, THEN THE Booking System SHALL display specific error messages for each invalid field

### Requirement 2

**User Story:** As a patient, I want to choose between paying online with Stripe or paying cash at the appointment, so that I have flexible payment options

#### Acceptance Criteria

1. THE Booking System SHALL display payment method options as radio buttons with "Stripe" and "Cash" choices
2. WHEN a Patient selects "Cash" as payment method, THE Booking System SHALL create the appointment with payment status "pending" and payment method "cash"
3. WHEN a Patient selects "Stripe" as payment method, THE Booking System SHALL initiate the Stripe Checkout flow
4. WHEN Stripe payment method is selected, THE Booking System SHALL disable the submit button until Stripe is ready
5. THE Booking System SHALL clearly indicate which payment method is currently selected

### Requirement 3

**User Story:** As a patient, I want to pay for my appointment securely through Stripe, so that I can complete my booking with online payment

#### Acceptance Criteria

1. WHEN a Patient selects Stripe payment and submits the form, THE Payment System SHALL create a Stripe Checkout session
2. THE Payment System SHALL include appointment details (dentist name, date, time, patient name) in the Stripe session metadata
3. WHEN the Stripe session is created, THE User Website SHALL redirect the Patient to the Stripe Checkout page
4. WHEN Stripe payment completes successfully, THE Payment System SHALL update the appointment payment status to "paid"
5. WHEN Stripe payment fails, THE Payment System SHALL update the appointment payment status to "failed"
6. WHEN payment completes, THE User Website SHALL redirect the Patient back to a confirmation page

### Requirement 4

**User Story:** As a patient, I want to see a confirmation message after successfully booking an appointment, so that I know my booking was received

#### Acceptance Criteria

1. WHEN an appointment is successfully created, THE Booking System SHALL display a confirmation message to the Patient
2. THE confirmation message SHALL include the dentist name, appointment date, appointment time, and booking reference
3. WHEN payment method is "cash", THE confirmation message SHALL remind the Patient to bring payment to the appointment
4. WHEN payment method is "stripe" and payment is successful, THE confirmation message SHALL confirm that payment was processed
5. THE Booking System SHALL provide an option to view appointment details or return to the home page

### Requirement 5

**User Story:** As a dentist, I want to view all my appointments in the Dentist Portal, so that I can manage my schedule

#### Acceptance Criteria

1. THE Dentist Portal SHALL display an "Appointments" tab or section in the dashboard
2. WHEN a dentist accesses the Appointments section, THE Backend API SHALL retrieve all appointments for that dentist's email
3. THE Dentist Portal SHALL display appointments in a table or list format showing patient name, date, time, reason, payment method, payment status, and appointment status
4. THE Dentist Portal SHALL sort appointments by date and time with upcoming appointments first
5. THE Dentist Portal SHALL update the appointment list automatically when new appointments are created

### Requirement 6

**User Story:** As a dentist, I want to mark appointments as completed, so that I can track which patients I have seen

#### Acceptance Criteria

1. WHEN a dentist views an appointment in the Dentist Portal, THE Dentist Portal SHALL display a "Mark as Completed" button for pending appointments
2. WHEN a dentist clicks "Mark as Completed", THE Backend API SHALL update the appointment status to "completed"
3. THE Dentist Portal SHALL visually distinguish completed appointments from pending appointments
4. THE Dentist Portal SHALL prevent marking future appointments as completed
5. WHEN an appointment is marked completed, THE Dentist Portal SHALL update the display immediately

### Requirement 7

**User Story:** As a dentist, I want to reschedule appointments, so that I can accommodate changes in my schedule or patient requests

#### Acceptance Criteria

1. WHEN a dentist views an appointment in the Dentist Portal, THE Dentist Portal SHALL display a "Reschedule" button
2. WHEN a dentist clicks "Reschedule", THE Dentist Portal SHALL display a form to select new date and time
3. WHEN a dentist submits the reschedule form, THE Backend API SHALL update the appointment with the new date and time
4. THE Backend API SHALL send a notification to the patient about the rescheduled appointment
5. THE Dentist Portal SHALL update the appointment display with the new date and time immediately

### Requirement 8

**User Story:** As a patient, I want to view my booked appointments, so that I can keep track of my upcoming dental visits

#### Acceptance Criteria

1. THE User Website SHALL provide a "My Appointments" section or page
2. WHEN a Patient accesses "My Appointments", THE Backend API SHALL retrieve all appointments for that patient's email
3. THE User Website SHALL display appointments showing dentist name, date, time, reason, payment method, payment status, and appointment status
4. THE User Website SHALL sort appointments by date with upcoming appointments first
5. THE User Website SHALL allow patients to filter appointments by status (upcoming, completed, cancelled)

### Requirement 9

**User Story:** As a system administrator, I want all appointment data stored securely in the database, so that information is protected and retrievable

#### Acceptance Criteria

1. THE Backend API SHALL store all appointment data in MongoDB with proper schema validation
2. THE Backend API SHALL store patient name, email, phone, dentist email, reason, date, time, payment method, payment status, appointment status, and notes
3. THE Backend API SHALL generate a unique identifier for each appointment
4. THE Backend API SHALL store timestamps for appointment creation and last update
5. THE Backend API SHALL ensure data integrity through database constraints and validation

### Requirement 10

**User Story:** As a developer, I want the backend to provide RESTful API endpoints, so that frontend applications can interact with the booking system

#### Acceptance Criteria

1. THE Backend API SHALL provide a POST endpoint at /appointments to create new appointments
2. THE Backend API SHALL provide a GET endpoint at /appointments/:dentistEmail to retrieve appointments for a specific dentist
3. THE Backend API SHALL provide a PUT endpoint at /appointments/:id to update appointment details
4. THE Backend API SHALL provide a GET endpoint at /appointments/patient/:email to retrieve appointments for a specific patient
5. THE Backend API SHALL provide a POST endpoint at /payments/create-checkout-session to create Stripe payment sessions
6. THE Backend API SHALL return appropriate HTTP status codes (200, 201, 400, 404, 500) for all operations
7. THE Backend API SHALL validate request data and return detailed error messages for invalid requests
8. THE Backend API SHALL implement CORS to allow requests from the User Website and Dentist Portal

### Requirement 11

**User Story:** As a patient, I want the booking form to have a user-friendly date and time picker, so that I can easily select my preferred appointment time

#### Acceptance Criteria

1. THE Booking System SHALL display a calendar picker for date selection
2. THE Booking System SHALL disable past dates in the calendar picker
3. THE Booking System SHALL display a time picker or dropdown for time selection
4. THE Booking System SHALL show available time slots if the system tracks dentist availability
5. THE Booking System SHALL display the selected date and time clearly before form submission

### Requirement 12

**User Story:** As a dentist, I want to see patient contact information in appointment details, so that I can reach out if needed

#### Acceptance Criteria

1. WHEN a dentist views appointment details in the Dentist Portal, THE Dentist Portal SHALL display the patient's email address
2. THE Dentist Portal SHALL display the patient's phone number
3. THE Dentist Portal SHALL format phone numbers in a readable format
4. THE Dentist Portal SHALL provide click-to-call functionality for phone numbers on mobile devices
5. THE Dentist Portal SHALL provide click-to-email functionality for email addresses

### Requirement 13

**User Story:** As a patient, I want to receive error messages if my booking fails, so that I understand what went wrong and can try again

#### Acceptance Criteria

1. WHEN appointment creation fails, THE Booking System SHALL display a user-friendly error message
2. WHEN Stripe payment fails, THE Payment System SHALL display the failure reason to the Patient
3. WHEN network errors occur, THE Booking System SHALL display a message indicating connection issues
4. THE Booking System SHALL provide a "Try Again" option when errors occur
5. THE Booking System SHALL log errors to the backend for debugging purposes

### Requirement 14

**User Story:** As a developer, I want the system to have proper loading states, so that users know when operations are in progress

#### Acceptance Criteria

1. WHEN a Patient submits a booking form, THE User Website SHALL display a loading indicator
2. WHEN the Dentist Portal fetches appointments, THE Dentist Portal SHALL display a loading indicator
3. WHEN Stripe Checkout is being initialized, THE Booking System SHALL display a loading message
4. THE User Website SHALL disable form submission buttons during processing to prevent duplicate submissions
5. THE Dentist Portal SHALL disable action buttons during API calls to prevent duplicate operations

### Requirement 15

**User Story:** As a system administrator, I want the system to handle concurrent bookings gracefully, so that double-booking is prevented

#### Acceptance Criteria

1. WHEN multiple patients attempt to book the same time slot simultaneously, THE Backend API SHALL process requests sequentially
2. THE Backend API SHALL check for existing appointments at the requested time before creating new appointments
3. IF a time slot is already booked, THEN THE Backend API SHALL return an error indicating the slot is unavailable
4. THE Backend API SHALL use database transactions to ensure atomicity of booking operations
5. THE Booking System SHALL suggest alternative time slots when the requested slot is unavailable
