-- Add dentist portal users
-- This migration creates profiles and dentist records for the 6 authorized dentists

-- First, insert profiles for the dentists
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'david.kim@dentalcare.com', 'David Kim', now(), now()),
  (gen_random_uuid(), 'lisa.thompson@dentalcare.com', 'Lisa Thompson', now(), now()),
  (gen_random_uuid(), 'james.wilson@dentalcare.com', 'James Wilson', now(), now()),
  (gen_random_uuid(), 'emily.rodriguez@dentalcare.com', 'Emily Rodriguez', now(), now()),
  (gen_random_uuid(), 'michael.chen@dentalcare.com', 'Michael Chen', now(), now()),
  (gen_random_uuid(), 'sarah.johnson@dentalcare.com', 'Sarah Johnson', now(), now())
ON CONFLICT (email) DO NOTHING;

-- Then, insert dentist records linked to the profiles
INSERT INTO dentists (id, full_name, specialization, bio, years_of_experience, education, rating, created_at, updated_at)
SELECT 
  p.id,
  p.full_name,
  CASE 
    WHEN p.email = 'david.kim@dentalcare.com' THEN 'Orthodontics'
    WHEN p.email = 'lisa.thompson@dentalcare.com' THEN 'Pediatric Dentistry'
    WHEN p.email = 'james.wilson@dentalcare.com' THEN 'Cosmetic Dentistry'
    WHEN p.email = 'emily.rodriguez@dentalcare.com' THEN 'Endodontics'
    WHEN p.email = 'michael.chen@dentalcare.com' THEN 'Periodontics'
    WHEN p.email = 'sarah.johnson@dentalcare.com' THEN 'General Dentistry'
  END as specialization,
  CASE 
    WHEN p.email = 'david.kim@dentalcare.com' THEN 'Specialized in orthodontics with over 15 years of experience in teeth alignment and braces.'
    WHEN p.email = 'lisa.thompson@dentalcare.com' THEN 'Dedicated to providing gentle dental care for children and adolescents.'
    WHEN p.email = 'james.wilson@dentalcare.com' THEN 'Expert in cosmetic procedures including veneers, whitening, and smile makeovers.'
    WHEN p.email = 'emily.rodriguez@dentalcare.com' THEN 'Specialist in root canal therapy and dental pain management.'
    WHEN p.email = 'michael.chen@dentalcare.com' THEN 'Focused on gum health and treatment of periodontal diseases.'
    WHEN p.email = 'sarah.johnson@dentalcare.com' THEN 'Comprehensive dental care for patients of all ages.'
  END as bio,
  CASE 
    WHEN p.email = 'david.kim@dentalcare.com' THEN 15
    WHEN p.email = 'lisa.thompson@dentalcare.com' THEN 12
    WHEN p.email = 'james.wilson@dentalcare.com' THEN 10
    WHEN p.email = 'emily.rodriguez@dentalcare.com' THEN 8
    WHEN p.email = 'michael.chen@dentalcare.com' THEN 14
    WHEN p.email = 'sarah.johnson@dentalcare.com' THEN 20
  END as years_of_experience,
  CASE 
    WHEN p.email = 'david.kim@dentalcare.com' THEN 'DDS, University of California'
    WHEN p.email = 'lisa.thompson@dentalcare.com' THEN 'DMD, Harvard School of Dental Medicine'
    WHEN p.email = 'james.wilson@dentalcare.com' THEN 'DDS, NYU College of Dentistry'
    WHEN p.email = 'emily.rodriguez@dentalcare.com' THEN 'DDS, University of Michigan'
    WHEN p.email = 'michael.chen@dentalcare.com' THEN 'DMD, Columbia University'
    WHEN p.email = 'sarah.johnson@dentalcare.com' THEN 'DDS, University of Pennsylvania'
  END as education,
  4.8 as rating,
  now() as created_at,
  now() as updated_at
FROM profiles p
WHERE p.email IN (
  'david.kim@dentalcare.com',
  'lisa.thompson@dentalcare.com',
  'james.wilson@dentalcare.com',
  'emily.rodriguez@dentalcare.com',
  'michael.chen@dentalcare.com',
  'sarah.johnson@dentalcare.com'
)
ON CONFLICT (id) DO NOTHING;

-- Add user roles for dentists
INSERT INTO user_roles (user_id, role, created_at)
SELECT 
  p.id,
  'dentist' as role,
  now() as created_at
FROM profiles p
WHERE p.email IN (
  'david.kim@dentalcare.com',
  'lisa.thompson@dentalcare.com',
  'james.wilson@dentalcare.com',
  'emily.rodriguez@dentalcare.com',
  'michael.chen@dentalcare.com',
  'sarah.johnson@dentalcare.com'
)
ON CONFLICT (user_id, role) DO NOTHING;
