-- Migration: Add chatbot uncertainty handling fields to appointments table
-- This migration adds fields to support intelligent chatbot behavior when patients
-- are uncertain about the cause of their symptoms

-- Add new fields to appointments table for chatbot booking system
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS chief_complaint TEXT,
  ADD COLUMN IF NOT EXISTS cause_identified BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS uncertainty_note TEXT,
  ADD COLUMN IF NOT EXISTS booking_summary_url TEXT,
  ADD COLUMN IF NOT EXISTS excel_sheet_url TEXT,
  ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS conversation_id UUID,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Add comment to explain the uncertainty fields
COMMENT ON COLUMN public.appointments.cause_identified IS 
  'Indicates whether the patient knows the cause of their symptoms. False when patient responds with uncertainty (e.g., "I don''t know", "not sure")';

COMMENT ON COLUMN public.appointments.uncertainty_note IS 
  'Stores a note when patient is uncertain about cause, e.g., "Patient reports tooth pain but is unsure of the cause"';

COMMENT ON COLUMN public.appointments.booking_reference IS 
  'Unique alphanumeric reference code for the booking';

-- Create index on booking_reference for quick lookups
CREATE INDEX IF NOT EXISTS idx_appointments_booking_reference 
  ON public.appointments(booking_reference) 
  WHERE booking_reference IS NOT NULL;

-- Create index on conversation_id for chatbot conversation lookups
CREATE INDEX IF NOT EXISTS idx_appointments_conversation_id 
  ON public.appointments(conversation_id) 
  WHERE conversation_id IS NOT NULL;

-- Update RLS policies to ensure dentists can see uncertainty notes
-- (The existing policies already cover this, but we'll add a comment for clarity)
COMMENT ON POLICY "Dentists can view their appointments" ON public.appointments IS 
  'Dentists can view all appointment details including uncertainty notes for their patients';
