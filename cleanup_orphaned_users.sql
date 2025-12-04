-- ============================================================================
-- CLEANUP: Remove orphaned auth users for mayalykarrar@gmail.com
-- ============================================================================
-- This script removes orphaned auth users that were created but don't have
-- complete profile/dentist records. Run this BEFORE trying to create the
-- dentist again.
-- ============================================================================

-- First, let's see what we're dealing with
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.id as profile_id,
  p.role as profile_role,
  d.id as dentist_id
FROM auth.users u
LEFT JOIN public.profiles p ON p.email = u.email
LEFT JOIN public.dentists d ON d.email = u.email
WHERE u.email = 'mayalykarrar@gmail.com'
ORDER BY u.created_at DESC;

-- Now delete ONLY the orphaned auth users (those without complete records)
-- We'll keep any that have both profile AND dentist records
DELETE FROM auth.users
WHERE email = 'mayalykarrar@gmail.com'
AND id NOT IN (
  -- Keep users that have BOTH a profile AND a dentist record
  SELECT u.id
  FROM auth.users u
  INNER JOIN public.profiles p ON p.email = u.email
  INNER JOIN public.dentists d ON d.email = u.email
  WHERE u.email = 'mayalykarrar@gmail.com'
  AND p.role = 'dentist'
);

-- Also clean up any incomplete profiles (profiles without dentist records)
DELETE FROM public.profiles
WHERE email = 'mayalykarrar@gmail.com'
AND id NOT IN (
  SELECT id FROM public.dentists WHERE email = 'mayalykarrar@gmail.com'
);

-- Verify cleanup - this should return 0 rows if all orphans are removed
-- OR 1 row if there's a complete dentist record
SELECT 
  u.id as auth_user_id,
  u.email,
  p.id as profile_id,
  p.role,
  d.id as dentist_id,
  d.name as dentist_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.email = u.email
LEFT JOIN public.dentists d ON d.email = u.email
WHERE u.email = 'mayalykarrar@gmail.com';

-- Expected result:
-- - If 0 rows: Email is clean, ready to create new dentist
-- - If 1 row with all IDs filled: Complete dentist exists, use different email
-- ============================================================================
