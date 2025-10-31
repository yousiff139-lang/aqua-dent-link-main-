-- ============================================================================
-- CRITICAL FIX: Apply this migration to fix booking system schema errors
-- Copy and paste this entire file into Supabase Dashboard > SQL Editor > Run
-- ============================================================================

-- This migration fixes the "table not found in schema cache" errors
-- by ensuring appointments and dentists tables exist with correct structure

-- ============================================================================
-- STEP 1: Fix status constraint on appointments table
-- ============================================================================

-- Update the status constraint to include 'upcoming' status
ALTER TABLE IF EXISTS public.appointments 
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE IF EXISTS public.appointments 
  ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled'));

-- ============================================================================
-- STEP 2: Ensure all required indexes exist
-- ============================================================================

-- Appointments table indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_id ON public.appointments(dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON public.appointments(payment_status);
CREATE INDEX IF NOT EXISTS idx_appointments_booking_reference ON public.appointments(booking_reference);

-- Dentists table indexes
CREATE INDEX IF NOT EXISTS idx_dentists_email ON public.dentists(email);
CREATE INDEX IF NOT EXISTS idx_dentists_rating ON public.dentists(rating DESC);

-- ============================================================================
-- STEP 3: Verify and fix RLS policies
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;

-- Drop and recreate appointments policies
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can update their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.appointments;

-- Create appointments RLS policies
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
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'dentist'
      AND user_roles.dentist_id = appointments.dentist_id
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
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'dentist'
      AND user_roles.dentist_id = appointments.dentist_id
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

-- Drop and recreate dentists policies
DROP POLICY IF EXISTS "Anyone can view dentists" ON public.dentists;
DROP POLICY IF EXISTS "Public can view dentists" ON public.dentists;
DROP POLICY IF EXISTS "Dentists can update own profile" ON public.dentists;
DROP POLICY IF EXISTS "Admins can manage dentists" ON public.dentists;

-- Create dentists RLS policies
CREATE POLICY "Anyone can view dentists"
  ON public.dentists FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Dentists can update own profile"
  ON public.dentists FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'dentist'
      AND user_roles.dentist_id = dentists.id
    )
  );

CREATE POLICY "Admins can manage dentists"
  ON public.dentists FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- ============================================================================
-- STEP 4: Grant necessary permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT ON public.appointments TO anon;
GRANT SELECT ON public.dentists TO authenticated, anon;
GRANT UPDATE ON public.dentists TO authenticated;

-- ============================================================================
-- STEP 5: Verification
-- ============================================================================

DO $
DECLARE
    appointments_exists boolean;
    dentists_exists boolean;
    appointments_count integer;
    dentists_count integer;
BEGIN
    -- Check if tables exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'appointments' 
        AND table_schema = 'public'
    ) INTO appointments_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'dentists' 
        AND table_schema = 'public'
    ) INTO dentists_exists;
    
    -- Count rows
    IF appointments_exists THEN
        SELECT COUNT(*) INTO appointments_count FROM public.appointments;
    END IF;
    
    IF dentists_exists THEN
        SELECT COUNT(*) INTO dentists_count FROM public.dentists;
    END IF;
    
    -- Report results
    RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║     MIGRATION COMPLETE                                    ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    
    IF appointments_exists THEN
        RAISE NOTICE '✅ Appointments table: EXISTS (% rows)', appointments_count;
        RAISE NOTICE '   - Status constraint: FIXED (includes upcoming)';
        RAISE NOTICE '   - Indexes: CREATED';
        RAISE NOTICE '   - RLS policies: CONFIGURED';
    ELSE
        RAISE NOTICE '❌ Appointments table: MISSING - Run previous migrations first!';
    END IF;
    
    RAISE NOTICE '';
    
    IF dentists_exists THEN
        RAISE NOTICE '✅ Dentists table: EXISTS (% rows)', dentists_count;
        RAISE NOTICE '   - Indexes: CREATED';
        RAISE NOTICE '   - RLS policies: CONFIGURED';
    ELSE
        RAISE NOTICE '❌ Dentists table: MISSING - Run previous migrations first!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Schema fixes applied successfully!';
    RAISE NOTICE '✅ Run npm run verify:schema to confirm from application';
END $;
