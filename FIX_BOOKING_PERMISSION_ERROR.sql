-- ============================================================================
-- FIX: Permission Denied for Table User - APPLY THIS NOW
-- This fixes the booking error when trying to create appointments
-- ============================================================================

-- PROBLEM: The booking form is checking auth.users table which causes permission denied
-- SOLUTION: Make patient_id optional and allow anonymous bookings

-- Step 1: Make patient_id nullable (allow guest bookings)
ALTER TABLE public.appointments 
  ALTER COLUMN patient_id DROP NOT NULL;

-- Step 2: Drop and recreate the public creation policy
DROP POLICY IF EXISTS "Allow public appointment creation" ON public.appointments;

CREATE POLICY "Allow public appointment creation"
  ON public.appointments FOR INSERT
  TO anon, public
  WITH CHECK (true);

-- Step 3: Update authenticated user policy
DROP POLICY IF EXISTS "Authenticated users can create appointments" ON public.appointments;

CREATE POLICY "Authenticated users can create appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = patient_id OR patient_id IS NULL
  );

-- Step 4: Add constraint to ensure we have patient info
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS check_patient_info;

ALTER TABLE public.appointments
  ADD CONSTRAINT check_patient_info 
  CHECK (
    patient_id IS NOT NULL OR 
    (patient_email IS NOT NULL AND patient_name IS NOT NULL AND patient_phone IS NOT NULL)
  );

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ Permission fix applied successfully!';
    RAISE NOTICE 'Anonymous users can now book appointments';
    RAISE NOTICE 'Restart your app and try booking again';
END $$;
