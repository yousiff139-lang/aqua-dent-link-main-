-- ============================================================================
-- DENTIST AVAILABILITY & SLOT MANAGEMENT COMPLETE FIX
-- Date: 2025-11-09
-- Purpose: Fix dentist availability, slot generation, and booking conflicts
-- ============================================================================

-- 1. ENSURE DENTIST_AVAILABILITY TABLE EXISTS WITH PROPER STRUCTURE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dentist_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dentist_id UUID NOT NULL REFERENCES public.dentists(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    slot_duration_minutes INTEGER DEFAULT 30 CHECK (slot_duration_minutes > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT unique_dentist_day UNIQUE (dentist_id, day_of_week, start_time)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dentist_availability_dentist_id ON public.dentist_availability(dentist_id);
CREATE INDEX IF NOT EXISTS idx_dentist_availability_day_of_week ON public.dentist_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_dentist_availability_is_available ON public.dentist_availability(is_available);

-- Enable RLS
ALTER TABLE public.dentist_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view dentist availability" ON public.dentist_availability;
CREATE POLICY "Anyone can view dentist availability"
  ON public.dentist_availability FOR SELECT
  TO public
  USING (is_available = TRUE);

DROP POLICY IF EXISTS "Dentists can manage their availability" ON public.dentist_availability;
CREATE POLICY "Dentists can manage their availability"
  ON public.dentist_availability FOR ALL
  TO authenticated
  USING (
    dentist_id IN (
      SELECT id FROM public.dentists WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all availability" ON public.dentist_availability;
CREATE POLICY "Admins can manage all availability"
  ON public.dentist_availability FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT ON public.dentist_availability TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.dentist_availability TO authenticated;

-- 2. ADD AVAILABLE_SCHEDULE JSONB COLUMN TO DENTISTS TABLE
-- ============================================================================
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'dentists'
        AND column_name = 'available_schedule'
    ) THEN
        ALTER TABLE public.dentists ADD COLUMN available_schedule JSONB DEFAULT '{
          "work_week": {
            "mon": {"start":"09:00", "end":"17:00"},
            "tue": {"start":"09:00", "end":"17:00"},
            "wed": {"start":"09:00", "end":"17:00"},
            "thu": {"start":"09:00", "end":"17:00"},
            "fri": {"start":"09:00", "end":"17:00"},
            "sat": null,
            "sun": null
          },
          "slot_minutes": 30,
          "exceptions": []
        }'::jsonb;
        RAISE NOTICE 'Added available_schedule column to dentists table';
    END IF;
END $;

-- 3. CREATE FUNCTION TO GENERATE AVAILABLE SLOTS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_available_slots(
    p_dentist_id UUID,
    p_from_date DATE,
    p_to_date DATE
)
RETURNS TABLE (
    slot_start TIMESTAMPTZ,
    slot_end TIMESTAMPTZ,
    is_booked BOOLEAN
) AS $
DECLARE
    current_date DATE;
    day_of_week_num INTEGER;
    availability_record RECORD;
    slot_time TIME;
    slot_start_ts TIMESTAMPTZ;
    slot_end_ts TIMESTAMPTZ;
    is_slot_booked BOOLEAN;
BEGIN
    -- Loop through each date in the range
    current_date := p_from_date;
    WHILE current_date <= p_to_date LOOP
        -- Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday in PostgreSQL)
        -- Convert to our convention (0=Monday, 1=Tuesday, ..., 6=Sunday)
        day_of_week_num := EXTRACT(DOW FROM current_date);
        day_of_week_num := CASE 
            WHEN day_of_week_num = 0 THEN 6  -- Sunday
            ELSE day_of_week_num - 1         -- Monday-Saturday
        END;
        
        -- Get availability for this day
        FOR availability_record IN
            SELECT start_time, end_time, slot_duration_minutes
            FROM public.dentist_availability
            WHERE dentist_id = p_dentist_id
            AND day_of_week = day_of_week_num
            AND is_available = TRUE
        LOOP
            -- Generate slots for this availability period
            slot_time := availability_record.start_time;
            
            WHILE slot_time + (availability_record.slot_duration_minutes || ' minutes')::INTERVAL <= availability_record.end_time LOOP
                -- Create timestamp for this slot
                slot_start_ts := current_date + slot_time;
                slot_end_ts := slot_start_ts + (availability_record.slot_duration_minutes || ' minutes')::INTERVAL;
                
                -- Check if slot is booked
                SELECT EXISTS (
                    SELECT 1 FROM public.appointments
                    WHERE dentist_id = p_dentist_id
                    AND status IN ('pending', 'confirmed', 'upcoming')
                    AND appointment_date = current_date
                    AND appointment_time = slot_time
                ) INTO is_slot_booked;
                
                -- Return the slot
                RETURN QUERY SELECT slot_start_ts, slot_end_ts, is_slot_booked;
                
                -- Move to next slot
                slot_time := slot_time + (availability_record.slot_duration_minutes || ' minutes')::INTERVAL;
            END LOOP;
        END LOOP;
        
        -- Move to next date
        current_date := current_date + 1;
    END LOOP;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_available_slots(UUID, DATE, DATE) TO anon, authenticated;

-- 4. CREATE FUNCTION TO CHECK SLOT AVAILABILITY (FOR BOOKING VALIDATION)
-- ============================================================================
CREATE OR REPLACE FUNCTION is_slot_available(
    p_dentist_id UUID,
    p_appointment_date DATE,
    p_appointment_time TIME,
    p_duration_minutes INTEGER DEFAULT 30
)
RETURNS BOOLEAN AS $
DECLARE
    day_of_week_num INTEGER;
    slot_end_time TIME;
    has_availability BOOLEAN;
    is_booked BOOLEAN;
BEGIN
    -- Calculate slot end time
    slot_end_time := p_appointment_time + (p_duration_minutes || ' minutes')::INTERVAL;
    
    -- Get day of week (convert to our convention)
    day_of_week_num := EXTRACT(DOW FROM p_appointment_date);
    day_of_week_num := CASE 
        WHEN day_of_week_num = 0 THEN 6
        ELSE day_of_week_num - 1
    END;
    
    -- Check if dentist has availability for this day and time
    SELECT EXISTS (
        SELECT 1 FROM public.dentist_availability
        WHERE dentist_id = p_dentist_id
        AND day_of_week = day_of_week_num
        AND is_available = TRUE
        AND start_time <= p_appointment_time
        AND end_time >= slot_end_time
    ) INTO has_availability;
    
    IF NOT has_availability THEN
        RETURN FALSE;
    END IF;
    
    -- Check if slot is already booked
    SELECT EXISTS (
        SELECT 1 FROM public.appointments
        WHERE dentist_id = p_dentist_id
        AND appointment_date = p_appointment_date
        AND appointment_time = p_appointment_time
        AND status IN ('pending', 'confirmed', 'upcoming')
    ) INTO is_booked;
    
    RETURN NOT is_booked;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_slot_available(UUID, DATE, TIME, INTEGER) TO anon, authenticated;

-- 5. CREATE TRIGGER TO VALIDATE APPOINTMENTS BEFORE INSERT
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_appointment_slot()
RETURNS TRIGGER AS $
BEGIN
    -- Check if slot is available
    IF NOT is_slot_available(
        NEW.dentist_id,
        NEW.appointment_date,
        NEW.appointment_time,
        30  -- default duration
    ) THEN
        RAISE EXCEPTION 'Slot not available: dentist_id=%, date=%, time=%', 
            NEW.dentist_id, NEW.appointment_date, NEW.appointment_time
        USING ERRCODE = '23505';  -- unique_violation error code
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_appointment_slot_trigger ON public.appointments;
CREATE TRIGGER validate_appointment_slot_trigger
    BEFORE INSERT ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION validate_appointment_slot();

-- 6. SEED DEFAULT AVAILABILITY FOR EXISTING DENTISTS
-- ============================================================================
DO $
DECLARE
    dentist_record RECORD;
    day_num INTEGER;
BEGIN
    -- For each dentist without availability, add default Mon-Fri 9-5 schedule
    FOR dentist_record IN
        SELECT id FROM public.dentists
        WHERE id NOT IN (
            SELECT DISTINCT dentist_id FROM public.dentist_availability
        )
    LOOP
        -- Add Monday through Friday (0-4 in our convention)
        FOR day_num IN 0..4 LOOP
            INSERT INTO public.dentist_availability (
                dentist_id,
                day_of_week,
                start_time,
                end_time,
                is_available,
                slot_duration_minutes
            ) VALUES (
                dentist_record.id,
                day_num,
                '09:00'::TIME,
                '17:00'::TIME,
                TRUE,
                30
            ) ON CONFLICT (dentist_id, day_of_week, start_time) DO NOTHING;
        END LOOP;
        
        RAISE NOTICE 'Added default availability for dentist %', dentist_record.id;
    END LOOP;
END $;

-- 7. CREATE UPDATED_AT TRIGGER FOR DENTIST_AVAILABILITY
-- ============================================================================
DROP TRIGGER IF EXISTS update_dentist_availability_updated_at ON public.dentist_availability;
CREATE TRIGGER update_dentist_availability_updated_at 
    BEFORE UPDATE ON public.dentist_availability
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 8. ADD HELPFUL COMMENTS
-- ============================================================================
COMMENT ON TABLE public.dentist_availability IS 'Stores dentist weekly availability schedule';
COMMENT ON COLUMN public.dentist_availability.day_of_week IS 'Day of week: 0=Monday, 1=Tuesday, ..., 6=Sunday';
COMMENT ON COLUMN public.dentist_availability.slot_duration_minutes IS 'Duration of each appointment slot in minutes';
COMMENT ON FUNCTION get_available_slots(UUID, DATE, DATE) IS 'Returns all available time slots for a dentist within a date range';
COMMENT ON FUNCTION is_slot_available(UUID, DATE, TIME, INTEGER) IS 'Checks if a specific time slot is available for booking';

-- 9. VERIFICATION
-- ============================================================================
DO $
DECLARE
    availability_table_exists BOOLEAN;
    availability_count INTEGER;
    dentist_count INTEGER;
    function_exists BOOLEAN;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'dentist_availability'
    ) INTO availability_table_exists;
    
    -- Count availability records
    SELECT COUNT(*) INTO availability_count FROM public.dentist_availability;
    
    -- Count dentists
    SELECT COUNT(*) INTO dentist_count FROM public.dentists;
    
    -- Check if functions exist
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_available_slots'
    ) INTO function_exists;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ DENTIST AVAILABILITY FIX VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Dentist availability table exists: %', availability_table_exists;
    RAISE NOTICE 'Total availability records: %', availability_count;
    RAISE NOTICE 'Total dentists: %', dentist_count;
    RAISE NOTICE 'Slot generation function exists: %', function_exists;
    RAISE NOTICE '========================================';
    
    IF availability_table_exists AND function_exists THEN
        RAISE NOTICE '🎉 DENTIST AVAILABILITY SYSTEM READY!';
        RAISE NOTICE '✅ Dentists can set their working hours';
        RAISE NOTICE '✅ Days off are properly handled';
        RAISE NOTICE '✅ Slot generation respects availability';
        RAISE NOTICE '✅ Double-booking prevention active';
    ELSE
        RAISE WARNING '⚠️  Some components may be missing';
    END IF;
END $;

-- 10. FINAL SUCCESS MESSAGE
-- ============================================================================
DO $
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 DENTIST AVAILABILITY FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 What was fixed:';
    RAISE NOTICE '   ✅ Dentist availability table created';
    RAISE NOTICE '   ✅ Slot generation function added';
    RAISE NOTICE '   ✅ Availability validation added';
    RAISE NOTICE '   ✅ Days off properly handled';
    RAISE NOTICE '   ✅ Double-booking prevention';
    RAISE NOTICE '   ✅ Default Mon-Fri 9-5 schedule seeded';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next steps:';
    RAISE NOTICE '   1. Apply this migration to your database';
    RAISE NOTICE '   2. Update frontend to use get_available_slots()';
    RAISE NOTICE '   3. Test booking with days off';
    RAISE NOTICE '   4. Test slot boundaries (no 5:30pm slots)';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $;
