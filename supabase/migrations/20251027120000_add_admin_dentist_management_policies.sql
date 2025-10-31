-- Migration: Add RLS policies for admin access to dentist data
-- This migration adds policies allowing admin users (identified by email) to manage dentist availability
-- and view all dentist-related data for the admin dashboard

-- ============================================================================
-- DENTIST_AVAILABILITY TABLE - Admin Management Policies
-- ============================================================================

-- Drop existing admin policy if it exists (to recreate with email-based check)
DROP POLICY IF EXISTS "Admins can manage all availability" ON public.dentist_availability;

-- Policy: Admins (by email) can manage all dentist availability
-- This allows admins to add, update, and delete availability slots for any dentist
CREATE POLICY "Admins can manage all availability"
  ON public.dentist_availability FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('karrarmayaly@gmail.com', 'bingo@gmail.com')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('karrarmayaly@gmail.com', 'bingo@gmail.com')
    )
  );

-- ============================================================================
-- APPOINTMENTS TABLE - Enhanced Admin Policies
-- ============================================================================

-- Ensure admins can view all appointments (policy may already exist from previous migration)
-- Drop and recreate to ensure consistency
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;

CREATE POLICY "Admins can view all appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('karrarmayaly@gmail.com', 'bingo@gmail.com')
    )
  );

-- Policy: Admins can update appointments (for management purposes)
DROP POLICY IF EXISTS "Admins can update all appointments" ON public.appointments;

CREATE POLICY "Admins can update all appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('karrarmayaly@gmail.com', 'bingo@gmail.com')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('karrarmayaly@gmail.com', 'bingo@gmail.com')
    )
  );

-- ============================================================================
-- DENTISTS TABLE - Admin View Policies
-- ============================================================================

-- Ensure admins can view all dentists
DROP POLICY IF EXISTS "Admins can view all dentists" ON public.dentists;

CREATE POLICY "Admins can view all dentists"
  ON public.dentists FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('karrarmayaly@gmail.com', 'bingo@gmail.com')
    )
  );

-- ============================================================================
-- PROFILES TABLE - Admin View Policies
-- ============================================================================

-- Ensure admins can view all profiles (needed to get dentist and patient information)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('karrarmayaly@gmail.com', 'bingo@gmail.com')
    )
  );

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Admins can manage all availability" ON public.dentist_availability IS
  'Allows admin users (karrarmayaly@gmail.com, bingo@gmail.com) to manage availability for all dentists';

COMMENT ON POLICY "Admins can view all appointments" ON public.appointments IS
  'Allows admin users to view all appointments for dentist management dashboard';

COMMENT ON POLICY "Admins can update all appointments" ON public.appointments IS
  'Allows admin users to update appointments for management purposes';

COMMENT ON POLICY "Admins can view all dentists" ON public.dentists IS
  'Allows admin users to view all dentist profiles for management dashboard';

COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS
  'Allows admin users to view all user profiles for dentist and patient information';
