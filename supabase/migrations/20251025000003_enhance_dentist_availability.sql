-- Migration: Enhance dentist_availability table for chatbot booking system
-- This migration adds slot_duration_minutes field and optimizes indexes for scheduling

-- Add slot_duration_minutes column to dentist_availability table
ALTER TABLE public.dentist_availability 
  ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER DEFAULT 30 CHECK (slot_duration_minutes > 0);

-- Add comment to explain the new field
COMMENT ON COLUMN public.dentist_availability.slot_duration_minutes IS 
  'Duration of each appointment slot in minutes. Default is 30 minutes. Used to calculate available time slots.';

-- Update table comment to reflect enhanced functionality
COMMENT ON TABLE public.dentist_availability IS 
  'Stores dentist weekly availability schedule with configurable slot durations for appointment booking';

-- Create optimized indexes for scheduling queries
-- Index on dentist_id for quick dentist lookup
CREATE INDEX IF NOT EXISTS idx_dentist_availability_dentist_id 
  ON public.dentist_availability(dentist_id);

-- Index on day_of_week for filtering by day
CREATE INDEX IF NOT EXISTS idx_dentist_availability_day_of_week 
  ON public.dentist_availability(day_of_week);

-- Composite index on dentist_id and day_of_week for efficient scheduling queries
CREATE INDEX IF NOT EXISTS idx_dentist_availability_dentist_day 
  ON public.dentist_availability(dentist_id, day_of_week);

-- Index on is_available for filtering active availability
CREATE INDEX IF NOT EXISTS idx_dentist_availability_is_available 
  ON public.dentist_availability(is_available) 
  WHERE is_available = true;

-- Composite index for complete scheduling queries
CREATE INDEX IF NOT EXISTS idx_dentist_availability_scheduling 
  ON public.dentist_availability(dentist_id, day_of_week, is_available) 
  WHERE is_available = true;

-- Update RLS policies to ensure proper access control
-- Drop existing policies if they need updating
DROP POLICY IF EXISTS "Anyone can view availability" ON public.dentist_availability;
DROP POLICY IF EXISTS "Dentists can manage their own availability" ON public.dentist_availability;

-- RLS Policy: Anyone (authenticated users) can view dentist availability
CREATE POLICY "Authenticated users can view availability"
  ON public.dentist_availability FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Public (unauthenticated) users can view dentist availability
CREATE POLICY "Public can view availability"
  ON public.dentist_availability FOR SELECT
  TO anon
  USING (is_available = true);

-- RLS Policy: Dentists can insert their own availability
CREATE POLICY "Dentists can insert own availability"
  ON public.dentist_availability FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = dentist_id 
    AND public.has_role(auth.uid(), 'dentist'::app_role)
  );

-- RLS Policy: Dentists can update their own availability
CREATE POLICY "Dentists can update own availability"
  ON public.dentist_availability FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = dentist_id 
    AND public.has_role(auth.uid(), 'dentist'::app_role)
  );

-- RLS Policy: Dentists can delete their own availability
CREATE POLICY "Dentists can delete own availability"
  ON public.dentist_availability FOR DELETE
  TO authenticated
  USING (
    auth.uid() = dentist_id 
    AND public.has_role(auth.uid(), 'dentist'::app_role)
  );

-- RLS Policy: Admins can manage all availability
CREATE POLICY "Admins can manage all availability"
  ON public.dentist_availability FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Grant necessary permissions
GRANT SELECT ON public.dentist_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dentist_availability TO authenticated;

