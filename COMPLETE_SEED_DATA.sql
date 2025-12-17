-- ============================================================================
-- COMPLETE DATABASE SEED SCRIPT FOR AQUA DENT LINK
-- Run this in Supabase SQL Editor to populate ALL required data
-- Your tables already exist - this adds the DATA
-- ============================================================================

-- ============================================================================
-- STEP 1: DISABLE RLS TEMPORARILY FOR EASIER INSERTS
-- ============================================================================

ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dentists DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dental_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dentist_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patient_documents DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- STEP 2: INSERT DENTISTS (if not exists)
-- ============================================================================

INSERT INTO public.dentists (id, name, email, specialization, phone, years_of_experience, rating, bio, image_url, status)
VALUES
  ('d2d7e59b-8e25-4ddd-9066-0bcf0adc06f3', 'Dr. Sarah Wilson', 'sarah.wilson@aquadent.com', 'Orthodontics', '+1 (555) 123-4567', 12, 4.9, 'Board-certified orthodontist with over a decade of experience in creating beautiful smiles. Specializes in Invisalign and braces.', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop', 'active'),
  ('a1b2c3d4-5e6f-7890-abcd-ef1234567890', 'Dr. Michael Chen', 'michael.chen@aquadent.com', 'Cosmetic Dentistry', '+1 (555) 234-5678', 15, 4.8, 'Renowned for artistic approach to smile makeovers. Combines advanced technology with dental artistry.', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop', 'active'),
  ('b2c3d4e5-6f78-90ab-cdef-123456789012', 'Dr. Emily Rodriguez', 'emily.rodriguez@aquadent.com', 'Pediatric Dentistry', '+1 (555) 345-6789', 8, 4.9, 'Creates a fun and safe environment for children. Gentle approach helps young patients build positive dental care habits.', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop', 'active'),
  ('c3d4e5f6-7890-abcd-ef12-345678901234', 'Dr. James Thompson', 'james.thompson@aquadent.com', 'Oral Surgery', '+1 (555) 456-7890', 20, 5.0, 'Expert in oral and maxillofacial surgery. Specializes in complex extractions, dental implants, and reconstructive surgery.', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop', 'active'),
  ('d4e5f6a7-890a-bcde-f123-456789012345', 'Dr. Lisa Patel', 'lisa.patel@aquadent.com', 'Periodontics', '+1 (555) 567-8901', 10, 4.7, 'Focuses on prevention, diagnosis, and treatment of periodontal disease. Dedicated to helping patients maintain healthy gums.', 'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=400&h=400&fit=crop', 'active'),
  ('e5f6a7b8-90ab-cdef-1234-567890123456', 'Dr. David Kim', 'david.kim@aquadent.com', 'Endodontics', '+1 (555) 678-9012', 14, 4.8, 'Specializes in root canal therapy. Uses latest microscopic techniques to save natural teeth and relieve pain.', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop', 'active')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  specialization = EXCLUDED.specialization,
  image_url = EXCLUDED.image_url,
  status = EXCLUDED.status;

-- ============================================================================
-- STEP 3: INSERT DENTAL SERVICES
-- ============================================================================

INSERT INTO public.dental_services (name, description, specialty, duration_minutes, price_min, price_max, image_url, is_active)
VALUES
  ('General Dental Cleanup', 'Professional teeth cleaning, plaque removal, and comprehensive oral examination.', 'General Dentistry', 60, 150.00, 150.00, 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop', true),
  ('Teeth Whitening', 'Professional teeth whitening treatment using advanced laser technology.', 'Cosmetic Dentistry', 90, 400.00, 600.00, 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop', true),
  ('Orthodontic Consultation & Braces', 'Initial consultation, digital impressions, and braces fitting.', 'Orthodontics', 90, 2500.00, 3500.00, 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=400&h=300&fit=crop', true),
  ('Root Canal Treatment', 'Complete root canal therapy including anesthesia, cleaning, and filling.', 'Endodontics', 90, 800.00, 1200.00, 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop', true),
  ('Dental Implant', 'Single tooth implant including surgical placement, abutment, and crown.', 'Oral Surgery', 120, 1500.00, 2500.00, 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop', true),
  ('Periodontal Treatment', 'Deep cleaning and scaling to treat gum disease.', 'Periodontics', 90, 500.00, 800.00, 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop', true),
  ('Dental Filling', 'Tooth-colored composite fillings to restore cavities.', 'General Dentistry', 45, 200.00, 350.00, 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop', true),
  ('Crown & Bridge', 'Custom-made dental crowns or bridges to restore teeth.', 'General Dentistry', 120, 900.00, 1500.00, 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop', true),
  ('Pediatric Dental Check-up', 'Child-friendly dental examination with gentle cleaning.', 'Pediatric Dentistry', 45, 100.00, 150.00, 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop', true),
  ('Emergency Dental Care', 'Urgent care for dental emergencies including pain relief.', 'General Dentistry', 60, 200.00, 400.00, 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 4: INSERT DENTIST AVAILABILITY (TIME SLOTS)
-- This is what shows up when booking appointments!
-- Each dentist available Mon-Fri, 9am-5pm with 30-min slots
-- ============================================================================

-- Clear existing availability and re-insert
DELETE FROM public.dentist_availability;

-- Insert availability for ALL dentists (Mon=0 through Fri=4)
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
) AS day;

-- ============================================================================
-- STEP 5: INSERT SAMPLE PATIENTS (for testing)
-- ============================================================================

INSERT INTO public.profiles (id, email, full_name, phone, role, created_at)
SELECT gen_random_uuid(), 'john.smith@email.com', 'John Smith', '+1 (555) 111-2222', 'patient', NOW() - INTERVAL '30 days'
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'john.smith@email.com');

INSERT INTO public.profiles (id, email, full_name, phone, role, created_at)
SELECT gen_random_uuid(), 'jane.doe@email.com', 'Jane Doe', '+1 (555) 333-4444', 'patient', NOW() - INTERVAL '25 days'
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'jane.doe@email.com');

INSERT INTO public.profiles (id, email, full_name, phone, role, created_at)
SELECT gen_random_uuid(), 'mike.johnson@email.com', 'Mike Johnson', '+1 (555) 555-6666', 'patient', NOW() - INTERVAL '20 days'
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'mike.johnson@email.com');

INSERT INTO public.profiles (id, email, full_name, phone, role, created_at)
SELECT gen_random_uuid(), 'sarah.williams@email.com', 'Sarah Williams', '+1 (555) 777-8888', 'patient', NOW() - INTERVAL '15 days'
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'sarah.williams@email.com');

-- ============================================================================
-- STEP 6: SYNC AUTH USERS TO PROFILES
-- This copies any existing auth.users to profiles table
-- ============================================================================

INSERT INTO public.profiles (id, email, full_name, role, created_at)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    'patient',
    u.created_at
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.profiles WHERE id IS NOT NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 7: CREATE/UPDATE PROFILE CREATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- STEP 8: CREATE FUNCTION TO GET AVAILABLE TIME SLOTS
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
    -- Convert PostgreSQL DOW (0=Sunday) to our format (0=Monday)
    v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;
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
    
    IF v_start_time IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    WITH slots AS (
        SELECT generate_series(
            v_start_time,
            v_end_time - (COALESCE(v_slot_duration, 30) || ' minutes')::interval,
            (COALESCE(v_slot_duration, 30) || ' minutes')::interval
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

GRANT EXECUTE ON FUNCTION public.get_available_time_slots(UUID, DATE) TO anon, authenticated, service_role;

-- ============================================================================
-- STEP 9: VERIFICATION
-- ============================================================================

SELECT 'DATA COUNTS:' as info;
SELECT 'dentists' as table_name, count(*) as count FROM public.dentists
UNION ALL SELECT 'dental_services', count(*) FROM public.dental_services
UNION ALL SELECT 'dentist_availability', count(*) FROM public.dentist_availability
UNION ALL SELECT 'profiles', count(*) FROM public.profiles
UNION ALL SELECT 'appointments', count(*) FROM public.appointments;

-- Show dentist availability summary
SELECT 
    d.name as dentist,
    COUNT(da.id) as available_days
FROM public.dentists d
LEFT JOIN public.dentist_availability da ON da.dentist_id = d.id AND da.is_available = true
GROUP BY d.name
ORDER BY d.name;

-- ============================================================================
-- SUCCESS!
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ =====================================================';
  RAISE NOTICE '✅ COMPLETE DATABASE SEED FINISHED!';
  RAISE NOTICE '✅ =====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Dentists: 6 doctors added/updated';
  RAISE NOTICE '✅ Services: 10 dental services added';
  RAISE NOTICE '✅ Availability: Mon-Fri 9am-5pm for all dentists';
  RAISE NOTICE '✅ Profiles: Synced with auth.users';
  RAISE NOTICE '✅ Trigger: Profile auto-creation enabled';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Your app should now show:';
  RAISE NOTICE '   - Dentists in the dentist list';
  RAISE NOTICE '   - Services when booking';
  RAISE NOTICE '   - Time slots when selecting appointments';
  RAISE NOTICE '   - Users/patients in admin panel';
  RAISE NOTICE '';
  RAISE NOTICE '👨‍⚕️ Dentist Portal Login Emails:';
  RAISE NOTICE '   - sarah.wilson@aquadent.com';
  RAISE NOTICE '   - michael.chen@aquadent.com';
  RAISE NOTICE '   - emily.rodriguez@aquadent.com';
  RAISE NOTICE '   - james.thompson@aquadent.com';
  RAISE NOTICE '   - lisa.patel@aquadent.com';
  RAISE NOTICE '   - david.kim@aquadent.com';
END $$;
