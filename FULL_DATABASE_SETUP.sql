-- ============================================================================
-- COMPLETE SUPABASE DATABASE SETUP FOR AQUA DENT LINK
-- Run this ENTIRE script in Supabase SQL Editor (in one go)
-- This creates ALL tables, dentists with portal login, and services
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE CORE TABLES
-- ============================================================================

-- Profiles table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE,
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
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'patient',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Dentists table
CREATE TABLE IF NOT EXISTS public.dentists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  specialization TEXT DEFAULT 'General Dentistry',
  phone TEXT,
  years_of_experience INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 5.0,
  bio TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'active',
  available_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  working_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00"}',
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
  price_min DECIMAL(10,2) NOT NULL,
  price_max DECIMAL(10,2),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_email TEXT,
  patient_phone TEXT,
  dentist_id UUID REFERENCES public.dentists(id) ON DELETE SET NULL,
  dentist_name TEXT,
  service_id UUID REFERENCES public.dental_services(id) ON DELETE SET NULL,
  service_name TEXT,
  service_price DECIMAL(10,2),
  service_duration INTEGER,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  scheduled_time TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  reason TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient documents table
CREATE TABLE IF NOT EXISTS public.patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  dentist_id UUID REFERENCES public.dentists(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  document_type TEXT DEFAULT 'xray',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 2: DISABLE RLS FOR SIMPLICITY (Enable later for production)
-- ============================================================================

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dental_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.profiles TO anon, authenticated, service_role;
GRANT ALL ON public.user_roles TO anon, authenticated, service_role;
GRANT ALL ON public.dentists TO anon, authenticated, service_role;
GRANT ALL ON public.dental_services TO anon, authenticated, service_role;
GRANT ALL ON public.appointments TO anon, authenticated, service_role;
GRANT ALL ON public.patient_documents TO anon, authenticated, service_role;

-- ============================================================================
-- PART 4: CREATE TRIGGER FOR PROFILE CREATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PART 5: INSERT DENTAL SERVICES
-- ============================================================================

INSERT INTO public.dental_services (name, description, specialty, duration_minutes, price_min, price_max, image_url, is_active)
VALUES
  ('General Dental Cleanup', 'Professional teeth cleaning, plaque removal, and comprehensive oral examination. Includes fluoride treatment.', 'General Dentistry', 60, 150.00, 150.00, 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop', true),
  ('Teeth Whitening', 'Professional teeth whitening treatment using advanced laser technology. Brighter smile in one session.', 'Cosmetic Dentistry', 90, 400.00, 600.00, 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop', true),
  ('Orthodontic Consultation & Braces', 'Initial consultation, digital impressions, and braces fitting with treatment planning.', 'Orthodontics', 90, 2500.00, 3500.00, 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=400&h=300&fit=crop', true),
  ('Root Canal Treatment', 'Complete root canal therapy including anesthesia, cleaning, shaping, and filling.', 'Endodontics', 90, 800.00, 1200.00, 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop', true),
  ('Dental Implant', 'Single tooth implant including surgical placement, abutment, and crown.', 'Oral Surgery', 120, 1500.00, 2500.00, 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop', true),
  ('Periodontal Treatment', 'Deep cleaning and scaling to treat gum disease with antimicrobial treatment.', 'Periodontics', 90, 500.00, 800.00, 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop', true),
  ('Dental Filling', 'Tooth-colored composite fillings to restore cavities with natural-looking results.', 'General Dentistry', 45, 200.00, 350.00, 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop', true),
  ('Crown & Bridge', 'Custom-made dental crowns or bridges to restore damaged or missing teeth.', 'General Dentistry', 120, 900.00, 1500.00, 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop', true),
  ('Pediatric Dental Check-up', 'Child-friendly dental examination with gentle cleaning and fluoride treatment.', 'Pediatric Dentistry', 45, 100.00, 150.00, 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop', true),
  ('Emergency Dental Care', 'Urgent care for dental emergencies including pain relief and temporary repairs.', 'General Dentistry', 60, 200.00, 400.00, 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 6: INSERT DISPLAY-ONLY DENTISTS (for user web app browsing)
-- ============================================================================

INSERT INTO public.dentists (id, name, email, specialization, phone, years_of_experience, rating, bio, image_url, status)
VALUES
  (gen_random_uuid(), 'Dr. Sarah Wilson', 'sarah.wilson@aquadent.com', 'Orthodontics', '+1 (555) 123-4567', 12, 4.9, 'Board-certified orthodontist with over a decade of experience in creating beautiful smiles. Specializes in Invisalign and braces.', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop', 'active'),
  (gen_random_uuid(), 'Dr. Michael Chen', 'michael.chen@aquadent.com', 'Cosmetic Dentistry', '+1 (555) 234-5678', 15, 4.8, 'Renowned for artistic approach to smile makeovers. Combines advanced technology with dental artistry.', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop', 'active'),
  (gen_random_uuid(), 'Dr. Emily Rodriguez', 'emily.rodriguez@aquadent.com', 'Pediatric Dentistry', '+1 (555) 345-6789', 8, 4.9, 'Creates a fun and safe environment for children. Gentle approach helps young patients build positive dental care habits.', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop', 'active'),
  (gen_random_uuid(), 'Dr. James Thompson', 'james.thompson@aquadent.com', 'Oral Surgery', '+1 (555) 456-7890', 20, 5.0, 'Expert in oral and maxillofacial surgery. Specializes in complex extractions, dental implants, and reconstructive surgery.', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop', 'active'),
  (gen_random_uuid(), 'Dr. Lisa Patel', 'lisa.patel@aquadent.com', 'Periodontics', '+1 (555) 567-8901', 10, 4.7, 'Focuses on prevention, diagnosis, and treatment of periodontal disease. Dedicated to helping patients maintain healthy gums.', 'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=400&h=400&fit=crop', 'active'),
  (gen_random_uuid(), 'Dr. David Kim', 'david.kim@aquadent.com', 'Endodontics', '+1 (555) 678-9012', 14, 4.8, 'Specializes in root canal therapy. Uses latest microscopic techniques to save natural teeth and relieve pain.', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop', 'active')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 7: CREATE DENTIST PORTAL LOGIN ACCOUNTS
-- These are the dentists that can actually log into the dentist portal
-- Password for all: DentistPass123!
-- ============================================================================

-- NOTE: You need to create these users in Supabase Auth Dashboard manually
-- OR run this via the backend admin API
-- The emails below can be used to login to dentist portal after creating auth accounts:
--   - iamatomic@example.com (password: any you set in auth dashboard)
--   - dr.atomic@aquadent.com (password: any you set in auth dashboard)

-- For quick testing, insert a dentist that matches an auth user you create:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add user" and create: iamatomic@example.com with password: Test123456!
-- 3. Then update the dentist record to link to that user:

-- After creating auth user, run this to link them:
-- UPDATE public.dentists SET user_id = (SELECT id FROM auth.users WHERE email = 'iamatomic@example.com') WHERE email = 'iamatomic@example.com';

-- ============================================================================
-- PART 8: VERIFICATION
-- ============================================================================

SELECT 'Tables Created:' as status;
SELECT 'dental_services' as table_name, count(*) as row_count FROM public.dental_services
UNION ALL
SELECT 'dentists' as table_name, count(*) as row_count FROM public.dentists
UNION ALL
SELECT 'profiles' as table_name, count(*) as row_count FROM public.profiles
UNION ALL
SELECT 'appointments' as table_name, count(*) as row_count FROM public.appointments;

-- ============================================================================
-- SUCCESS!
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ =====================================================';
  RAISE NOTICE '✅ COMPLETE DATABASE SETUP FINISHED!';
  RAISE NOTICE '✅ =====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Created tables: profiles, user_roles, dentists, dental_services, appointments, patient_documents';
  RAISE NOTICE '👨‍⚕️ Added 6 display dentists (visible in user app and admin)';
  RAISE NOTICE '🦷 Added 10 dental services';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  TO CREATE DENTIST PORTAL LOGINS:';
  RAISE NOTICE '   1. Go to Supabase Dashboard > Authentication > Users';
  RAISE NOTICE '   2. Click "Add user" > Create with email/password';
  RAISE NOTICE '   3. Example: test.dentist@aquadent.com / DentistPass123!';
  RAISE NOTICE '   4. Then run: INSERT INTO dentists (name, email, ...) VALUES (...);';
  RAISE NOTICE '';
END $$;
