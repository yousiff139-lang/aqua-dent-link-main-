# Requirements Document

## Introduction

This feature introduces an intelligent chatbot-driven booking system that guides patients through the appointment booking process. When a user books an appointment with a specific dentist, the chatbot automatically engages to collect essential information including symptoms, medical documents, and preferred appointment times. The system generates structured summaries for dentists and manages the complete booking lifecycle including cancellation policies.

## Glossary

- **Booking System**: The software component that manages appointment scheduling between patients and dentists
- **Chatbot Interface**: The conversational UI component that interacts with patients during the booking process
- **Patient**: A user who books appointments with dentists
- **Dentist**: A healthcare provider who receives and reviews booking requests
- **Booking Summary**: A structured document (PDF/Word) containing patient information and appointment details
- **Appointment Sheet**: A tabular record containing key patient and appointment information
- **Dentist Dashboard**: The interface where dentists view and manage their appointments
- **Patient Dashboard**: The interface where patients view and manage their bookings
- **Cancellation Window**: The minimum time period before an appointment during which cancellation is not permitted (1 hour)

## Requirements

### Requirement 1

**User Story:** As a patient, I want the chatbot to automatically engage when I book with a specific dentist, so that I can provide necessary information through a guided conversation

#### Acceptance Criteria

1. WHEN a Patient initiates a booking with a specific dentist, THE Booking System SHALL activate the Chatbot Interface
2. THE Chatbot Interface SHALL collect the patient's phone number through conversational prompts
3. THE Chatbot Interface SHALL collect the patient's symptoms or reason for visit through conversational prompts
4. THE Chatbot Interface SHALL provide an option for the Patient to upload previous medical documents
5. THE Chatbot Interface SHALL display available appointment times for the selected dentist
6. THE Chatbot Interface SHALL request confirmation from the Patient before finalizing the booking

### Requirement 1A

**User Story:** As a patient who is uncertain about my symptoms, I want the chatbot to help me describe my condition without forcing me to know the exact cause, so that I can still book an appointment and receive appropriate care

#### Acceptance Criteria

1. WHEN a Patient describes a symptom without specifying a cause, THE Chatbot Interface SHALL suggest possible causes based on the symptom description
2. WHEN a Patient responds with uncertainty indicators such as "I don't know", "not sure", or provides no specific answer, THE Chatbot Interface SHALL record the symptom with a note indicating uncertainty
3. THE Chatbot Interface SHALL NOT repeatedly ask the Patient to identify the cause after uncertainty is expressed
4. WHEN uncertainty is detected, THE Chatbot Interface SHALL store a summary note in the format "Patient reports [symptom] but is unsure of the cause"
5. THE Chatbot Interface SHALL respond empathetically when uncertainty is detected with messages such as "It's okay not to know, the dentist can help find the cause"
6. WHEN uncertainty is recorded, THE Chatbot Interface SHALL suggest booking an appointment to allow professional diagnosis
7. THE Booking System SHALL transmit the uncertainty note to the Dentist Dashboard as part of the appointment summary
8. THE Dentist Dashboard SHALL display the uncertainty note prominently in the patient's appointment details

### Requirement 2

**User Story:** As a patient, I want to see available appointment times during the booking process, so that I can choose a convenient time slot

#### Acceptance Criteria

1. WHEN the Chatbot Interface collects initial patient information, THE Booking System SHALL retrieve available time slots for the selected dentist
2. THE Chatbot Interface SHALL display available appointment times in a clear, selectable format
3. WHEN a Patient selects a time slot, THE Booking System SHALL temporarily reserve that slot for 5 minutes
4. THE Booking System SHALL release the temporary reservation if the Patient does not confirm within 5 minutes

### Requirement 3

**User Story:** As a patient, I want to cancel my appointment from my dashboard, so that I can manage my schedule flexibly

#### Acceptance Criteria

1. THE Patient Dashboard SHALL display all upcoming appointments with cancellation options
2. WHEN a Patient requests cancellation more than 1 hour before the appointment time, THE Booking System SHALL process the cancellation
3. WHEN a Patient requests cancellation within 1 hour of the appointment time, THE Booking System SHALL reject the cancellation request
4. WHEN a cancellation is processed, THE Booking System SHALL notify the dentist and release the time slot
5. THE Booking System SHALL update the appointment status to "cancelled" in the database

### Requirement 4

**User Story:** As a dentist, I want to receive structured booking summaries, so that I can review patient information before appointments

#### Acceptance Criteria

1. WHEN a Patient confirms a booking, THE Booking System SHALL generate a Booking Summary document in PDF format
2. THE Booking Summary SHALL include patient phone number, symptoms, uploaded documents, appointment time, and patient contact information
3. THE Booking System SHALL store the Booking Summary in the database linked to the appointment record
4. THE Booking System SHALL make the Booking Summary accessible through the Dentist Dashboard
5. THE Booking Summary SHALL include links or references to any medical documents uploaded by the Patient

### Requirement 5

**User Story:** As a dentist, I want to see appointment details in a structured sheet format, so that I can quickly scan patient information

#### Acceptance Criteria

1. WHEN a booking is confirmed, THE Booking System SHALL create an Appointment Sheet record
2. THE Appointment Sheet SHALL include patient name, phone number, age, gender, symptoms summary, appointment time, and document references
3. THE Dentist Dashboard SHALL display the Appointment Sheet in a tabular format
4. THE Dentist Dashboard SHALL allow the dentist to click on entries to view detailed Booking Summary documents
5. THE Appointment Sheet SHALL update in real-time when bookings are modified or cancelled

### Requirement 6

**User Story:** As a dentist, I want to view detailed patient information from my dashboard, so that I can prepare for appointments

#### Acceptance Criteria

1. THE Dentist Dashboard SHALL display all upcoming appointments in chronological order
2. WHEN a dentist clicks on an appointment, THE Dentist Dashboard SHALL display the full Booking Summary
3. THE Dentist Dashboard SHALL provide access to view or download any medical documents uploaded by the Patient
4. THE Dentist Dashboard SHALL indicate which appointments have uploaded documents with a visual indicator
5. THE Dentist Dashboard SHALL allow the dentist to add private notes to appointment records

### Requirement 7

**User Story:** As a system administrator, I want all booking data stored securely in the database, so that patient information is protected and retrievable

#### Acceptance Criteria

1. THE Booking System SHALL store all appointment data in the database with encryption for sensitive fields
2. THE Booking System SHALL store uploaded medical documents securely with access controls
3. THE Booking System SHALL maintain an audit log of all booking actions including creation, modification, and cancellation
4. THE Booking System SHALL associate each booking with the correct Patient and Dentist records
5. THE Booking System SHALL ensure data integrity through database constraints and validation

### Requirement 8

**User Story:** As a patient, I want to receive confirmation after booking, so that I know my appointment is scheduled

#### Acceptance Criteria

1. WHEN a booking is confirmed, THE Booking System SHALL display a confirmation message to the Patient
2. THE Booking System SHALL send a confirmation notification to the Patient with appointment details
3. THE confirmation SHALL include the dentist name, appointment time, location, and cancellation policy
4. THE Booking System SHALL provide a booking reference number for the Patient
5. THE Patient Dashboard SHALL immediately reflect the new appointment
