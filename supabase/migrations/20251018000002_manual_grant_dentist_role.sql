-- Manual script to grant dentist role to karrarmayaly@gmail.com
-- Run this if the user already exists but doesn't have dentist access

DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'karrarmayaly@gmail.com';
  
  IF target_user_id IS NOT NULL THEN
    -- Grant dentist role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'dentist')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Create dentist profile if not exists
    INSERT INTO public.dentists (id, specialization, bio, years_of_experience, rating)
    VALUES (
      target_user_id,
      'General Dentistry',
      'Experienced dentist providing comprehensive dental care.',
      10,
      5.0
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Dentist role granted to user: %', target_user_id;
  ELSE
    RAISE NOTICE 'User with email karrarmayaly@gmail.com not found. Please sign up first.';
  END IF;
END $$;
