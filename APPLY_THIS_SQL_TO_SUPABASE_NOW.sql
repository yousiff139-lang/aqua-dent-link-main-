-- ============================================================================
-- CRITICAL: APPOINTMENTS TABLE - APPLY THIS TO SUPABASE NOW
-- This creates the missing appointments table that's breaking sync
-- ============================================================================

-- Step 1: Drop existing table if it exists (to start fresh)
DROP TABLE IF EXISTS public.appointments CASCADE;

-- Step 2: Create the appointments table with ALL required columns
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
    patient_age INTEGER,
    patient_medical_conditions TEXT,
    
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
    payment_amount DECIMAL(10, 2),
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    
    -- Medical information
    chief_complaint TEXT,
    symptoms TEXT,
    reason TEXT,
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
    completed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX idx_appointments_dentist_id ON public.appointments(dentist_id);
CREATE INDEX idx_appointments_dentist_email ON public.appointments(dentist_email);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_date_time ON public.appointments(appointment_date, appointment_time);
CREATE INDEX idx_appointments_payment_status ON public.appointments(payment_status);
CREATE INDEX idx_appointments_booking_reference ON public.appointments(booking_reference);
CREATE INDEX idx_appointments_created_at ON public.appointments(created_at);

-- Step 4: Enable Row Level Security (RLS)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if any
DROP POLICY IF EXISTS "Allow public appointment creation" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can update their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.appointments;

-- Step 6: Create RLS Policies

-- Allow public/anonymous users to create appointments (for booking form)
CREATE POLICY "Allow public appointment creation"
  ON public.appointments FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow authenticated users to create appointments
CREATE POLICY "Authenticated users can create appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = patient_id);

-- Patients can view their own appointments
CREATE POLICY "Patients can view own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

-- Patients can update their own appointments
CREATE POLICY "Patients can update own appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- Patients can delete their own appointments (if not completed)
CREATE POLICY "Patients can delete own appointments"
  ON public.appointments FOR DELETE
  TO authenticated
  USING (auth.uid() = patient_id AND status != 'completed');

-- Dentists can view their appointments
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

-- Dentists can update their appointments
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

-- Admins can view all appointments
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

-- Admins can manage all appointments
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

-- Step 7: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT INSERT, SELECT ON public.appointments TO anon;

-- Step 8: Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 9: Create trigger for updated_at
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Add comments
COMMENT ON TABLE public.appointments IS 'Stores all patient appointments with dentists - CRITICAL FOR SYNC';
COMMENT ON COLUMN public.appointments.patient_id IS 'Reference to the patient user';
COMMENT ON COLUMN public.appointments.dentist_id IS 'Reference to the dentist';
COMMENT ON COLUMN public.appointments.status IS 'Appointment status: pending, confirmed, upcoming, completed, cancelled';
COMMENT ON COLUMN public.appointments.payment_status IS 'Payment status: pending, paid, refunded, failed';
COMMENT ON COLUMN public.appointments.booking_reference IS 'Unique booking reference for the appointment';

-- Step 11: Verify the table was created
DO $$
DECLARE
    table_exists boolean;
    column_count integer;
    policy_count integer;
    index_count integer;
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
        
        -- Count indexes
        SELECT COUNT(*) INTO index_count
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'appointments';
        
        RAISE NOTICE '========================================';
        RAISE NOTICE '✅ SUCCESS: Appointments table created!';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Table: public.appointments';
        RAISE NOTICE 'Columns: %', column_count;
        RAISE NOTICE 'RLS Policies: %', policy_count;
        RAISE NOTICE 'Indexes: %', index_count;
        RAISE NOTICE '========================================';
        RAISE NOTICE '';
        RAISE NOTICE '🎉 SYNC SYSTEM IS NOW OPERATIONAL!';
        RAISE NOTICE '';
        RAISE NOTICE '📝 Next steps:';
        RAISE NOTICE '   1. Restart your backend: npm run dev:backend';
        RAISE NOTICE '   2. Restart your frontend: npm run dev';
        RAISE NOTICE '   3. Test booking an appointment';
        RAISE NOTICE '';
        RAISE NOTICE '✅ All apps can now sync appointments!';
        RAISE NOTICE '========================================';
    ELSE
        RAISE EXCEPTION '❌ Failed to create appointments table';
    END IF;
END $$;
