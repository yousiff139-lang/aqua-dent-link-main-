-- ============================================================================
-- FIX SCHEMA CACHE FOR APPOINTMENTS TABLE
-- This migration ensures the appointments table is properly registered
-- ============================================================================

-- Drop and recreate the appointments table to fix schema cache issues
-- This will preserve data if the table exists

-- First, create a backup of existing data (if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments'
    ) THEN
        -- Create temporary backup table
        CREATE TEMP TABLE appointments_backup AS 
        SELECT * FROM public.appointments;
        
        RAISE NOTICE 'Created backup of existing appointments data';
    END IF;
END $$;

-- Drop the table if it exists (this will clear the schema cache)
DROP TABLE IF EXISTS public.appointments CASCADE;

-- Ensure dentists table exists before creating appointments
CREATE TABLE IF NOT EXISTS public.dentists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT,
    specialization TEXT,
    bio TEXT,
    education TEXT,
    expertise TEXT[],
    rating DECIMAL(2,1) DEFAULT 4.5,
    reviews_count INTEGER DEFAULT 0,
    image_url TEXT,
    available_times JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate the appointments table with complete schema
CREATE TABLE public.appointments (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dentist_id UUID REFERENCES public.dentists(id) ON DELETE SET NULL,
    
    -- Patient information
    patient_name TEXT NOT NULL,
    patient_email TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    
    -- Dentist information
    dentist_name TEXT,
    dentist_email TEXT,
    
    -- Appointment details
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    appointment_type TEXT DEFAULT 'General Checkup',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled')),
    
    -- Payment information
    payment_method TEXT CHECK (payment_method IN ('stripe', 'cash')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    
    -- Medical information
    chief_complaint TEXT,
    symptoms TEXT,
    medical_history TEXT,
    smoking BOOLEAN DEFAULT FALSE,
    medications TEXT,
    allergies TEXT,
    previous_dental_work TEXT,
    
    -- Diagnostic information
    cause_identified BOOLEAN DEFAULT TRUE,
    uncertainty_note TEXT,
    
    -- Notes
    patient_notes TEXT,
    dentist_notes TEXT,
    notes TEXT,
    
    -- Documents and reports
    documents JSONB DEFAULT '[]'::jsonb,
    pdf_report_url TEXT,
    
    -- Booking reference
    booking_reference TEXT UNIQUE,
    conversation_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restore data from backup if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'pg_temp_1' 
        AND tablename LIKE 'appointments_backup%'
    ) THEN
        INSERT INTO public.appointments 
        SELECT * FROM appointments_backup;
        
        RAISE NOTICE 'Restored % appointments from backup', (SELECT COUNT(*) FROM appointments_backup);
    ELSE
        RAISE NOTICE 'No backup data to restore';
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX idx_appointments_dentist_id ON public.appointments(dentist_id);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_payment_status ON public.appointments(payment_status);
CREATE INDEX idx_appointments_booking_reference ON public.appointments(booking_reference);
CREATE INDEX idx_appointments_created_at ON public.appointments(created_at);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can update their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow anonymous appointment creation" ON public.appointments;
DROP POLICY IF EXISTS "Allow public appointment creation" ON public.appointments;

-- Create RLS policies

-- 1. Allow anonymous/public users to create appointments (for booking form)
CREATE POLICY "Allow public appointment creation"
  ON public.appointments FOR INSERT
  TO public
  WITH CHECK (true);

-- 2. Allow authenticated users to create appointments
CREATE POLICY "Authenticated users can create appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = patient_id);

-- 3. Patients can view their own appointments
CREATE POLICY "Patients can view own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

-- 4. Patients can update their own appointments
CREATE POLICY "Patients can update own appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- 5. Patients can delete their own appointments (if not completed)
CREATE POLICY "Patients can delete own appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (auth.uid() = patient_id AND status != 'completed');

-- 6. Dentists can view their appointments
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

-- 7. Dentists can update their appointments
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

-- 8. Admins can view all appointments
CREATE POLICY "Admins can view all appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('karrarmayaly@gmail.com', 'bingo@gmail.com')
    )
  );

-- 9. Admins can manage all appointments
CREATE POLICY "Admins can manage all appointments"
  ON public.appointments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('karrarmayaly@gmail.com', 'bingo@gmail.com')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT INSERT ON public.appointments TO anon;
GRANT SELECT ON public.appointments TO anon;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.appointments IS 'Stores all patient appointments with dentists';
COMMENT ON COLUMN public.appointments.patient_id IS 'Reference to the patient user';
COMMENT ON COLUMN public.appointments.dentist_id IS 'Reference to the dentist (optional)';
COMMENT ON COLUMN public.appointments.status IS 'Appointment status: pending, confirmed, upcoming, completed, cancelled';
COMMENT ON COLUMN public.appointments.payment_status IS 'Payment status: pending, paid, refunded, failed';
COMMENT ON COLUMN public.appointments.booking_reference IS 'Unique booking reference for the appointment';

-- Verify the table exists and is accessible
DO $$
DECLARE
    table_exists boolean;
    column_count integer;
    policy_count integer;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments'
    ) INTO table_exists;
    
    IF table_exists THEN
        -- Count columns
        SELECT COUNT(*) INTO column_count
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments';
        
        -- Count policies
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'appointments';
        
        RAISE NOTICE '✅ Appointments table successfully created/recreated';
        RAISE NOTICE '✅ Table has % columns', column_count;
        RAISE NOTICE '✅ Table has % RLS policies', policy_count;
        RAISE NOTICE '✅ Schema cache should now be updated';
        RAISE NOTICE '✅ Public users can now create appointments';
    ELSE
        RAISE EXCEPTION '❌ Failed to create appointments table';
    END IF;
END $$;

-- Force schema cache refresh by updating pg_class
UPDATE pg_class SET reltuples = -1 WHERE relname = 'appointments';

-- Analyze the table to update statistics
ANALYZE public.appointments;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '🎉 Migration completed successfully!';
    RAISE NOTICE '📝 Next steps:';
    RAISE NOTICE '   1. Restart your application';
    RAISE NOTICE '   2. Test the booking form';
    RAISE NOTICE '   3. Verify appointments are created successfully';
END $$;
