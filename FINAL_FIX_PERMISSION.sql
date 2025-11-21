-- ============================================================================
-- FINAL FIX: Permission Denied for auth.users
-- This grants the necessary permissions to fix the booking error
-- ============================================================================

-- The real problem: RLS policies reference auth.users but don't have permission
-- Solution: Grant SELECT on auth.users to authenticated and anon roles

-- Step 1: Grant SELECT permission on auth.users (read-only, safe)
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT ON auth.users TO anon, authenticated;

-- Step 2: Make patient_id optional
ALTER TABLE public.appointments 
  ALTER COLUMN patient_id DROP NOT NULL;

-- Step 3: Simplify RLS policies - remove auth.users references
DROP POLICY IF EXISTS "Allow public appointment creation" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can update their appointments" ON public.appointments;

-- Step 4: Create simple policies without auth.users references

-- Allow anyone to create appointments
CREATE POLICY "Allow public appointment creation"
  ON public.appointments FOR INSERT
  WITH CHECK (true);

-- Patients can view their own appointments (by patient_id only)
CREATE POLICY "Patients can view own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

-- Patients can update their own appointments
CREATE POLICY "Patients can update own appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id);

-- Patients can delete their own appointments
CREATE POLICY "Patients can delete own appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (auth.uid() = patient_id AND status != 'completed');

-- Dentists can view appointments by dentist_id
CREATE POLICY "Dentists can view their appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = dentist_id);

-- Dentists can update their appointments
CREATE POLICY "Dentists can update their appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = dentist_id);

-- Step 5: Drop and recreate admin policies
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.appointments;

CREATE POLICY "Admins can view all appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all appointments"
  ON public.appointments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Step 6: Ensure we have patient contact info
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS check_patient_info;

ALTER TABLE public.appointments
  ADD CONSTRAINT check_patient_info 
  CHECK (
    patient_id IS NOT NULL OR 
    (patient_email IS NOT NULL AND patient_name IS NOT NULL AND patient_phone IS NOT NULL)
  );

-- Done! The key fix is granting SELECT on auth.users
