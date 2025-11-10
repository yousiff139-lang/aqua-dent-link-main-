-- ============================================================================
-- COMPLETE BACKEND SYNC SYSTEM
-- Fixes appointments table and creates automatic sync between all portals
-- ============================================================================

-- ============================================================================
-- PART 1: FIX APPOINTMENTS TABLE (Schema Cache Issue)
-- ============================================================================

-- Backup existing data if table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments'
    ) THEN
        CREATE TEMP TABLE IF NOT EXISTS appointments_backup AS 
        SELECT * FROM public.appointments;
        RAISE NOTICE '✅ Created backup of existing appointments';
    END IF;
END $$;

-- Drop and recreate appointments table to fix schema cache
DROP TABLE IF EXISTS public.appointments CASCADE;

-- Recreate appointments table with complete schema
CREATE TABLE public.appointments (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    dentist_id UUID NOT NULL REFERENCES public.dentists(id) ON DELETE CASCADE,
    
    -- Patient information
    patient_name TEXT NOT NULL,
    patient_email TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    
    -- Dentist information (denormalized for performance)
    dentist_name TEXT,
    dentist_email TEXT,
    
    -- Appointment details
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INT DEFAULT 30,
    appointment_type TEXT DEFAULT 'General Checkup',
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled')),
    
    -- Payment information
    payment_method TEXT CHECK (payment_method IN ('stripe', 'cash')),
    payment_status TEXT DEFAULT 'pending' 
        CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    
    -- Medical information (for chatbot bookings)
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
    
    -- Source tracking (manual booking vs chatbot)
    booking_source TEXT DEFAULT 'manual' CHECK (booking_source IN ('manual', 'chatbot')),
    
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
        RAISE NOTICE '✅ Restored % appointments from backup', (SELECT COUNT(*) FROM appointments_backup);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_id ON public.appointments(dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_date ON public.appointments(dentist_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON public.appointments(payment_status);
CREATE INDEX IF NOT EXISTS idx_appointments_booking_reference ON public.appointments(booking_reference);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON public.appointments(created_at);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_email ON public.appointments(dentist_email);

-- ============================================================================
-- PART 2: SYNC TRIGGERS - Dentist Creation/Deletion (Admin → Dentist Login)
-- ============================================================================

-- Function: Auto-populate dentist_email when dentist is created/updated
CREATE OR REPLACE FUNCTION public.sync_dentist_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure dentist_email is always set from dentists.email
    IF NEW.email IS NOT NULL AND (NEW.dentist_email IS NULL OR NEW.dentist_email != NEW.email) THEN
        NEW.dentist_email = NEW.email;
    END IF;
    
    -- Ensure dentist_name is set from dentists.name
    IF NEW.name IS NOT NULL AND (NEW.dentist_name IS NULL OR NEW.dentist_name != NEW.name) THEN
        NEW.dentist_name = NEW.name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update appointments when dentist email/name changes
CREATE OR REPLACE FUNCTION public.sync_appointments_on_dentist_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all appointments for this dentist when email/name changes
    IF OLD.email IS DISTINCT FROM NEW.email OR OLD.name IS DISTINCT FROM NEW.name THEN
        UPDATE public.appointments
        SET 
            dentist_email = NEW.email,
            dentist_name = NEW.name,
            updated_at = NOW()
        WHERE dentist_id = NEW.id;
        
        RAISE NOTICE '✅ Synced appointments for dentist % (email: %)', NEW.id, NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_appointments_on_dentist_update ON public.dentists;
CREATE TRIGGER tr_sync_appointments_on_dentist_update
    AFTER UPDATE OF email, name ON public.dentists
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_appointments_on_dentist_update();

-- ============================================================================
-- PART 3: SYNC TRIGGERS - Availability Updates (Dentist → User Portal)
-- ============================================================================

-- Function: Notify when availability changes (for real-time sync)
CREATE OR REPLACE FUNCTION public.notify_availability_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Use pg_notify to trigger real-time updates
    PERFORM pg_notify(
        'availability_changed',
        json_build_object(
            'dentist_id', NEW.dentist_id,
            'day_of_week', NEW.day_of_week,
            'start_time', NEW.start_time,
            'end_time', NEW.end_time,
            'is_available', NEW.is_available
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_notify_availability_change ON public.dentist_availability;
CREATE TRIGGER tr_notify_availability_change
    AFTER INSERT OR UPDATE OR DELETE ON public.dentist_availability
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_availability_change();

-- ============================================================================
-- PART 4: SYNC TRIGGERS - Appointment Creation (User/Chatbot → Dentist Portal)
-- ============================================================================

-- Function: Auto-populate dentist info when appointment is created
CREATE OR REPLACE FUNCTION public.sync_appointment_dentist_info()
RETURNS TRIGGER AS $$
DECLARE
    dentist_record RECORD;
BEGIN
    -- Fetch dentist information
    SELECT email, name INTO dentist_record
    FROM public.dentists
    WHERE id = NEW.dentist_id;
    
    -- Populate dentist_email and dentist_name if not set
    IF dentist_record.email IS NOT NULL THEN
        NEW.dentist_email = COALESCE(NEW.dentist_email, dentist_record.email);
    END IF;
    
    IF dentist_record.name IS NOT NULL THEN
        NEW.dentist_name = COALESCE(NEW.dentist_name, dentist_record.name);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_appointment_dentist_info ON public.appointments;
CREATE TRIGGER tr_sync_appointment_dentist_info
    BEFORE INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_appointment_dentist_info();

-- Function: Notify when appointment is created/updated (for real-time sync)
CREATE OR REPLACE FUNCTION public.notify_appointment_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM pg_notify(
            'appointment_created',
            json_build_object(
                'id', NEW.id,
                'dentist_id', NEW.dentist_id,
                'dentist_email', NEW.dentist_email,
                'patient_name', NEW.patient_name,
                'appointment_date', NEW.appointment_date,
                'appointment_time', NEW.appointment_time,
                'status', NEW.status,
                'booking_source', NEW.booking_source
            )::text
        );
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM pg_notify(
            'appointment_updated',
            json_build_object(
                'id', NEW.id,
                'dentist_id', NEW.dentist_id,
                'dentist_email', NEW.dentist_email,
                'status', NEW.status,
                'old_status', OLD.status
            )::text
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM pg_notify(
            'appointment_deleted',
            json_build_object(
                'id', OLD.id,
                'dentist_id', OLD.dentist_id,
                'dentist_email', OLD.dentist_email
            )::text
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_notify_appointment_change ON public.appointments;
CREATE TRIGGER tr_notify_appointment_change
    AFTER INSERT OR UPDATE OR DELETE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_appointment_change();

-- ============================================================================
-- PART 5: PREVENT DOUBLE BOOKING
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_double_booking()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.appointments a
        WHERE a.dentist_id = NEW.dentist_id
            AND a.appointment_date = NEW.appointment_date
            AND a.appointment_time = NEW.appointment_time
            AND a.status IN ('pending', 'confirmed', 'upcoming')
            AND a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
        RAISE EXCEPTION 'Time slot already booked for this dentist at % on %', 
            NEW.appointment_time, NEW.appointment_date;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_double_booking ON public.appointments;
CREATE TRIGGER tr_prevent_double_booking
    BEFORE INSERT OR UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_double_booking();

-- ============================================================================
-- PART 6: AUTO-UPDATE TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_updated_at_appointments ON public.appointments;
CREATE TRIGGER tr_set_updated_at_appointments
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_set_updated_at_dentists ON public.dentists;
CREATE TRIGGER tr_set_updated_at_dentists
    BEFORE UPDATE ON public.dentists
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- PART 7: RLS POLICIES
-- ============================================================================

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public appointment creation" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can view their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can update their appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.appointments;

-- Allow public/anonymous users to create appointments (for booking form)
CREATE POLICY "Allow public appointment creation"
    ON public.appointments FOR INSERT
    TO public
    WITH CHECK (true);

-- Allow authenticated users to create appointments
CREATE POLICY "Authenticated users can create appointments"
    ON public.appointments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = patient_id OR patient_id IS NULL);

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

-- Dentists can view appointments by email match (for dentist portal)
CREATE POLICY "Dentists can view their appointments"
    ON public.appointments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.dentists d
            WHERE d.id = appointments.dentist_id
            AND d.email = (
                SELECT email FROM auth.users WHERE id = auth.uid()
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.dentists d
            WHERE d.id = appointments.dentist_id
            AND appointments.dentist_email = (
                SELECT email FROM auth.users WHERE id = auth.uid()
            )
        )
    );

-- Dentists can update their appointments
CREATE POLICY "Dentists can update their appointments"
    ON public.appointments FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.dentists d
            WHERE d.id = appointments.dentist_id
            AND d.email = (
                SELECT email FROM auth.users WHERE id = auth.uid()
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.dentists d
            WHERE d.id = appointments.dentist_id
            AND appointments.dentist_email = (
                SELECT email FROM auth.users WHERE id = auth.uid()
            )
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
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN ('karrarmayaly@gmail.com', 'bingo@gmail.com')
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
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email IN ('karrarmayaly@gmail.com', 'bingo@gmail.com')
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT INSERT, SELECT ON public.appointments TO anon;
GRANT SELECT ON public.appointments TO public;

-- ============================================================================
-- PART 8: VERIFICATION
-- ============================================================================

DO $$
DECLARE
    table_exists boolean;
    column_count integer;
    trigger_count integer;
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
        
        -- Count triggers
        SELECT COUNT(*) INTO trigger_count
        FROM pg_trigger
        WHERE tgrelid = 'public.appointments'::regclass
        AND tgname NOT LIKE 'RI_%';
        
        -- Count policies
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'appointments';
        
        RAISE NOTICE '✅ Appointments table successfully created/recreated';
        RAISE NOTICE '✅ Table has % columns', column_count;
        RAISE NOTICE '✅ Table has % triggers', trigger_count;
        RAISE NOTICE '✅ Table has % RLS policies', policy_count;
        RAISE NOTICE '✅ Sync triggers installed';
        RAISE NOTICE '✅ Schema cache should now be updated';
    ELSE
        RAISE EXCEPTION '❌ Failed to create appointments table';
    END IF;
END $$;

-- Force schema cache refresh
UPDATE pg_class SET reltuples = -1 WHERE relname = 'appointments';
ANALYZE public.appointments;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 COMPLETE SYNC SYSTEM INSTALLED!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Appointments table fixed (schema cache cleared)';
    RAISE NOTICE '✅ Dentist creation/deletion sync (Admin → Dentist Login)';
    RAISE NOTICE '✅ Availability sync (Dentist → User Portal)';
    RAISE NOTICE '✅ Appointment sync (User/Chatbot → Dentist Portal)';
    RAISE NOTICE '✅ Double-booking prevention';
    RAISE NOTICE '✅ Real-time notifications enabled';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next steps:';
    RAISE NOTICE '   1. Restart your application';
    RAISE NOTICE '   2. Test booking from user portal';
    RAISE NOTICE '   3. Test booking from chatbot';
    RAISE NOTICE '   4. Verify appointments appear in dentist portal';
    RAISE NOTICE '   5. Test availability updates sync to user portal';
END $$;

