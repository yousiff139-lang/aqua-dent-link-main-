-- ============================================================================
-- CREATE PUBLIC.APPOINTMENTS TABLE
-- Run this in Supabase SQL Editor to create the appointments table
-- ============================================================================

-- Create the appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
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
    pdf_summary_url TEXT,
    
    -- Booking reference
    booking_reference TEXT UNIQUE,
    conversation_id TEXT,
    booking_source TEXT DEFAULT 'manual',
    
    -- Cancellation tracking
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_id ON public.appointments(dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON public.appointments(appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON public.appointments(payment_status);
CREATE INDEX IF NOT EXISTS idx_appointments_booking_reference ON public.appointments(booking_reference);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON public.appointments(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public appointment creation" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can update their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.appointments;

-- Create RLS Policies

-- 1. Allow public/anonymous users to create appointments (for booking form)
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
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT INSERT, SELECT ON public.appointments TO anon;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE public.appointments IS 'Stores all patient appointments with dentists';
COMMENT ON COLUMN public.appointments.patient_id IS 'Reference to the patient user';
COMMENT ON COLUMN public.appointments.dentist_id IS 'Reference to the dentist';
COMMENT ON COLUMN public.appointments.status IS 'Appointment status: pending, confirmed, upcoming, completed, cancelled';
COMMENT ON COLUMN public.appointments.payment_status IS 'Payment status: pending, paid, refunded, failed';
COMMENT ON COLUMN public.appointments.booking_reference IS 'Unique booking reference for the appointment';
COMMENT ON COLUMN public.appointments.appointment_date IS 'Date of the appointment';
COMMENT ON COLUMN public.appointments.appointment_time IS 'Time of the appointment';

-- Verify the table was created
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
        
        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ SUCCESS: Appointments table created!';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Table: public.appointments';
        RAISE NOTICE 'Columns: %', column_count;
        RAISE NOTICE 'RLS Policies: %', policy_count;
        RAISE NOTICE 'Indexes: 8 created';
        RAISE NOTICE '========================================';
        RAISE NOTICE '';
        RAISE NOTICE '📝 Next steps:';
        RAISE NOTICE '   1. Table is ready to use';
        RAISE NOTICE '   2. You can now create appointments';
        RAISE NOTICE '   3. Test the booking form';
        RAISE NOTICE '';
        RAISE NOTICE '🎉 All done!';
        RAISE NOTICE '========================================';
    ELSE
        RAISE EXCEPTION '❌ Failed to create appointments table';
    END IF;
END $$;
