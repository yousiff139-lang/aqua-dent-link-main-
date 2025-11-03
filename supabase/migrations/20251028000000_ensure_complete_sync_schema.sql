-- ============================================================================
-- ENSURE COMPLETE MULTI-SYSTEM SYNC SCHEMA
-- This migration ensures all tables match the 3-portal sync requirements
-- ============================================================================

-- Ensure appointments table has pdf_summary_url (alias for pdf_report_url)
DO $$
BEGIN
    -- Check if pdf_summary_url exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'pdf_summary_url'
        AND table_schema = 'public'
    ) THEN
        -- If pdf_report_url exists, use it as the source
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'appointments' 
            AND column_name = 'pdf_report_url'
            AND table_schema = 'public'
        ) THEN
            -- Create pdf_summary_url and copy data from pdf_report_url
            ALTER TABLE public.appointments 
            ADD COLUMN pdf_summary_url TEXT;
            
            UPDATE public.appointments 
            SET pdf_summary_url = pdf_report_url 
            WHERE pdf_report_url IS NOT NULL;
        ELSE
            -- Create pdf_summary_url as new column
            ALTER TABLE public.appointments 
            ADD COLUMN pdf_summary_url TEXT;
        END IF;
    END IF;
END $$;

-- Ensure appointments table has time column (as timestamp for full datetime)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'time'
        AND table_schema = 'public'
    ) THEN
        -- Create time as timestamp combining date and time
        ALTER TABLE public.appointments 
        ADD COLUMN time TIMESTAMPTZ;
        
        -- Populate from existing date and time if available
        UPDATE public.appointments 
        SET time = (appointment_date + appointment_time)::timestamptz
        WHERE appointment_date IS NOT NULL AND appointment_time IS NOT NULL;
    END IF;
END $$;

-- Ensure dentists table has status column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dentists' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.dentists 
        ADD COLUMN status TEXT DEFAULT 'active';
        
        -- Set all existing dentists to active
        UPDATE public.dentists 
        SET status = 'active' 
        WHERE status IS NULL;
        
        -- Add constraint
        ALTER TABLE public.dentists 
        ADD CONSTRAINT dentists_status_check 
        CHECK (status IN ('active', 'inactive'));
    END IF;
END $$;

-- Ensure dentists table has profile_picture column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dentists' 
        AND column_name = 'profile_picture'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.dentists 
        ADD COLUMN profile_picture TEXT;
    END IF;
END $$;

-- Ensure dentists table has specialty column (for backward compatibility with specialization)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dentists' 
        AND column_name = 'specialty'
        AND table_schema = 'public'
    ) THEN
        -- Create specialty and copy from specialization if it exists
        ALTER TABLE public.dentists 
        ADD COLUMN specialty TEXT;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'dentists' 
            AND column_name = 'specialization'
            AND table_schema = 'public'
        ) THEN
            UPDATE public.dentists 
            SET specialty = specialization 
            WHERE specialization IS NOT NULL;
        END IF;
    END IF;
END $$;

-- Ensure available_times is JSONB array format for simpler time slots
DO $$
BEGIN
    -- Ensure available_times column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dentists' 
        AND column_name = 'available_times'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.dentists 
        ADD COLUMN available_times JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Ensure users table exists in public schema (reference to auth.users)
-- Create profiles view/table if needed for easier access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles' 
        AND table_schema = 'public'
    ) THEN
        -- Create profiles table as reference to auth.users
        CREATE TABLE IF NOT EXISTS public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            full_name TEXT,
            email TEXT,
            phone TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        -- RLS policies for profiles
        CREATE POLICY "Users can view own profile"
            ON public.profiles FOR SELECT
            TO authenticated
            USING (auth.uid() = id);
        
        CREATE POLICY "Users can update own profile"
            ON public.profiles FOR UPDATE
            TO authenticated
            USING (auth.uid() = id)
            WITH CHECK (auth.uid() = id);
        
        CREATE POLICY "Users can insert own profile"
            ON public.profiles FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Create index on appointments.pdf_summary_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_pdf_summary_url 
ON public.appointments(pdf_summary_url) 
WHERE pdf_summary_url IS NOT NULL;

-- Create index on dentists.status for filtering active dentists
CREATE INDEX IF NOT EXISTS idx_dentists_status 
ON public.dentists(status) 
WHERE status = 'active';

-- Create function to sync pdf_report_url to pdf_summary_url (bidirectional sync)
CREATE OR REPLACE FUNCTION sync_pdf_urls()
RETURNS TRIGGER AS $$
BEGIN
    -- If pdf_summary_url is updated, also update pdf_report_url
    IF NEW.pdf_summary_url IS DISTINCT FROM OLD.pdf_summary_url THEN
        NEW.pdf_report_url = NEW.pdf_summary_url;
    END IF;
    
    -- If pdf_report_url is updated, also update pdf_summary_url
    IF NEW.pdf_report_url IS DISTINCT FROM OLD.pdf_report_url THEN
        NEW.pdf_summary_url = NEW.pdf_report_url;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync pdf URLs
DROP TRIGGER IF EXISTS sync_pdf_urls_trigger ON public.appointments;
CREATE TRIGGER sync_pdf_urls_trigger
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION sync_pdf_urls();

-- Verify schema
DO $$
DECLARE
    appointments_columns text[];
    dentists_columns text[];
BEGIN
    -- Check appointments table
    SELECT array_agg(column_name) INTO appointments_columns
    FROM information_schema.columns
    WHERE table_name = 'appointments' AND table_schema = 'public';
    
    -- Check dentists table
    SELECT array_agg(column_name) INTO dentists_columns
    FROM information_schema.columns
    WHERE table_name = 'dentists' AND table_schema = 'public';
    
    RAISE NOTICE '✅ Appointments columns: %', array_to_string(appointments_columns, ', ');
    RAISE NOTICE '✅ Dentists columns: %', array_to_string(dentists_columns, ', ');
    RAISE NOTICE '✅ Schema sync migration completed successfully';
END $$;

