-- Simple and Safe Test User Cleanup Script
-- Step 1: First, let's see ALL current patients

SELECT 
  id,
  full_name,
  email,
  phone,
  created_at,
  updated_at
FROM profiles 
WHERE role = 'patient'
ORDER BY created_at DESC;

-- Step 2: After reviewing the list above, identify the test users
-- Then uncomment and run ONE of the options below:

-- OPTION A: Delete users who have NEVER logged in (safest)
-- This keeps only users who actually signed in through the webapp
/*
DELETE FROM profiles
WHERE role = 'patient'
AND (last_sign_in_at IS NULL OR updated_at = created_at);
*/

-- OPTION B: Delete specific users by email (manual selection)
-- Replace with actual test user emails you see above
/*
DELETE FROM profiles
WHERE email IN (
  'test1@example.com',
  'test2@example.com',
  'demo@example.com'
);
*/

-- OPTION C: Delete users with test-like patterns
/*
DELETE FROM profiles
WHERE role = 'patient'
AND (
  email LIKE '%test%'
  OR email LIKE '%fake%'  
  OR full_name LIKE '%Test%'
  OR full_name IS NULL
);
*/

-- Step 3: After deleting, verify what's left
-- SELECT id, full_name, email FROM profiles WHERE role = 'patient';
