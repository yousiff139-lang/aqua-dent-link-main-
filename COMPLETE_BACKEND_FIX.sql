-- ============================================================================
-- COMPLETE BACKEND FIX FOR AQUA DENT LINK
-- ============================================================================
-- This migration ensures all backend functionality works correctly:
-- 1. Admin app can fetch appointments, patients, and dentists
-- 2. Dentist portal can mark appointments as completed
-- 3. Adding/removing dentists properly syncs across all systems
-- 4. All RLS policies are correctly configured
-- ============================================================================

-- ============================================================================
-- PART 1: ENSURE ALL REQUIRED TABLES EXIST
-- ============================================================================

-- Profiles table (for all users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dentists table
CREATE TABLE IF NOT EXISTS public.dentists (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    specialization TEXT,
    specialty TEXT,
    phone TEXT,
    bio TEXT,
    education TEXT,
    years_of_experience INTEGER,
    experience_years INTEGER,
    profile_picture TEXT,
    image_url TEXT,
    rating DECIMAL(3,2) DEFAULT 0.0,
    status TEXT DEFAULT 'active',
    available_days JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'dentist', 'patient')),
    dentist_id UUID REFERENCES public.dentists(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    patient_email TEXT NOT NULL,
    patient_phone TEXT,
    dentist_id UUID REFERENCES public.dentists(id) ON DELETE SET NULL,
    dentist_name TEXT,
    dentist_email TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled')),
    reason TEXT,
    symptoms TEXT,
    chief_complaint TEXT,
    notes TEXT,
    payment_method TEXT DEFAULT 'cash',
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_intent_id TEXT,
    amount DECIMAL(10,2),
    pdf_report_url TEXT,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Availability table
CREATE TABLE IF NOT EXISTS public.availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dentist_id UUID REFERENCES public.dentists(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dentist_id, day_of_week, start_time)
);

-- Realtime events table (for sync tracking)
CREATE TABLE IF NOT EXISTS public.realtime_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id UUID,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 2: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_dentists_email ON public.dentists(email);
CREATE INDEX IF NOT EXISTS idx_dentists_status ON public.dentists(status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_id ON public.appointments(dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_email ON public.appointments(dentist_email);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_email ON public.appointments(patient_email);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_availability_dentist_id ON public.availability(dentist_id);
CREATE INDEX IF NOT EXISTS idx_realtime_events_table ON public.realtime_events(table_name);
CREATE INDEX IF NOT EXISTS idx_realtime_events_created ON public.realtime_events(created_at);

-- ============================================================================
-- PART 3: DROP EXISTING RLS POLICIES (TO RECREATE THEM CORRECTLY)
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "dentists_select_policy" ON public.dentists;
DROP POLICY IF EXISTS "dentists_insert_policy" ON public.dentists;
DROP POLICY IF EXISTS "dentists_update_policy" ON public.dentists;
DROP POLICY IF EXISTS "dentists_delete_policy" ON public.dentists;
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_policy" ON public.user_roles;
DROP POLICY IF EXISTS "appointments_select_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_policy" ON public.appointments;
DROP POLICY IF EXISTS "appointments_delete_policy" ON public.appointments;
DROP POLICY IF EXISTS "availability_select_policy" ON public.availability;
DROP POLICY IF EXISTS "availability_insert_policy" ON public.availability;
DROP POLICY IF EXISTS "availability_update_policy" ON public.availability;
DROP POLICY IF EXISTS "availability_delete_policy" ON public.availability;
DROP POLICY IF EXISTS "realtime_events_select_policy" ON public.realtime_events;
DROP POLICY IF EXISTS "realtime_events_insert_policy" ON public.realtime_events;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: CREATE HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is dentist
CREATE OR REPLACE FUNCTION public.is_dentist()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'dentist'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's dentist ID
CREATE OR REPLACE FUNCTION public.get_dentist_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT dentist_id FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'dentist'
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 5: CREATE RLS POLICIES
-- ============================================================================

-- Profiles policies
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id OR public.is_admin()
    );

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id OR public.is_admin()
    );

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id OR public.is_admin()
    );

-- Dentists policies (public can view, admin can manage)
CREATE POLICY "dentists_select_policy" ON public.dentists
    FOR SELECT USING (true); -- Everyone can view dentists

CREATE POLICY "dentists_insert_policy" ON public.dentists
    FOR INSERT WITH CHECK (
        public.is_admin()
    );

CREATE POLICY "dentists_update_policy" ON public.dentists
    FOR UPDATE USING (
        auth.uid() = id OR public.is_admin()
    );

CREATE POLICY "dentists_delete_policy" ON public.dentists
    FOR DELETE USING (
        public.is_admin()
    );

-- User roles policies
CREATE POLICY "user_roles_select_policy" ON public.user_roles
    FOR SELECT USING (
        auth.uid() = user_id OR public.is_admin()
    );

CREATE POLICY "user_roles_insert_policy" ON public.user_roles
    FOR INSERT WITH CHECK (
        public.is_admin()
    );

-- Appointments policies
CREATE POLICY "appointments_select_policy" ON public.appointments
    FOR SELECT USING (
        public.is_admin() OR
        auth.uid() = patient_id OR
        dentist_id = public.get_dentist_id() OR
        dentist_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "appointments_insert_policy" ON public.appointments
    FOR INSERT WITH CHECK (
        public.is_admin() OR
        auth.uid() = patient_id OR
        true -- Allow anonymous booking
    );

CREATE POLICY "appointments_update_policy" ON public.appointments
    FOR UPDATE USING (
        public.is_admin() OR
        auth.uid() = patient_id OR
        dentist_id = public.get_dentist_id() OR
        dentist_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "appointments_delete_policy" ON public.appointments
    FOR DELETE USING (
        public.is_admin() OR
        auth.uid() = patient_id
    );

-- Availability policies
CREATE POLICY "availability_select_policy" ON public.availability
    FOR SELECT USING (true); -- Everyone can view availability

CREATE POLICY "availability_insert_policy" ON public.availability
    FOR INSERT WITH CHECK (
        public.is_admin() OR
        dentist_id = public.get_dentist_id()
    );

CREATE POLICY "availability_update_policy" ON public.availability
    FOR UPDATE USING (
        public.is_admin() OR
        dentist_id = public.get_dentist_id()
    );

CREATE POLICY "availability_delete_policy" ON public.availability
    FOR DELETE USING (
        public.is_admin() OR
        dentist_id = public.get_dentist_id()
    );

-- Realtime events policies
CREATE POLICY "realtime_events_select_policy" ON public.realtime_events
    FOR SELECT USING (
        public.is_admin()
    );

CREATE POLICY "realtime_events_insert_policy" ON public.realtime_events
    FOR INSERT WITH CHECK (true); -- System can insert events

-- ============================================================================
-- PART 6: CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_dentists_updated_at ON public.dentists;
CREATE TRIGGER update_dentists_updated_at
    BEFORE UPDATE ON public.dentists
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_availability_updated_at ON public.availability;
CREATE TRIGGER update_availability_updated_at
    BEFORE UPDATE ON public.availability
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PART 7: CREATE REALTIME SYNC TRIGGERS
-- ============================================================================

-- Function to log realtime events
CREATE OR REPLACE FUNCTION public.log_realtime_event()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.realtime_events (table_name, event_type, record_id, payload)
        VALUES (TG_TABLE_NAME, TG_OP, OLD.id, row_to_json(OLD)::jsonb);
        RETURN OLD;
    ELSE
        INSERT INTO public.realtime_events (table_name, event_type, record_id, payload)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(NEW)::jsonb);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply realtime triggers
DROP TRIGGER IF EXISTS appointments_realtime_trigger ON public.appointments;
CREATE TRIGGER appointments_realtime_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.log_realtime_event();

DROP TRIGGER IF EXISTS dentists_realtime_trigger ON public.dentists;
CREATE TRIGGER dentists_realtime_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.dentists
    FOR EACH ROW
    EXECUTE FUNCTION public.log_realtime_event();

-- ============================================================================
-- PART 8: ENABLE REALTIME FOR TABLES
-- ============================================================================

-- Enable realtime for appointments (ignore if already added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication, ignore
    WHEN undefined_table THEN
        NULL; -- Table doesn't exist yet, ignore
END $$;

-- Enable realtime for dentists (ignore if already added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dentists;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication, ignore
    WHEN undefined_table THEN
        NULL; -- Table doesn't exist yet, ignore
END $$;

-- Enable realtime for profiles (ignore if already added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Table already in publication, ignore
    WHEN undefined_table THEN
        NULL; -- Table doesn't exist yet, ignore
END $$;

-- ============================================================================
-- PART 9: GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

GRANT SELECT ON public.dentists TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.dentists TO authenticated;

GRANT SELECT, INSERT ON public.user_roles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability TO authenticated;

GRANT SELECT, INSERT ON public.realtime_events TO authenticated;

-- Grant permissions to service role (for backend)
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.dentists TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.appointments TO service_role;
GRANT ALL ON public.availability TO service_role;
GRANT ALL ON public.realtime_events TO service_role;

-- ============================================================================
-- PART 10: DATA MIGRATION AND CLEANUP
-- ============================================================================

-- Add missing columns if they don't exist (safe to run multiple times)
DO $$ 
BEGIN
    -- Add specialty column to dentists if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'dentists' 
                   AND column_name = 'specialty') THEN
        ALTER TABLE public.dentists ADD COLUMN specialty TEXT;
    END IF;

    -- Add experience_years column to dentists if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'dentists' 
                   AND column_name = 'experience_years') THEN
        ALTER TABLE public.dentists ADD COLUMN experience_years INTEGER;
    END IF;

    -- Add image_url column to dentists if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'dentists' 
                   AND column_name = 'image_url') THEN
        ALTER TABLE public.dentists ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Sync specialty and specialization fields (only if both columns exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'dentists' 
               AND column_name = 'specialty') THEN
        UPDATE public.dentists
        SET specialization = COALESCE(specialization, specialty, 'General Dentistry'),
            specialty = COALESCE(specialty, specialization, 'General Dentistry')
        WHERE specialization IS NULL OR specialty IS NULL;
    END IF;
END $$;

-- Sync experience fields (only if both columns exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'dentists' 
               AND column_name = 'experience_years') THEN
        UPDATE public.dentists
        SET years_of_experience = COALESCE(years_of_experience, experience_years, 0),
            experience_years = COALESCE(experience_years, years_of_experience, 0)
        WHERE years_of_experience IS NULL OR experience_years IS NULL;
    END IF;
END $$;

-- Sync image fields (only if both columns exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'dentists' 
               AND column_name = 'image_url') THEN
        UPDATE public.dentists
        SET profile_picture = COALESCE(profile_picture, image_url),
            image_url = COALESCE(image_url, profile_picture)
        WHERE profile_picture IS NULL OR image_url IS NULL;
    END IF;
END $$;

-- Ensure all dentists have active status (only if status column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'dentists' 
               AND column_name = 'status') THEN
        UPDATE public.dentists
        SET status = 'active'
        WHERE status IS NULL;
    END IF;
END $$;

-- Update appointment statuses for consistency (only if status column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'appointments' 
               AND column_name = 'status') THEN
        UPDATE public.appointments
        SET status = 'upcoming'
        WHERE status = 'confirmed'
        AND appointment_date >= CURRENT_DATE;
    END IF;
END $$;

-- ============================================================================
-- PART 11: CREATE VIEWS FOR ADMIN DASHBOARD
-- ============================================================================

-- View for admin to see all appointments with dentist info
CREATE OR REPLACE VIEW public.admin_appointments_view AS
SELECT 
    a.*,
    d.name as dentist_full_name,
    d.specialization as dentist_specialization,
    d.phone as dentist_phone
FROM public.appointments a
LEFT JOIN public.dentists d ON a.dentist_id = d.id
ORDER BY a.created_at DESC;

-- View for admin to see all patients with stats
CREATE OR REPLACE VIEW public.admin_patients_view AS
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.created_at,
    COUNT(a.id) as total_appointments,
    MAX(a.appointment_date) as last_appointment_date
FROM public.profiles p
LEFT JOIN public.appointments a ON p.id = a.patient_id
GROUP BY p.id, p.full_name, p.email, p.phone, p.created_at
ORDER BY p.created_at DESC;

-- View for admin to see all dentists with stats
CREATE OR REPLACE VIEW public.admin_dentists_view AS
SELECT 
    d.*,
    COUNT(DISTINCT a.id) as total_appointments,
    COUNT(DISTINCT CASE WHEN a.status IN ('pending', 'confirmed', 'upcoming') THEN a.id END) as upcoming_appointments
FROM public.dentists d
LEFT JOIN public.appointments a ON d.id = a.dentist_id
GROUP BY d.id
ORDER BY d.created_at DESC;

-- Grant view permissions
GRANT SELECT ON public.admin_appointments_view TO authenticated;
GRANT SELECT ON public.admin_patients_view TO authenticated;
GRANT SELECT ON public.admin_dentists_view TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check tables exist
SELECT 
    'profiles' as table_name, COUNT(*) as row_count FROM public.profiles
UNION ALL
SELECT 'dentists', COUNT(*) FROM public.dentists
UNION ALL
SELECT 'user_roles', COUNT(*) FROM public.user_roles
UNION ALL
SELECT 'appointments', COUNT(*) FROM public.appointments
UNION ALL
SELECT 'availability', COUNT(*) FROM public.availability
UNION ALL
SELECT 'realtime_events', COUNT(*) FROM public.realtime_events;

-- Check RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'dentists', 'user_roles', 'appointments', 'availability', 'realtime_events');

-- Check policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ COMPLETE BACKEND FIX APPLIED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE 'The following has been configured:';
    RAISE NOTICE '1. ✅ All required tables created with proper structure';
    RAISE NOTICE '2. ✅ Indexes created for optimal performance';
    RAISE NOTICE '3. ✅ RLS policies configured for security';
    RAISE NOTICE '4. ✅ Admin can access all appointments, patients, and dentists';
    RAISE NOTICE '5. ✅ Dentists can mark appointments as completed';
    RAISE NOTICE '6. ✅ Adding/removing dentists syncs across all systems';
    RAISE NOTICE '7. ✅ Realtime sync enabled for instant updates';
    RAISE NOTICE '8. ✅ Admin dashboard views created';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Restart your backend server';
    RAISE NOTICE '2. Restart your admin app';
    RAISE NOTICE '3. Restart your dentist portal';
    RAISE NOTICE '4. Test all functionality';
END $$;
