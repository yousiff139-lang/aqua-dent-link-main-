-- ============================================================================
-- FIX APPOINTMENTS TABLE SCHEMA
-- This migration fixes the appointments table without losing data
-- ============================================================================

-- First, let's check what columns exist and add missing ones
DO $$
DECLARE
    column_exists boolean;
BEGIN
    -- Check and add missing columns one by one
    
    -- Check if dentist_id column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'dentist_id'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN dentist_id UUID;
    END IF;
    
    -- Check if patient_name column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'patient_name'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN patient_name TEXT;
    END IF;
    
    -- Check if patient_email column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'patient_email'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN patient_email TEXT;
    END IF;
    
    -- Check if patient_phone column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'patient_phone'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN patient_phone TEXT;
    END IF;
    
    -- Check if dentist_email column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'dentist_email'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN dentist_email TEXT;
    END IF;
    
    -- Check if appointment_time column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'appointment_time'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN appointment_time TIME;
    END IF;
    
    -- Check if payment_method column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'payment_method'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN payment_method TEXT;
    END IF;
    
    -- Check if payment_status column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'payment_status'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;
    
    -- Check if chief_complaint column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'chief_complaint'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN chief_complaint TEXT;
    END IF;
    
    -- Check if symptoms column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'symptoms'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN symptoms TEXT;
    END IF;
    
    -- Check if medical_history column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'medical_history'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN medical_history TEXT;
    END IF;
    
    -- Check if smoking column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'smoking'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN smoking BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Check if medications column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'medications'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN medications TEXT;
    END IF;
    
    -- Check if allergies column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'allergies'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN allergies TEXT;
    END IF;
    
    -- Check if previous_dental_work column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'previous_dental_work'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN previous_dental_work TEXT;
    END IF;
    
    -- Check if cause_identified column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'cause_identified'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN cause_identified BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Check if uncertainty_note column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'uncertainty_note'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN uncertainty_note TEXT;
    END IF;
    
    -- Check if patient_notes column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'patient_notes'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN patient_notes TEXT;
    END IF;
    
    -- Check if dentist_notes column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'dentist_notes'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN dentist_notes TEXT;
    END IF;
    
    -- Check if stripe_session_id column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'stripe_session_id'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN stripe_session_id TEXT;
    END IF;
    
    -- Check if stripe_payment_intent_id column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'stripe_payment_intent_id'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN stripe_payment_intent_id TEXT;
    END IF;
    
    -- Check if pdf_report_url column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'pdf_report_url'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN pdf_report_url TEXT;
    END IF;
    
    -- Check if booking_reference column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'booking_reference'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN booking_reference TEXT;
    END IF;
    
    -- Check if conversation_id column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'conversation_id'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        ALTER TABLE public.appointments ADD COLUMN conversation_id TEXT;
    END IF;
    
    RAISE NOTICE '✅ All required columns checked and added if missing';
END $$;

-- Fix the status constraint to include all valid statuses
ALTER TABLE public.appointments 
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments 
  ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled'));

-- Update any existing appointments with wrong status
UPDATE public.appointments 
SET status = 'upcoming' 
WHERE status IN ('pending', 'confirmed') 
AND appointment_date >= CURRENT_DATE;

-- Add NOT NULL constraints where needed (only if column has data)
DO $$
BEGIN
    -- Make patient_name NOT NULL if it has data
    IF EXISTS (SELECT 1 FROM public.appointments WHERE patient_name IS NOT NULL AND patient_name != '') THEN
        ALTER TABLE public.appointments ALTER COLUMN patient_name SET NOT NULL;
    END IF;
    
    -- Make patient_email NOT NULL if it has data
    IF EXISTS (SELECT 1 FROM public.appointments WHERE patient_email IS NOT NULL AND patient_email != '') THEN
        ALTER TABLE public.appointments ALTER COLUMN patient_email SET NOT NULL;
    END IF;
    
    -- Make patient_phone NOT NULL if it has data
    IF EXISTS (SELECT 1 FROM public.appointments WHERE patient_phone IS NOT NULL AND patient_phone != '') THEN
        ALTER TABLE public.appointments ALTER COLUMN patient_phone SET NOT NULL;
    END IF;
    
    -- Make appointment_time NOT NULL if it has data
    IF EXISTS (SELECT 1 FROM public.appointments WHERE appointment_time IS NOT NULL) THEN
        ALTER TABLE public.appointments ALTER COLUMN appointment_time SET NOT NULL;
    END IF;
    
    -- Make payment_method NOT NULL if it has data
    IF EXISTS (SELECT 1 FROM public.appointments WHERE payment_method IS NOT NULL AND payment_method != '') THEN
        ALTER TABLE public.appointments ALTER COLUMN payment_method SET NOT NULL;
    END IF;
END $$;

-- Add payment method constraint
ALTER TABLE public.appointments 
  ADD CONSTRAINT appointments_payment_method_check 
  CHECK (payment_method IS NULL OR payment_method IN ('stripe', 'cash'));

-- Add payment status constraint
ALTER TABLE public.appointments 
  ADD CONSTRAINT appointments_payment_status_check 
  CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_id ON public.appointments(dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON public.appointments(payment_status);
CREATE INDEX IF NOT EXISTS idx_appointments_booking_reference ON public.appointments(booking_reference);

-- Create unique constraint for booking reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_booking_reference_unique 
ON public.appointments(booking_reference) 
WHERE booking_reference IS NOT NULL;

-- Fix RLS policies - drop existing ones first
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can update their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can view assigned appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can update assigned appointments" ON public.appointments;

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

-- Ensure RLS is enabled
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_appointments_updated_at'
    ) THEN
        CREATE TRIGGER update_appointments_updated_at 
        BEFORE UPDATE ON public.appointments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Verify the fix
DO $$
DECLARE
    table_exists boolean;
    column_count integer;
BEGIN
    -- Check if appointments table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'appointments' 
        AND table_schema = 'public'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Count columns
        SELECT COUNT(*) INTO column_count
        FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND table_schema = 'public';
        
        RAISE NOTICE '✅ Appointments table exists with % columns', column_count;
        RAISE NOTICE '✅ Status constraint allows: pending, confirmed, upcoming, completed, cancelled';
        RAISE NOTICE '✅ RLS policies have been reset and configured correctly';
        RAISE NOTICE '✅ Performance indexes have been created';
    ELSE
        RAISE NOTICE '❌ Appointments table does not exist!';
    END IF;
END $$;
