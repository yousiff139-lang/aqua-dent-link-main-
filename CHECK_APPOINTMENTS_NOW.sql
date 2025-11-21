-- Run this in Supabase SQL Editor to see what's actually in the database

-- 1. Show all appointments
SELECT 
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

-- 2. Show dentist emails in appointments
SELECT DISTINCT 
  dentist_email,
  dentist_name,
  COUNT(*) as appointment_count
FROM public.appointments
GROUP BY dentist_email, dentist_name
ORDER BY appointment_count DESC;

-- 3. Check if "Dr. Michael Chen" has appointments
SELECT 
  id,
  patient_name,
  dentist_email,
  appointment_date,
  status
FROM public.appointments
WHERE dentist_name ILIKE '%michael%chen%'
   OR dentist_email ILIKE '%michael%chen%'
ORDER BY created_at DESC;

-- 4. Show ALL dentist emails (to see exact format)
SELECT DISTINCT dentist_email
FROM public.appointments
ORDER BY dentist_email;
