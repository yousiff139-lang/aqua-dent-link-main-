-- ============================================================================
-- CREATE DENTIST AVAILABILITY / TIME SLOTS TABLE
-- Run this in Supabase SQL Editor AFTER running FULL_DATABASE_SETUP.sql
-- ============================================================================

-- Create the dentist_availability table
CREATE TABLE IF NOT EXISTS public.dentist_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dentist_id UUID NOT NULL REFERENCES public.dentists(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    slot_duration_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT unique_dentist_day UNIQUE (dentist_id, day_of_week)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dentist_availability_dentist_id ON public.dentist_availability(dentist_id);
CREATE INDEX IF NOT EXISTS idx_dentist_availability_day_of_week ON public.dentist_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_dentist_availability_is_available ON public.dentist_availability(is_available);

-- Disable RLS for simplicity (enable in production)
ALTER TABLE public.dentist_availability DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.dentist_availability TO anon, authenticated, service_role;

-- ============================================================================
-- INSERT DEFAULT AVAILABILITY FOR ALL DENTISTS
-- Monday=0 through Friday=4, 9:00 AM to 5:00 PM
-- ============================================================================

-- Insert availability for all dentists (Mon-Fri, 9am-5pm, 30-min slots)
INSERT INTO public.dentist_availability (dentist_id, day_of_week, start_time, end_time, is_available, slot_duration_minutes)
SELECT 
    d.id,
    day.day_num,
    '09:00:00'::time,
    '17:00:00'::time,
    true,
    30
FROM public.dentists d
CROSS JOIN (
    SELECT 0 AS day_num UNION ALL  -- Monday
    SELECT 1 UNION ALL             -- Tuesday
    SELECT 2 UNION ALL             -- Wednesday
    SELECT 3 UNION ALL             -- Thursday
    SELECT 4                       -- Friday
) AS day
ON CONFLICT (dentist_id, day_of_week) DO UPDATE SET
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    is_available = EXCLUDED.is_available,
    slot_duration_minutes = EXCLUDED.slot_duration_minutes;

-- ============================================================================
-- CREATE FUNCTION TO GET AVAILABLE TIME SLOTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_available_time_slots(
    p_dentist_id UUID,
    p_date DATE
)
RETURNS TABLE (
    time_slot TIME,
    is_available BOOLEAN
) AS $$
DECLARE
    v_day_of_week INTEGER;
    v_start_time TIME;
    v_end_time TIME;
    v_slot_duration INTEGER;
BEGIN
    -- Get day of week (0=Monday for our system)
    v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;
    -- Convert from PostgreSQL DOW (0=Sunday) to our format (0=Monday)
    IF v_day_of_week = 0 THEN
        v_day_of_week := 6;
    ELSE
        v_day_of_week := v_day_of_week - 1;
    END IF;
    
    -- Get dentist's availability for this day
    SELECT start_time, end_time, slot_duration_minutes
    INTO v_start_time, v_end_time, v_slot_duration
    FROM public.dentist_availability
    WHERE dentist_id = p_dentist_id
      AND day_of_week = v_day_of_week
      AND is_available = true;
    
    -- If no availability found, return empty
    IF v_start_time IS NULL THEN
        RETURN;
    END IF;
    
    -- Generate time slots and check availability
    RETURN QUERY
    WITH slots AS (
        SELECT generate_series(
            v_start_time,
            v_end_time - (v_slot_duration || ' minutes')::interval,
            (v_slot_duration || ' minutes')::interval
        )::time AS slot_time
    )
    SELECT 
        s.slot_time,
        NOT EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.dentist_id = p_dentist_id
              AND a.appointment_date = p_date
              AND a.appointment_time = s.slot_time
              AND a.status IN ('pending', 'confirmed')
        ) AS slot_available
    FROM slots s
    ORDER BY s.slot_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_available_time_slots(UUID, DATE) TO anon, authenticated, service_role;

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================

SELECT 'Dentist Availability Records:' as info, count(*) as count FROM public.dentist_availability;

-- Show sample availability
SELECT 
    d.name as dentist_name,
    da.day_of_week,
    CASE da.day_of_week 
        WHEN 0 THEN 'Monday'
        WHEN 1 THEN 'Tuesday'
        WHEN 2 THEN 'Wednesday'
        WHEN 3 THEN 'Thursday'
        WHEN 4 THEN 'Friday'
        WHEN 5 THEN 'Saturday'
        WHEN 6 THEN 'Sunday'
    END as day_name,
    da.start_time,
    da.end_time,
    da.is_available
FROM public.dentist_availability da
JOIN public.dentists d ON d.id = da.dentist_id
ORDER BY d.name, da.day_of_week
LIMIT 20;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ =====================================================';
  RAISE NOTICE '✅ DENTIST AVAILABILITY TABLE CREATED!';
  RAISE NOTICE '✅ =====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📅 All dentists now have availability Mon-Fri, 9am-5pm';
  RAISE NOTICE '⏱️  Default appointment slots are 30 minutes';
  RAISE NOTICE '';
  RAISE NOTICE 'Booking time slots should now appear in the app!';
END $$;
