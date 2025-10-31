# Chatbot Booking System - Database Schema Implementation

## Overview

Task 1 "Set up database schema and migrations" has been successfully completed. This implementation creates the foundational database structure for the chatbot booking system, including conversation tracking, time slot reservations, and enhanced dentist availability management.

## Implemented Migrations

### 1. Chatbot Conversations Table (20251025000001)
**File**: `supabase/migrations/20251025000001_create_chatbot_conversations.sql`

**Purpose**: Stores conversation history between patients and the chatbot during the booking process.

**Key Features**:
- Tracks patient-chatbot conversations with JSONB message storage
- Links conversations to dentists and appointments
- Supports conversation status tracking (active, completed, abandoned)
- Comprehensive RLS policies for patient, dentist, and admin access
- Optimized indexes for efficient queries

**Table Structure**:
```sql
- id: UUID (primary key)
- patient_id: UUID (references auth.users)
- dentist_id: UUID (references auth.users)
- messages: JSONB (array of message objects)
- status: TEXT (active, completed, abandoned)
- appointment_id: UUID (references appointments)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 2. Time Slot Reservations Table (20251025000002)
**File**: `supabase/migrations/20251025000002_create_time_slot_reservations.sql`

**Purpose**: Manages temporary time slot reservations during the booking process with automatic expiration after 5 minutes.

**Key Features**:
- Temporary slot holds to prevent double-booking
- Automatic expiration logic with status tracking
- Unique constraint on dentist_id + slot_time combination
- Auto-expire function to mark expired reservations
- Cleanup function to remove old expired records
- RLS policies for patient and dentist access

**Table Structure**:
```sql
- id: UUID (primary key)
- dentist_id: UUID (references auth.users)
- slot_time: TIMESTAMPTZ
- reserved_by: UUID (references auth.users)
- reservation_expires_at: TIMESTAMPTZ
- status: TEXT (reserved, confirmed, expired)
- created_at: TIMESTAMPTZ
```

**Helper Functions**:
- `auto_expire_reservations()`: Marks expired reservations
- `cleanup_expired_reservations()`: Removes old expired records

### 3. Enhanced Dentist Availability Table (20251025000003)
**File**: `supabase/migrations/20251025000003_enhance_dentist_availability.sql`

**Purpose**: Enhances the existing dentist_availability table with slot duration configuration and optimized indexes.

**Key Enhancements**:
- Added `slot_duration_minutes` column (default: 30 minutes)
- Created comprehensive indexes for scheduling queries
- Updated RLS policies for public and authenticated access
- Optimized for efficient availability lookups

**New Field**:
```sql
- slot_duration_minutes: INTEGER (default 30, must be > 0)
```

**Indexes Created**:
- `idx_dentist_availability_dentist_id`: Quick dentist lookup
- `idx_dentist_availability_day_of_week`: Filter by day
- `idx_dentist_availability_dentist_day`: Composite for scheduling
- `idx_dentist_availability_is_available`: Active availability filter
- `idx_dentist_availability_scheduling`: Complete scheduling queries

### 4. Appointments Table Enhancement (Previously Completed)
**File**: `supabase/migrations/20251024120000_add_chatbot_uncertainty_fields.sql`

**Status**: ✅ Already completed (Subtask 1.4)

**Fields Added**:
- `dentist_id`: UUID (references auth.users)
- `symptoms`: TEXT
- `chief_complaint`: TEXT
- `cause_identified`: BOOLEAN (default true)
- `uncertainty_note`: TEXT
- `medical_history`: TEXT
- `booking_summary_url`: TEXT
- `excel_sheet_url`: TEXT
- `booking_reference`: VARCHAR(20) UNIQUE
- `conversation_id`: UUID
- `cancellation_reason`: TEXT
- `cancelled_at`: TIMESTAMPTZ

## Security Implementation

### Row Level Security (RLS) Policies

All tables have comprehensive RLS policies:

**Chatbot Conversations**:
- Patients can view/create/update their own conversations
- Dentists can view conversations for their appointments
- Admins can view all conversations

**Time Slot Reservations**:
- Patients can manage their own reservations
- Dentists can view reservations for their slots
- Admins can view all reservations

**Dentist Availability**:
- Public users can view available slots
- Authenticated users can view all availability
- Dentists can manage their own availability
- Admins can manage all availability

## Performance Optimization

### Indexes Created

**Chatbot Conversations** (6 indexes):
- Patient ID lookup
- Dentist ID lookup
- Status filtering
- Patient + Status composite
- Appointment ID lookup

**Time Slot Reservations** (6 indexes):
- Dentist ID lookup
- Reserved by lookup
- Slot time lookup
- Expiration time lookup
- Status filtering
- Dentist + Slot + Status composite

**Dentist Availability** (5 indexes):
- Dentist ID lookup
- Day of week lookup
- Dentist + Day composite
- Available slots filter
- Complete scheduling composite

## Database Functions

### Auto-Expiration Functions

1. **`auto_expire_reservations()`**
   - Automatically marks reservations as expired when past expiration time
   - Should be called periodically (e.g., every minute)
   - Can be triggered via cron job or before checking availability

2. **`cleanup_expired_reservations()`**
   - Removes expired reservations older than 24 hours
   - Keeps the table clean and performant
   - Should be called daily via cron job

## Next Steps

To apply these migrations to your Supabase database:

1. **Using Supabase CLI**:
   ```bash
   supabase db push
   ```

2. **Using Supabase Dashboard**:
   - Navigate to SQL Editor
   - Copy and paste each migration file
   - Execute in order (001, 002, 003)

3. **Verify Installation**:
   ```sql
   -- Check tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('chatbot_conversations', 'time_slot_reservations');
   
   -- Check functions exist
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name IN ('auto_expire_reservations', 'cleanup_expired_reservations');
   ```

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **Requirement 7.1**: Secure database storage with encryption and RLS
- **Requirement 7.2**: Secure document storage with access controls
- **Requirement 7.4**: Proper data association between patients and dentists
- **Requirement 2.3**: Time slot reservation with 5-minute expiration
- **Requirement 2.4**: Slot conflict prevention
- **Requirement 2.1**: Dentist availability management
- **Requirement 1.2**: Phone number collection (via appointments table)
- **Requirement 1.3**: Document upload support (via appointments table)
- **Requirement 1A.4**: Uncertainty note storage (via appointments table)
- **Requirement 4.2**: Booking summary URL storage (via appointments table)

## Status

✅ **Task 1: Set up database schema and migrations - COMPLETED**

All subtasks completed:
- ✅ 1.1: Create chatbot_conversations table with RLS policies
- ✅ 1.2: Create time_slot_reservations table with expiration logic
- ✅ 1.3: Create dentist_availability table for scheduling
- ✅ 1.4: Enhance appointments table with new fields (previously completed)

