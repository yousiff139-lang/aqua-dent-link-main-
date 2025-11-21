-- This will help us see and fix any email mismatches

-- STEP 1: See what emails are in appointments
SELECT 
  'Appointments Table' as source,
  dentist_email as email,
  dentist_name as name,
  COUNT(*) as count
FROM public.appointments
GROUP BY dentist_email, dentist_name
ORDER BY count DESC;

-- STEP 2: See what emails are in dentists table
SELECT 
  'Dentists Table' as source,
  email,
  name,
  id
FROM public.dentists
ORDER BY name;

-- STEP 3: See what emails are in auth.users
SELECT 
  'Auth Users' as source,
  email,
  id
FROM auth.users
WHERE email ILIKE '%chen%' OR email ILIKE '%michael%'
ORDER BY email;

-- STEP 4: If you find a mismatch, run this to fix it
-- (Replace 'correct@email.com' with the actual email from auth.users)
/*
UPDATE public.appointments
SET dentist_email = 'correct@email.com'
WHERE dentist_name ILIKE '%michael%chen%';
*/

-- STEP 5: Verify the fix
SELECT 
  id,
  patient_name,
  dentist_name,
  dentist_email,
  appointment_date,
  status
FROM public.appointments
WHERE dentist_name ILIKE '%michael%chen%'
ORDER BY created_at DESC;
