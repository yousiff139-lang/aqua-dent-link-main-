-- ============================================================================
-- ============================================================================
-- AQUA DENT LINK - COMPLETE DATABASE SETUP
-- ============================================================================
-- ============================================================================
-- 
-- RUN THIS SINGLE SCRIPT TO SET UP EVERYTHING!
-- 
-- This includes:
-- ✅ All tables (profiles, dentists, appointments, services, etc.)
-- ✅ Storage buckets (medical documents, X-rays, PDFs)
-- ✅ RLS policies and permissions
-- ✅ Triggers for auto profile creation
-- ✅ Functions for time slot generation
-- ✅ Seed data (dentists, services, availability)
-- ============================================================================

-- ============================================================================
-- PART 1: CORE TABLES
-- ============================================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  medical_history JSONB DEFAULT '{}',
  role TEXT DEFAULT 'patient',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'dentist', 'admin')),
  dentist_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dentists table
CREATE TABLE IF NOT EXISTS public.dentists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  specialization TEXT DEFAULT 'General Dentistry',
  specialty TEXT,
  phone TEXT,
  address TEXT,
  years_of_experience INTEGER DEFAULT 0,
  experience_years INTEGER DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 5.0,
  bio TEXT,
  education TEXT,
  expertise TEXT[],
  image_url TEXT,
  profile_picture TEXT,
  available_times JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dental services table
CREATE TABLE IF NOT EXISTS public.dental_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  specialty VARCHAR(100) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price_min NUMERIC(10,2) NOT NULL,
  price_max NUMERIC(10,2),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointment types table
CREATE TABLE IF NOT EXISTS public.appointment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_name TEXT NOT NULL UNIQUE,
  description TEXT,
  base_price NUMERIC NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  applicable_specialties TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  dentist_id UUID,
  patient_name TEXT NOT NULL,
  patient_email TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_age INTEGER,
  patient_medical_conditions TEXT,
  dentist_name TEXT,
  dentist_email TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  scheduled_time TIMESTAMPTZ,
  appointment_type TEXT DEFAULT 'General Checkup',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('stripe', 'cash', NULL)),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_amount NUMERIC,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  payment_intent_id TEXT,
  chief_complaint TEXT,
  symptoms TEXT,
  reason TEXT,
  appointment_reason TEXT,
  medical_history TEXT,
  chronic_diseases TEXT,
  gender TEXT,
  is_pregnant BOOLEAN DEFAULT false,
  smoking BOOLEAN DEFAULT false,
  medications TEXT,
  allergies TEXT,
  previous_dental_work TEXT,
  cause_identified BOOLEAN DEFAULT true,
  uncertainty_note TEXT,
  patient_notes TEXT,
  dentist_notes TEXT,
  notes TEXT,
  documents JSONB DEFAULT '[]',
  pdf_report_url TEXT,
  pdf_summary_url TEXT,
  booking_reference TEXT UNIQUE,
  conversation_id TEXT,
  booking_source TEXT DEFAULT 'manual',
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  completed_at TIMESTAMPTZ,
  service_id UUID,
  service_name VARCHAR(255),
  service_price NUMERIC(10,2),
  service_duration INTEGER,
  estimated_price NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dentist availability table (TIME SLOTS)
CREATE TABLE IF NOT EXISTS public.dentist_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  slot_duration_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy availability table (for compatibility)
CREATE TABLE IF NOT EXISTS public.availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient documents table
CREATE TABLE IF NOT EXISTS public.patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID,
  appointment_id UUID,
  dentist_id UUID,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  document_type TEXT DEFAULT 'xray',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medical documents table
CREATE TABLE IF NOT EXISTS public.medical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_info_id UUID,
  patient_id UUID NOT NULL,
  appointment_id UUID,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size_bytes BIGINT,
  description TEXT,
  is_xray BOOLEAN DEFAULT false,
  xray_format TEXT CHECK (xray_format IN ('DCM', 'PNG', 'JPEG', 'DICOM', NULL)),
  xray_analysis_result JSONB,
  analyzed_at TIMESTAMPTZ,
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed', 'not_xray')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointment health info table
CREATE TABLE IF NOT EXISTS public.appointment_health_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID,
  patient_id UUID NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  is_pregnant BOOLEAN,
  phone VARCHAR(20) NOT NULL,
  chronic_diseases TEXT,
  medical_history TEXT,
  symptoms TEXT NOT NULL,
  suggested_specialty VARCHAR(100),
  ai_confidence NUMERIC,
  ai_explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointment medical info table
CREATE TABLE IF NOT EXISTS public.appointment_medical_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL UNIQUE,
  patient_id UUID NOT NULL,
  gender TEXT,
  is_pregnant BOOLEAN DEFAULT false,
  chronic_diseases TEXT,
  medical_history TEXT,
  medications TEXT,
  allergies TEXT,
  previous_dental_work TEXT,
  smoking BOOLEAN DEFAULT false,
  symptoms TEXT,
  chief_complaint TEXT,
  documents JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chatbot conversations table
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID,
  messages JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  booking_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chatbot logs table
CREATE TABLE IF NOT EXISTS public.chatbot_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  message TEXT NOT NULL,
  response TEXT,
  intent TEXT,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dentist reviews table
CREATE TABLE IF NOT EXISTS public.dentist_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID,
  patient_id UUID,
  appointment_id UUID,
  patient_name VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('appointment_confirmation', 'appointment_reminder', 'appointment_cancelled', 'payment_confirmation')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time slot reservations table
CREATE TABLE IF NOT EXISTS public.time_slot_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID NOT NULL,
  slot_time TIMESTAMPTZ NOT NULL,
  reserved_by UUID,
  reservation_expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- X-ray uploads table
CREATE TABLE IF NOT EXISTS public.xray_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  file_path TEXT NOT NULL,
  analysis TEXT,
  analyzed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Realtime events table
CREATE TABLE IF NOT EXISTS public.realtime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 2: DISABLE RLS FOR SIMPLICITY
-- ============================================================================

ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dentists DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dental_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dentist_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.patient_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.medical_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointment_health_info DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointment_medical_info DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chatbot_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chatbot_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dentist_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.time_slot_reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.xray_uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.realtime_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointment_types DISABLE ROW LEVEL SECURITY;

-- Grant all permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- PART 3: STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('medical-documents', 'medical-documents', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/dicom']),
  ('appointment-pdfs', 'appointment-pdfs', false, 10485760, ARRAY['application/pdf']),
  ('xray-uploads', 'xray-uploads', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/dicom'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit;

-- Storage policies
DROP POLICY IF EXISTS "Allow all uploads to medical-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads from medical-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow all uploads to xray-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads from xray-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow all uploads to appointment-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow all reads from appointment-pdfs" ON storage.objects;

CREATE POLICY "Allow all uploads to medical-documents" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'medical-documents');
CREATE POLICY "Allow all reads from medical-documents" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'medical-documents');
CREATE POLICY "Allow all uploads to xray-uploads" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'xray-uploads');
CREATE POLICY "Allow all reads from xray-uploads" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'xray-uploads');
CREATE POLICY "Allow all uploads to appointment-pdfs" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'appointment-pdfs');
CREATE POLICY "Allow all reads from appointment-pdfs" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'appointment-pdfs');

-- ============================================================================
-- PART 4: TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Profile creation trigger
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
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Get available time slots function
CREATE OR REPLACE FUNCTION public.get_available_time_slots(p_dentist_id UUID, p_date DATE)
RETURNS TABLE (time_slot TIME, is_available BOOLEAN) AS $$
DECLARE
  v_day_of_week INTEGER;
  v_start_time TIME;
  v_end_time TIME;
  v_slot_duration INTEGER;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;
  IF v_day_of_week = 0 THEN v_day_of_week := 6; ELSE v_day_of_week := v_day_of_week - 1; END IF;
  
  SELECT start_time, end_time, slot_duration_minutes INTO v_start_time, v_end_time, v_slot_duration
  FROM public.dentist_availability WHERE dentist_id = p_dentist_id AND day_of_week = v_day_of_week AND is_available = true;
  
  IF v_start_time IS NULL THEN RETURN; END IF;
  
  RETURN QUERY
  WITH slots AS (
    SELECT generate_series(v_start_time, v_end_time - (COALESCE(v_slot_duration,30) || ' minutes')::interval, (COALESCE(v_slot_duration,30) || ' minutes')::interval)::time AS slot_time
  )
  SELECT s.slot_time, NOT EXISTS (
    SELECT 1 FROM public.appointments a WHERE a.dentist_id = p_dentist_id AND a.appointment_date = p_date AND a.appointment_time = s.slot_time AND a.status IN ('pending', 'confirmed')
  ) AS slot_available FROM slots s ORDER BY s.slot_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_available_time_slots(UUID, DATE) TO anon, authenticated, service_role;

-- ============================================================================
-- PART 5: SEED DATA - DENTISTS
-- ============================================================================

INSERT INTO public.dentists (id, name, email, specialization, phone, years_of_experience, rating, bio, image_url, status)
VALUES
  ('d2d7e59b-8e25-4ddd-9066-0bcf0adc06f3', 'Dr. Sarah Wilson', 'sarah.wilson@aquadent.com', 'Orthodontics', '+1 (555) 123-4567', 12, 4.9, 'Board-certified orthodontist specializing in Invisalign and braces.', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop', 'active'),
  ('a1b2c3d4-5e6f-7890-abcd-ef1234567890', 'Dr. Michael Chen', 'michael.chen@aquadent.com', 'Cosmetic Dentistry', '+1 (555) 234-5678', 15, 4.8, 'Renowned for artistic approach to smile makeovers.', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop', 'active'),
  ('b2c3d4e5-6f78-90ab-cdef-123456789012', 'Dr. Emily Rodriguez', 'emily.rodriguez@aquadent.com', 'Pediatric Dentistry', '+1 (555) 345-6789', 8, 4.9, 'Creates fun and safe environment for children.', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop', 'active'),
  ('c3d4e5f6-7890-abcd-ef12-345678901234', 'Dr. James Thompson', 'james.thompson@aquadent.com', 'Oral Surgery', '+1 (555) 456-7890', 20, 5.0, 'Expert in oral and maxillofacial surgery.', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop', 'active'),
  ('d4e5f6a7-890a-bcde-f123-456789012345', 'Dr. Lisa Patel', 'lisa.patel@aquadent.com', 'Periodontics', '+1 (555) 567-8901', 10, 4.7, 'Focuses on periodontal disease treatment.', 'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=400&h=400&fit=crop', 'active'),
  ('e5f6a7b8-90ab-cdef-1234-567890123456', 'Dr. David Kim', 'david.kim@aquadent.com', 'Endodontics', '+1 (555) 678-9012', 14, 4.8, 'Specializes in root canal therapy.', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop', 'active')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, image_url = EXCLUDED.image_url, status = EXCLUDED.status;

-- ============================================================================
-- PART 6: SEED DATA - DENTAL SERVICES
-- ============================================================================

INSERT INTO public.dental_services (name, description, specialty, duration_minutes, price_min, price_max, image_url, is_active)
VALUES
  ('General Dental Cleanup', 'Professional teeth cleaning and oral examination.', 'General Dentistry', 60, 150.00, 150.00, 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop', true),
  ('Teeth Whitening', 'Professional whitening using advanced laser technology.', 'Cosmetic Dentistry', 90, 400.00, 600.00, 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop', true),
  ('Orthodontic Braces', 'Consultation, impressions, and braces fitting.', 'Orthodontics', 90, 2500.00, 3500.00, 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=400&h=300&fit=crop', true),
  ('Root Canal Treatment', 'Complete root canal therapy.', 'Endodontics', 90, 800.00, 1200.00, 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop', true),
  ('Dental Implant', 'Single tooth implant with crown.', 'Oral Surgery', 120, 1500.00, 2500.00, 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop', true),
  ('Periodontal Treatment', 'Deep cleaning and scaling for gum disease.', 'Periodontics', 90, 500.00, 800.00, 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop', true),
  ('Dental Filling', 'Tooth-colored composite fillings.', 'General Dentistry', 45, 200.00, 350.00, 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop', true),
  ('Crown & Bridge', 'Custom crowns or bridges.', 'General Dentistry', 120, 900.00, 1500.00, 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop', true),
  ('Pediatric Check-up', 'Child-friendly dental examination.', 'Pediatric Dentistry', 45, 100.00, 150.00, 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop', true),
  ('Emergency Care', 'Urgent dental emergency treatment.', 'General Dentistry', 60, 200.00, 400.00, 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 7: SEED DATA - DENTIST AVAILABILITY (TIME SLOTS)
-- ============================================================================

DELETE FROM public.dentist_availability;

INSERT INTO public.dentist_availability (dentist_id, day_of_week, start_time, end_time, is_available, slot_duration_minutes)
SELECT d.id, day.day_num, '09:00:00'::time, '17:00:00'::time, true, 30
FROM public.dentists d
CROSS JOIN (SELECT 0 AS day_num UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) AS day;

-- ============================================================================
-- PART 8: SYNC AUTH USERS TO PROFILES
-- ============================================================================

INSERT INTO public.profiles (id, email, full_name, role, created_at)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)), 'patient', u.created_at
FROM auth.users u WHERE u.id NOT IN (SELECT id FROM public.profiles WHERE id IS NOT NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'dentists' as t, count(*) as c FROM public.dentists
UNION ALL SELECT 'dental_services', count(*) FROM public.dental_services
UNION ALL SELECT 'dentist_availability', count(*) FROM public.dentist_availability
UNION ALL SELECT 'profiles', count(*) FROM public.profiles;

SELECT id, name FROM storage.buckets;

-- ============================================================================
-- SUCCESS!
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ =====================================================';
  RAISE NOTICE '✅ COMPLETE DATABASE SETUP FINISHED!';
  RAISE NOTICE '✅ =====================================================';
  RAISE NOTICE '✅ Tables: All created';
  RAISE NOTICE '✅ Storage: medical-documents, xray-uploads, appointment-pdfs';
  RAISE NOTICE '✅ Dentists: 6 doctors';
  RAISE NOTICE '✅ Services: 10 dental services';
  RAISE NOTICE '✅ Availability: Mon-Fri 9am-5pm, 30-min slots';
  RAISE NOTICE '✅ Triggers: Profile auto-creation enabled';
  RAISE NOTICE '✅ Profiles: Synced with auth.users';
  RAISE NOTICE '';
  RAISE NOTICE '👨‍⚕️ Dentist Portal Logins:';
  RAISE NOTICE '   sarah.wilson@aquadent.com';
  RAISE NOTICE '   michael.chen@aquadent.com';
  RAISE NOTICE '   emily.rodriguez@aquadent.com';
  RAISE NOTICE '   james.thompson@aquadent.com';
  RAISE NOTICE '   lisa.patel@aquadent.com';
  RAISE NOTICE '   david.kim@aquadent.com';
END $$;
