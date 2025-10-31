-- Migration: Fix appointment status constraint to include 'upcoming'
-- This migration fixes the status constraint conflict

-- ============================================================================
-- FIX APPOINTMENTS STATUS CONSTRAINT
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE public.appointments 
  DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Add new constraint that includes both 'upcoming' and 'confirmed' for compatibility
ALTER TABLE public.appointments 
  ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled'));

-- Update any 'pending' status to 'upcoming' for consistency with the codebase
UPDATE public.appointments 
SET status = 'upcoming' 
WHERE status = 'pending';

-- Update any 'confirmed' status to 'upcoming' for consistency
UPDATE public.appointments 
SET status = 'upcoming' 
WHERE status = 'confirmed';

-- Add comment
COMMENT ON CONSTRAINT appointments_status_check ON public.appointments IS 
  'Allows status values: pending, confirmed, upcoming, completed, cancelled. Primary status is "upcoming" for future appointments.';

-- ============================================================================
-- ADD INDEX FOR BETTER QUERY PERFORMANCE
-- ============================================================================

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- Create composite index for common query pattern (patient_id + status)
CREATE INDEX IF NOT EXISTS idx_appointments_patient_status ON public.appointments(patient_id, status);

-- Create composite index for dentist queries
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_status ON public.appointments(dentist_id, status);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the constraint is correct
DO $$
BEGIN
  -- Test that 'upcoming' is allowed
  PERFORM 1 FROM pg_constraint 
  WHERE conname = 'appointments_status_check' 
  AND conrelid = 'public.appointments'::regclass;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Constraint appointments_status_check not found!';
  END IF;
  
  RAISE NOTICE 'Constraint successfully updated to include upcoming status';
END $$;
