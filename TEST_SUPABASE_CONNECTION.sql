-- Test if Supabase connection is working and data exists

-- 1. Count total appointments
SELECT 
  'Total Appointments' as metric,
  COUNT(*) as count
FROM public.appointments;

-- 2. Show recent appointments
SELECT 
  'Recent Appointments' as section,
  id,
  patient_name,
  dentist_name,
  dentist_email,
  appointment_date,
  status,
  created_at
FROM public.appointments
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check RLS policies (might be blocking access)
SELECT 
  'RLS Policies' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'appointments';

-- 4. Check if table is accessible
SELECT 
  'Table Access Test' as section,
  COUNT(*) as can_read_count
FROM public.appointments;
