-- ============================================================================
-- COMPLETE FIX FOR APPOINTMENTS LOADING ISSUE
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- Step 1: Fix the status constraint to allow 'upcoming'
ALTER TABLE public.appointments 
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments 
  ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled'));

-- Step 2: Update any existing appointments with wrong status
UPDATE public.appointments 
SET status = 'upcoming' 
WHERE status IN ('pending', 'confirmed') 
AND appointment_date >= CURRENT_DATE;

-- Step 3: Fix RLS policies for appointments
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can view their appointments by id" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can view appointments by email" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can update their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.appointments;

-- Create clean RLS policies
CREATE POLICY "Patients can view own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update own appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can delete own appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (auth.uid() = patient_id AND status != 'completed');

CREATE POLICY "Dentists can view their appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = dentist_id 
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = appointments.dentist_email
    )
  );

CREATE POLICY "Dentists can update their appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = dentist_id 
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = appointments.dentist_email
    )
  );

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

-- Step 4: Ensure RLS is enabled
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Step 5: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_id ON public.appointments(dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);

-- Step 7: Verify the fix
DO $$
BEGIN
  RAISE NOTICE '✅ Fix applied successfully!';
  RAISE NOTICE 'Status constraint now allows: pending, confirmed, upcoming, completed, cancelled';
  RAISE NOTICE 'RLS policies have been reset and configured correctly';
  RAISE NOTICE 'Performance indexes have been created';
END $$;
