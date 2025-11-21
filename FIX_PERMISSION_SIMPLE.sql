-- ============================================================================
-- FIX: Permission Denied Error - SIMPLE VERSION
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Make patient_id optional (allow guest bookings)
ALTER TABLE public.appointments 
  ALTER COLUMN patient_id DROP NOT NULL;

-- Step 2: Drop old policies
DROP POLICY IF EXISTS "Allow public appointment creation" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can create appointments" ON public.appointments;

-- Step 3: Create new policy for anonymous users
CREATE POLICY "Allow public appointment creation"
  ON public.appointments FOR INSERT
  TO anon, public
  WITH CHECK (true);

-- Step 4: Create new policy for authenticated users
CREATE POLICY "Authenticated users can create appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = patient_id OR patient_id IS NULL
  );

-- Step 5: Add constraint to ensure we have patient info
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS check_patient_info;

ALTER TABLE public.appointments
  ADD CONSTRAINT check_patient_info 
  CHECK (
    patient_id IS NOT NULL OR 
    (patient_email IS NOT NULL AND patient_name IS NOT NULL AND patient_phone IS NOT NULL)
  );

-- Done! Now restart your app and try booking again.
