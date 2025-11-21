-- Let's see EXACTLY what's in the appointments table
SELECT 
  id,
  patient_name,
  patient_email,
  dentist_name,
  dentist_email,
  dentist_id,
  appointment_date,
  appointment_time,
  status,
  created_at
FROM public.appointments
ORDER BY created_at DESC
LIMIT 5;

-- Check what dentist emails exist
SELECT DISTINCT 
  dentist_email,
  dentist_name,
  COUNT(*) as appointment_count
FROM public.appointments
GROUP BY dentist_email, dentist_name;

-- Check if dentist_email matches any auth users
SELECT 
  a.dentist_email,
  a.dentist_name,
  COUNT(a.id) as appointment_count,
  u.id as auth_user_id,
  u.email as auth_email,
  CASE 
    WHEN u.id IS NOT NULL THEN '✅ Has Auth Account'
    ELSE '❌ No Auth Account'
  END as auth_status
FROM public.appointments a
LEFT JOIN auth.users u ON LOWER(u.email) = LOWER(a.dentist_email)
GROUP BY a.dentist_email, a.dentist_name, u.id, u.email;
