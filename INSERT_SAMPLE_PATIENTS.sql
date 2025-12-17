-- ============================================================================
-- ADD SAMPLE PATIENTS/USERS FOR TESTING
-- Run this in Supabase SQL Editor AFTER running FULL_DATABASE_SETUP.sql
-- ============================================================================

-- First, create test users in Supabase Auth (you need to do this manually)
-- Go to Supabase Dashboard > Authentication > Users > Add User
-- Create these users with any password:
--   - patient1@test.com
--   - patient2@test.com
--   - patient3@test.com

-- After creating users in Auth, run this to create their profiles:
-- (Note: The IDs will be auto-generated, we use placeholder UUIDs here)

-- Insert sample profiles directly (for display purposes)
-- Using NOT EXISTS to avoid duplicates
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

INSERT INTO public.profiles (id, email, full_name, phone, role, created_at)
SELECT gen_random_uuid(), 'david.brown@email.com', 'David Brown', '+1 (555) 999-0000', 'patient', NOW() - INTERVAL '10 days'
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'david.brown@email.com');

INSERT INTO public.profiles (id, email, full_name, phone, role, created_at)
SELECT gen_random_uuid(), 'emily.davis@email.com', 'Emily Davis', '+1 (555) 123-7890', 'patient', NOW() - INTERVAL '5 days'
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE email = 'emily.davis@email.com');

-- Create some sample appointments with these patients
INSERT INTO public.appointments (
  patient_name, patient_email, patient_phone,
  dentist_id, dentist_name,
  appointment_date, appointment_time, scheduled_time,
  status, reason, notes, payment_status
)
SELECT 
  'John Smith', 'john.smith@email.com', '+1 (555) 111-2222',
  d.id, d.name,
  CURRENT_DATE + INTERVAL '3 days', '10:00:00', (CURRENT_DATE + INTERVAL '3 days')::timestamp + '10:00:00'::time,
  'confirmed', 'Teeth cleaning', 'Regular checkup', 'completed'
FROM public.dentists d WHERE d.name LIKE '%Sarah Wilson%' LIMIT 1;

INSERT INTO public.appointments (
  patient_name, patient_email, patient_phone,
  dentist_id, dentist_name,
  appointment_date, appointment_time, scheduled_time,
  status, reason, notes, payment_status
)
SELECT 
  'Jane Doe', 'jane.doe@email.com', '+1 (555) 333-4444',
  d.id, d.name,
  CURRENT_DATE + INTERVAL '5 days', '14:00:00', (CURRENT_DATE + INTERVAL '5 days')::timestamp + '14:00:00'::time,
  'pending', 'Tooth pain', 'New patient consultation', 'pending'
FROM public.dentists d WHERE d.name LIKE '%Michael Chen%' LIMIT 1;

INSERT INTO public.appointments (
  patient_name, patient_email, patient_phone,
  dentist_id, dentist_name,
  appointment_date, appointment_time, scheduled_time,
  status, reason, notes, payment_status
)
SELECT 
  'Mike Johnson', 'mike.johnson@email.com', '+1 (555) 555-6666',
  d.id, d.name,
  CURRENT_DATE - INTERVAL '2 days', '11:00:00', (CURRENT_DATE - INTERVAL '2 days')::timestamp + '11:00:00'::time,
  'completed', 'Braces adjustment', 'Monthly follow-up', 'completed'
FROM public.dentists d WHERE d.name LIKE '%Emily Rodriguez%' LIMIT 1;

INSERT INTO public.appointments (
  patient_name, patient_email, patient_phone,
  dentist_id, dentist_name,
  appointment_date, appointment_time, scheduled_time,
  status, reason, notes, payment_status
)
SELECT 
  'Sarah Williams', 'sarah.williams@email.com', '+1 (555) 777-8888',
  d.id, d.name,
  CURRENT_DATE + INTERVAL '7 days', '09:00:00', (CURRENT_DATE + INTERVAL '7 days')::timestamp + '09:00:00'::time,
  'confirmed', 'Root canal', 'Referred by Dr. Chen', 'pending'
FROM public.dentists d WHERE d.name LIKE '%David Kim%' LIMIT 1;

-- Verify the data
SELECT 'Profiles:' as table_name, count(*) as count FROM public.profiles
UNION ALL
SELECT 'Appointments:' as table_name, count(*) as count FROM public.appointments;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Added 6 sample patients to profiles table';
  RAISE NOTICE '✅ Added 4 sample appointments';
  RAISE NOTICE '';
  RAISE NOTICE 'Refresh your admin panel to see the data!';
END $$;
