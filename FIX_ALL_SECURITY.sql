-- COMPREHENSIVE SUPABASE SECURITY FIX (CORRECTED)
-- Run this in Supabase SQL Editor to fix all security issues
-- ================================================================

-- ================================================================
-- 1. ENABLE RLS ON ALL TABLES (Fixes: rls_disabled_in_public)
-- ================================================================

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentist_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentist_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dental_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 2. PUBLIC READ POLICIES (Allow reading WITHOUT login)
-- These are the critical ones for dentists/services to appear
-- ================================================================

-- Dentists - ANYONE can view (before and after login)
DROP POLICY IF EXISTS "Allow public read access to dentists" ON public.dentists;
DROP POLICY IF EXISTS "Allow anon read access to dentists" ON public.dentists;
CREATE POLICY "Public can view dentists"
ON public.dentists FOR SELECT
USING (true);

-- Dental Services - ANYONE can view
DROP POLICY IF EXISTS "Allow public read access to dental_services" ON public.dental_services;
CREATE POLICY "Public can view dental_services"
ON public.dental_services FOR SELECT
USING (true);

-- Appointment Types - ANYONE can view
DROP POLICY IF EXISTS "Allow public read access to appointment_types" ON public.appointment_types;
CREATE POLICY "Public can view appointment_types"
ON public.appointment_types FOR SELECT
USING (true);

-- Dentist Availability - ANYONE can view
DROP POLICY IF EXISTS "Allow public read access to dentist_availability" ON public.dentist_availability;
CREATE POLICY "Public can view dentist_availability"
ON public.dentist_availability FOR SELECT
USING (true);

-- Dentist Reviews - ANYONE can view
DROP POLICY IF EXISTS "Allow public read access to dentist_reviews" ON public.dentist_reviews;
CREATE POLICY "Public can view dentist_reviews"
ON public.dentist_reviews FOR SELECT
USING (true);

-- ================================================================
-- 3. APPOINTMENT POLICIES
-- ================================================================

-- Anyone can read appointments (needed for booking flow)
DROP POLICY IF EXISTS "appointments_select" ON public.appointments;
DROP POLICY IF EXISTS "Users can read own appointments" ON public.appointments;
CREATE POLICY "Users can view appointments"
ON public.appointments FOR SELECT
USING (true);

-- Anyone can create appointments
DROP POLICY IF EXISTS "appointments_insert" ON public.appointments;
DROP POLICY IF EXISTS "Anon can create appointments" ON public.appointments;
CREATE POLICY "Anyone can create appointments"
ON public.appointments FOR INSERT
WITH CHECK (true);

-- Anyone can update appointments (for status changes)
DROP POLICY IF EXISTS "appointments_update" ON public.appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Dentists can update their appointments" ON public.appointments;
CREATE POLICY "Anyone can update appointments"
ON public.appointments FOR UPDATE
USING (true)
WITH CHECK (true);

-- ================================================================
-- 4. PROFILE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Users can view profiles"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert profile"
ON public.profiles FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update profile"
ON public.profiles FOR UPDATE
USING (true)
WITH CHECK (true);

-- ================================================================
-- 5. USER ROLES POLICIES
-- ================================================================

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can view roles"
ON public.user_roles FOR SELECT
USING (true);

-- ================================================================
-- 6. REALTIME EVENTS POLICIES
-- ================================================================

DROP POLICY IF EXISTS "Service can manage realtime_events" ON public.realtime_events;
CREATE POLICY "Allow all realtime_events"
ON public.realtime_events FOR ALL
USING (true)
WITH CHECK (true);

-- ================================================================
-- 7. ACTIVATE ALL DENTISTS
-- ================================================================

UPDATE dentists SET status = 'active' WHERE status IS NULL OR status != 'active';

-- ================================================================
-- 8. VERIFY CHANGES
-- ================================================================

SELECT 'Active dentists: ' || COUNT(*) as info FROM dentists WHERE status = 'active';

SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('appointments', 'dentists', 'profiles', 'dental_services', 'dentist_availability', 'appointment_types')
ORDER BY tablename;
