-- Seed minimal dentist availability (Mon-Fri 09:00-17:00) and a verification query

-- Create profiles for dentists if missing
INSERT INTO public.profiles (id, email, full_name)
SELECT d.id, d.email, d.name
FROM public.dentists d
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Seed availability for known dentists (does not overwrite existing)
INSERT INTO public.dentist_availability (dentist_id, day_of_week, start_time, end_time, is_available)
SELECT d.id, day_num, TIME '09:00', TIME '17:00', true
FROM public.dentists d
CROSS JOIN generate_series(0,4) AS day_num
ON CONFLICT (dentist_id, day_of_week) DO NOTHING;

-- Verification helper: counts
-- Run this in SQL editor after migration
-- SELECT
--   (SELECT COUNT(*) FROM public.dentists) AS dentist_count,
--   (SELECT COUNT(*) FROM public.profiles) AS profile_count,
--   (SELECT COUNT(*) FROM public.dentist_availability) AS availability_rows,
--   (SELECT COUNT(*) FROM public.appointments) AS appointment_count;






