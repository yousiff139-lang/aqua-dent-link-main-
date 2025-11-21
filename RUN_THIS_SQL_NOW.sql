-- ============================================================================
-- RUN THIS IN SUPABASE SQL EDITOR NOW
-- This will show you EXACTLY what's wrong and how to fix it
-- ============================================================================

-- STEP 1: Show ALL appointments in database
SELECT 
  '=== ALL APPOINTMENTS ===' as info,
  id,
  patient_name,
  dentist_name,
  dentist_email,
  appointment_date,
  appointment_time,
  status,
  created_at
FROM public.appointments
ORDER BY created_at DESC
LIMIT 10;

-- STEP 2: Show what dentist emails exist in appointments
SELECT 
  '=== DENTIST EMAILS IN APPOINTMENTS ===' as info,
  dentist_email,
  dentist_name,
  COUNT(*) as appointment_count
FROM public.appointments
GROUP BY dentist_email, dentist_name
ORDER BY appointment_count DESC;

-- STEP 3: Show what dentist emails exist in dentists table
SELECT 
  '=== DENTIST EMAILS IN DENTISTS TABLE ===' as info,
  email,
  name,
  id
FROM public.dentists
ORDER BY name;

-- STEP 4: Check if there's an email mismatch
SELECT 
  '=== EMAIL MISMATCH CHECK ===' as info,
  a.dentist_email as appointment_email,
  a.dentist_name,
  d.email as dentist_table_email,
  d.name as dentist_table_name,
  CASE 
    WHEN LOWER(a.dentist_email) = LOWER(d.email) THEN '✅ MATCH'
    ELSE '❌ MISMATCH - THIS IS THE PROBLEM!'
  END as status
FROM public.appointments a
CROSS JOIN public.dentists d
WHERE a.dentist_name ILIKE '%' || d.name || '%'
   OR d.name ILIKE '%' || a.dentist_name || '%'
LIMIT 10;

-- ============================================================================
-- IF YOU SEE A MISMATCH, RUN THIS FIX:
-- ============================================================================

-- Example: If appointments have "dr.chen@example.com" 
-- but you login with "michael.chen@dentalcare.com"
-- Run this (REPLACE WITH YOUR ACTUAL EMAILS):

/*
UPDATE public.appointments
SET dentist_email = 'michael.chen@dentalcare.com'  -- The email you LOGIN with
WHERE dentist_name ILIKE '%michael%chen%';         -- The dentist name in appointments
*/

-- ============================================================================
-- AFTER RUNNING THE FIX, VERIFY:
-- ============================================================================

SELECT 
  '=== VERIFICATION ===' as info,
  dentist_email,
  dentist_name,
  COUNT(*) as count
FROM public.appointments
GROUP BY dentist_email, dentist_name;

-- ============================================================================
-- TELL ME THE RESULTS:
-- ============================================================================
-- 1. What emails do you see in "DENTIST EMAILS IN APPOINTMENTS"?
-- 2. What email are you logging in with in the dentist portal?
-- 3. Do they match? If not, that's the problem!
-- ============================================================================
