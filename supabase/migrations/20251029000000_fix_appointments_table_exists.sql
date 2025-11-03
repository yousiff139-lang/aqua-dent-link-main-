-- ============================================================================
-- FIX APPOINTMENTS TABLE - ENSURE IT EXISTS IN SCHEMA CACHE
-- This migration ensures the appointments table exists and is properly configured
-- ============================================================================

-- First, ensure the table exists with all required columns
DO $$
BEGIN
    -- Check if table exists, if not create it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments'
    ) THEN
        -- Create the appointments table
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
            time TIMESTAMPTZ,
            appointment_type TEXT DEFAULT 'General Checkup',
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled')),
            
            -- Payment information
            payment_method TEXT CHECK (payment_method IN ('stripe', 'cash', 'card')),
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
            
            -- Timestamps
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
        CREATE INDEX IF NOT EXISTS idx_appointments_dentist_id ON public.appointments(dentist_id);
        CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
        CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
        CREATE INDEX IF NOT EXISTS idx_appointments_dentist_email ON public.appointments(dentist_email);
        CREATE INDEX IF NOT EXISTS idx_appointments_patient_email ON public.appointments(patient_email);
        
        -- Enable RLS
        ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        -- Patients can view their own appointments
        CREATE POLICY "Patients can view own appointments"
            ON public.appointments FOR SELECT
            USING (auth.uid() = patient_id);
        
        -- Patients can insert their own appointments
        CREATE POLICY "Patients can insert own appointments"
            ON public.appointments FOR INSERT
            WITH CHECK (auth.uid() = patient_id);
        
        -- Patients can update their own appointments
        CREATE POLICY "Patients can update own appointments"
            ON public.appointments FOR UPDATE
            USING (auth.uid() = patient_id);
        
        -- Dentists can view their appointments
        CREATE POLICY "Dentists can view own appointments"
            ON public.appointments FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.dentists
                    WHERE dentists.id = appointments.dentist_id
                    AND dentists.email = (SELECT email FROM auth.users WHERE id = auth.uid())
                )
            );
        
        -- Dentists can update their appointments
        CREATE POLICY "Dentists can update own appointments"
            ON public.appointments FOR UPDATE
            USING (
                EXISTS (
                    SELECT 1 FROM public.dentists
                    WHERE dentists.id = appointments.dentist_id
                    AND dentists.email = (SELECT email FROM auth.users WHERE id = auth.uid())
                )
            );
        
        -- Service role can do everything (for backend operations)
        CREATE POLICY "Service role full access"
            ON public.appointments FOR ALL
            USING (auth.jwt()->>'role' = 'service_role');
        
        -- Grant permissions
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
        GRANT SELECT ON public.appointments TO anon;
        
    ELSE
        -- Table exists, ensure all required columns exist
        -- Add missing columns if they don't exist
        
        -- Add pdf_summary_url if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'appointments' 
            AND column_name = 'pdf_summary_url'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.appointments ADD COLUMN pdf_summary_url TEXT;
            
            -- Copy data from pdf_report_url if it exists
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'appointments' 
                AND column_name = 'pdf_report_url'
                AND table_schema = 'public'
            ) THEN
                UPDATE public.appointments 
                SET pdf_summary_url = pdf_report_url 
                WHERE pdf_report_url IS NOT NULL AND pdf_summary_url IS NULL;
            END IF;
        END IF;
        
        -- Add time column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'appointments' 
            AND column_name = 'time'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.appointments ADD COLUMN time TIMESTAMPTZ;
            
            -- Populate from existing date and time if available
            UPDATE public.appointments 
            SET time = (appointment_date + appointment_time)::timestamptz
            WHERE appointment_date IS NOT NULL 
            AND appointment_time IS NOT NULL 
            AND time IS NULL;
        END IF;
        
        -- Ensure RLS is enabled
        ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
        
        -- Ensure indexes exist
        CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
        CREATE INDEX IF NOT EXISTS idx_appointments_dentist_id ON public.appointments(dentist_id);
        CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
        CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
        CREATE INDEX IF NOT EXISTS idx_appointments_dentist_email ON public.appointments(dentist_email);
        CREATE INDEX IF NOT EXISTS idx_appointments_patient_email ON public.appointments(patient_email);
        
    END IF;
END $$;

-- Refresh the schema cache by querying the table
SELECT COUNT(*) FROM public.appointments LIMIT 1;

-- Ensure grants are set
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT ON public.appointments TO anon;

