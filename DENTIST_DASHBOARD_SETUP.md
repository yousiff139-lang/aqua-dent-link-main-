# Dentist Dashboard Setup Guide

## Overview
The dentist dashboard allows dentists to view and manage patient appointments, including detailed patient information, symptoms, and documents shared through the chatbot.

## Features Implemented

### 1. Enhanced Dentist Dashboard
- **Patient Appointments View**: See all appointments with detailed patient information
- **Patient Details**: Full name, email, phone number
- **Appointment Information**: Date, time, type, status
- **Symptoms & Chief Complaints**: View patient-reported symptoms
- **AI Recommendations**: See which appointments were recommended by the AI chatbot
- **Status Management**: Mark appointments as completed or cancelled
- **Availability Management**: Set and manage clinic hours

### 2. Detailed Appointment View
When clicking "View Details" on any appointment, dentists can see:
- Complete patient contact information
- Appointment date, time, and type
- Patient symptoms and chief complaints
- Medical history (if provided)
- Patient notes
- AI recommendation badge (if applicable)
- Action buttons to update appointment status

### 3. Dashboard Statistics
- Total appointments count
- Today's appointments
- Upcoming appointments
- Available time slots

## Setup Instructions

### Step 1: Run Database Migration
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the migration file: `supabase/migrations/20251018000001_add_documents_and_dentist_account.sql`

This migration will:
- Add document support to appointments
- Create appointment_documents table
- Add patient_notes and medical_history columns
- Set up automatic dentist role assignment for your email

### Step 2: Grant Dentist Role to Your Account

**Option A: If you haven't signed up yet**
1. Sign up with the email: `karrarmayaly@gmail.com`
2. The system will automatically grant you dentist privileges

**Option B: If you already have an account**
1. Go to Supabase SQL Editor
2. Open the file `grant_dentist_role.sql`
3. Uncomment and run the all-in-one script at the bottom
4. This will grant dentist role and create your dentist profile

### Step 3: Access the Dentist Dashboard
1. Log in with your account: `karrarmayaly@gmail.com`
2. Navigate to `/dentist-dashboard` in your application
3. You should now see the dentist dashboard with all appointments

## How Appointments Work

### Patient Booking via Chatbot
When a patient books an appointment through the AI chatbot:
1. The chatbot collects patient symptoms and preferences
2. AI recommends suitable dentists based on specialization
3. Appointment is created with `recommended_by_ai = true`
4. Appointment includes patient symptoms and notes
5. Dentist receives the appointment in their dashboard

### Patient Booking Manually
When a patient books directly:
1. Patient selects a dentist from the dentists page
2. Clicks "Book with [Dentist Name]"
3. Fills out appointment form
4. Appointment appears in dentist dashboard

### Document Sharing (Future Enhancement)
The system is prepared for document uploads:
- Patients can upload documents via chatbot
- Documents are stored in `appointment_documents` table
- Dentists can view and download documents in appointment details
- Supported file types: PDF, images, medical records

## Database Schema

### Appointments Table
```sql
- id: UUID
- patient_id: UUID (references auth.users)
- dentist_id: UUID (references dentists)
- appointment_date: TIMESTAMPTZ
- appointment_type: TEXT
- status: TEXT (upcoming/completed/cancelled)
- symptoms: TEXT
- patient_notes: TEXT
- medical_history: TEXT
- recommended_by_ai: BOOLEAN
- notes: TEXT
```

### Dentists Table
```sql
- id: UUID (references profiles)
- specialization: TEXT
- bio: TEXT
- years_of_experience: INTEGER
- rating: DECIMAL
```

### User Roles Table
```sql
- user_id: UUID
- role: app_role (patient/dentist/admin)
```

## Testing the System

### Test Scenario 1: View Existing Appointments
1. Log in as dentist
2. Navigate to dentist dashboard
3. View list of all appointments
4. Click "View Details" on any appointment

### Test Scenario 2: Update Appointment Status
1. Open an appointment with "upcoming" status
2. Click "Mark as Completed"
3. Verify status updates in the list

### Test Scenario 3: Manage Availability
1. Go to "Availability" tab
2. Click "Add Slot"
3. New availability slot is created
4. Click "Remove" to delete a slot

## Additional Features You Can Add

1. **Document Upload**: Implement file upload in chatbot
2. **Appointment Notes**: Allow dentists to add treatment notes
3. **Patient History**: View all past appointments for a patient
4. **Calendar View**: Visual calendar for appointments
5. **Notifications**: Email/SMS notifications for new appointments
6. **Video Consultations**: Integrate video call functionality
7. **Prescription Management**: Create and send prescriptions
8. **Treatment Plans**: Create multi-visit treatment plans

## Troubleshooting

### Can't Access Dentist Dashboard
- Verify you're logged in with `karrarmayaly@gmail.com`
- Check if dentist role is granted (run query in SQL Editor)
- Ensure migration has been run successfully

### Appointments Not Showing
- Verify appointments have `dentist_id` set to your user ID
- Check RLS policies are correctly configured
- Ensure appointments table has the required columns

### Need Help?
Check the browser console for error messages and verify:
1. Database migrations are applied
2. User has dentist role
3. Appointments have correct dentist_id
4. RLS policies allow dentist access
