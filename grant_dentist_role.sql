-- Manual script to grant dentist role to karrarmayaly@gmail.com
-- Run this in your Supabase SQL Editor after the user has signed up

-- Step 1: Find the user ID
SELECT id, email FROM auth.users WHERE email = 'karrarmayaly@gmail.com';

-- Step 2: Grant dentist role (replace USER_ID_HERE with the actual UUID from step 1)
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('USER_ID_HERE', 'dentist')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Step 3: Create dentist profile (replace USER_ID_HERE with the actual UUID from step 1)
-- INSERT INTO public.dentists (id, specialization, bio, years_of_experience, rating)
-- VALUES (
--   'USER_ID_HERE',
--   'General Dentistry',
--   'Experienced dentist providing comprehensive dental care.',
--   10,
--   5.0
-- )
-- ON CONFLICT (id) DO NOTHING;

-- OR run this all-in-one script (uncomment and run):
/*
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'karrarmayaly@gmail.com';
  
  IF target_user_id IS NOT NULL THEN
    -- Insert dentist role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'dentist')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Create dentist profile
    INSERT INTO public.dentists (id, specialization, bio, years_of_experience, rating)
    VALUES (
      target_user_id,
      'General Dentistry',
      'Experienced dentist providing comprehensive dental care.',
      10,
      5.0
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Dentist role granted successfully to user: %', target_user_id;
  ELSE
    RAISE NOTICE 'User with email karrarmayaly@gmail.com not found. Please sign up first.';
  END IF;
END $$;
*/
