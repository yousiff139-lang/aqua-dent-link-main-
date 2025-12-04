-- ============================================================================
-- FIX PROFILES RLS INFINITE RECURSION
-- This migration fixes the infinite recursion error in profiles RLS policies
-- ============================================================================

-- Drop all existing policies on profiles table
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Dentists can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Dentists can update their own profile" ON public.profiles;

-- Create simple, non-recursive policies for profiles
-- Users can view their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id OR auth.uid() = user_id);

-- Admins can view all profiles (using direct role check, not function)
CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Admins can update all profiles
CREATE POLICY "profiles_update_admin"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Public can view dentist profiles (for booking system)
CREATE POLICY "profiles_select_dentists_public"
  ON public.profiles
  FOR SELECT
  USING (role = 'dentist');

-- ============================================================================
-- FIX DENTISTS TABLE RLS POLICIES
-- Remove any policies that might reference profiles recursively
-- ============================================================================

-- Drop existing dentists policies
DROP POLICY IF EXISTS "dentists_select_policy" ON public.dentists;
DROP POLICY IF EXISTS "dentists_insert_policy" ON public.dentists;
DROP POLICY IF EXISTS "dentists_update_policy" ON public.dentists;
DROP POLICY IF EXISTS "Dentists can view their own data" ON public.dentists;
DROP POLICY IF EXISTS "Dentists can update their own data" ON public.dentists;
DROP POLICY IF EXISTS "Admin can manage dentists" ON public.dentists;

-- Create simple, non-recursive policies for dentists
-- Public can view all dentists (for booking)
CREATE POLICY "dentists_select_public"
  ON public.dentists
  FOR SELECT
  USING (true);

-- Dentists can update their own data
CREATE POLICY "dentists_update_own"
  ON public.dentists
  FOR UPDATE
  USING (
    id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid()
      AND role = 'dentist'
    )
  );

-- Admins can manage all dentists
CREATE POLICY "dentists_admin_all"
  ON public.dentists
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ============================================================================
-- FIX APPOINTMENTS TABLE RLS POLICIES
-- Ensure no recursive references
-- ============================================================================

-- Drop existing appointments policies
DROP POLICY IF EXISTS "appointments_select_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_policy" ON public.appointments;
DROP POLICY IF EXISTS "Users can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can update their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admin can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow anonymous booking" ON public.appointments;
DROP POLICY IF EXISTS "Allow authenticated booking" ON public.appointments;

-- Create simple, non-recursive policies for appointments
-- Allow anyone to create appointments (for guest booking)
CREATE POLICY "appointments_insert_all"
  ON public.appointments
  FOR INSERT
  WITH CHECK (true);

-- Users can view their own appointments
CREATE POLICY "appointments_select_own"
  ON public.appointments
  FOR SELECT
  USING (
    patient_id = auth.uid()
    OR patient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Dentists can view their appointments
CREATE POLICY "appointments_select_dentist"
  ON public.appointments
  FOR SELECT
  USING (
    dentist_id IN (
      SELECT id FROM public.dentists d
      INNER JOIN public.profiles p ON d.id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Dentists can update their appointments
CREATE POLICY "appointments_update_dentist"
  ON public.appointments
  FOR UPDATE
  USING (
    dentist_id IN (
      SELECT id FROM public.dentists d
      INNER JOIN public.profiles p ON d.id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Admins can view all appointments
CREATE POLICY "appointments_select_admin"
  ON public.appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Admins can update all appointments
CREATE POLICY "appointments_update_admin"
  ON public.appointments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ PROFILES RLS RECURSION FIX APPLIED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Changes Made:';
    RAISE NOTICE '   1. Removed recursive is_admin() function calls';
    RAISE NOTICE '   2. Simplified profiles RLS policies';
    RAISE NOTICE '   3. Fixed dentists table policies';
    RAISE NOTICE '   4. Fixed appointments table policies';
    RAISE NOTICE '   5. Enabled public access for dentist viewing';
    RAISE NOTICE '   6. Enabled guest booking for appointments';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Next Steps:';
    RAISE NOTICE '   1. Run: npm run verify:schema';
    RAISE NOTICE '   2. Run: npm run test:db';
    RAISE NOTICE '   3. Test the booking flow';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $;
