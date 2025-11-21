-- Quick test to see what appointments exist
SELECT 
  id,
  patient_name,
  dentist_name,
  dentist_email,
  appointment_date,
  appointment_time,
  status,
  payment_status
FROM public.appointments
ORDER BY created_at DESC
LIMIT 20;

-- Count by dentist email
SELECT 
  dentist_email,
  dentist_name,
  COUNT(*) as appointment_count
FROM public.appointments
GROUP BY dentist_email, dentist_name
ORDER BY appointment_count DESC;
