-- Migration: Fix appointments table RLS policies
-- This migration consolidates and fixes RLS policies for the appointments table

-- ============================================================================
-- CLEAN UP EXISTING POLICIES
-- ============================================================================

-- Drop all existing policies on appointments table
DROP POLICY IF EXISTS "Deny anonymous access to appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can update their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can view appointments by email" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can update their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can view their own bookings" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can update all appointments" ON public.appointments;

-- ============================================================================
-- CREATE CONSOLIDATED RLS POLICIES
-- ============================================================================

-- Policy: Patients can view their own appointments
CREATE POLICY "Patients can view own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = patient_id
  );

-- Policy: Patients can create their own appointments
CREATE POLICY "Patients can create appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = patient_id
  );

-- Policy: Patients can update their own appointments (limited fields)
CREATE POLICY "Patients can update own appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = patient_id
  )
  WITH CHECK (
    auth.uid() = patient_id
  );

-- Policy: Patients can delete their own appointments (only if not completed)
CREATE POLICY "Patients can delete own appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = patient_id
    AND status != 'completed'
  );

-- Policy: Dentists can view appointments assigned to them (by dentist_id)
CREATE POLICY "Dentists can view their appointments by id"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = dentist_id 
    AND public.has_role(auth.uid(), 'dentist'::public.app_role)
  );

-- Policy: Dentists can view appointments by their email (for legacy support)
CREATE POLICY "Dentists can view appointments by email"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    dentist_email IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = appointments.dentist_email
    )
    AND public.has_role(auth.uid(), 'dentist'::public.app_role)
  );

-- Policy: Dentists can update their appointments
CREATE POLICY "Dentists can update their appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = dentist_id OR 
     EXISTS (
       SELECT 1 FROM auth.users
       WHERE auth.users.id = auth.uid()
       AND auth.users.email = appointments.dentist_email
     ))
    AND public.has_role(auth.uid(), 'dentist'::public.app_role)
  )
  WITH CHECK (
    (auth.uid() = dentist_id OR 
     EXISTS (
       SELECT 1 FROM auth.users
       WHERE auth.users.id = auth.uid()
       AND auth.users.email = appointments.dentist_email
     ))
    AND public.has_role(auth.uid(), 'dentist'::public.app_role)
  );

-- Policy: Admins can view all appointments
CREATE POLICY "Admins can view all appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Policy: Admins can manage all appointments
CREATE POLICY "Admins can manage all appointments"
  ON public.appointments FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- ============================================================================
-- VERIFY RLS IS ENABLED
-- ============================================================================

-- Ensure RLS is enabled on appointments table
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;

-- ============================================================================
-- ADD HELPFUL COMMENTS
-- ============================================================================

COMMENT ON POLICY "Patients can view own appointments" ON public.appointments IS 
  'Allows patients to view only their own appointments';

COMMENT ON POLICY "Patients can create appointments" ON public.appointments IS 
  'Allows patients to create appointments for themselves';

COMMENT ON POLICY "Patients can update own appointments" ON public.appointments IS 
  'Allows patients to update their own appointments (e.g., cancel, add notes)';

COMMENT ON POLICY "Patients can delete own appointments" ON public.appointments IS 
  'Allows patients to delete their own appointments if not completed';

COMMENT ON POLICY "Dentists can view their appointments by id" ON public.appointments IS 
  'Allows dentists to view appointments assigned to them by dentist_id';

COMMENT ON POLICY "Dentists can view appointments by email" ON public.appointments IS 
  'Allows dentists to view appointments assigned to them by email (legacy support)';

COMMENT ON POLICY "Dentists can update their appointments" ON public.appointments IS 
  'Allows dentists to update appointments assigned to them';

COMMENT ON POLICY "Admins can view all appointments" ON public.appointments IS 
  'Allows admins to view all appointments in the system';

COMMENT ON POLICY "Admins can manage all appointments" ON public.appointments IS 
  'Allows admins full access to manage all appointments';
