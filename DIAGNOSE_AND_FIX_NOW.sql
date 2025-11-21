-- ============================================================================
-- DIAGNOSE AND FIX APPOINTMENT VISIBILITY ISSUE
-- Run this to see why appointments aren't showing and fix them
-- ============================================================================

-- Step 1: Show all appointments
SELECT 
  '=== ALL APPOINTMENTS ===' as section,
  id,
  patient_name,
  dentist_name,
  dentist_email,
  dentist_id,
  appointment_date,
  appointment_time,
  status,
  created_at
FROM public.appointments
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Check if dentist_id matches auth.users
SELECT 
  '=== DENTIST ID VALIDATION ===' as section,
  a.id as appointment_id,
  a.dentist_name,
  a.dentist_email,
  a.dentist_id as appointment_dentist_id,
  u.id as auth_user_id,
  u.email as auth_email,
  CASE 
    WHEN u.id IS NULL THEN '❌ NO AUTH ACCOUNT'
    WHEN a.dentist_id = u.id THEN '✅ MATCH'
    ELSE '⚠️ MISMATCH'
  END as status
FROM public.appointments a
LEFT JOIN auth.users u ON u.email = a.dentist_email
ORDER BY a.created_at DESC
LIMIT 10;

-- Step 3: Check dentists table
SELECT 
  '=== DENTISTS TABLE ===' as section,
  d.id as dentist_id,
  d.name,
  d.email,
  u.id as auth_user_id,
  u.email as auth_email,
  CASE 
    WHEN u.id IS NULL THEN '❌ NO AUTH ACCOUNT'
    WHEN d.id = u.id THEN '✅ IDS MATCH'
    ELSE '⚠️ IDS DONT MATCH'
  END as status
FROM public.dentists d
LEFT JOIN auth.users u ON u.email = d.email
ORDER BY d.name;

-- Step 4: Check user_roles for admins
SELECT 
  '=== ADMIN USERS ===' as section,
  ur.user_id,
  ur.role,
  u.email
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';

-- Step 5: Check RLS policies
SELECT 
  '=== RLS POLICIES ===' as section,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'appointments'
ORDER BY policyname;

-- ============================================================================
-- FIX SECTION - Run this to fix the issues
-- ============================================================================

-- Fix 1: Update dentist_id to match auth.users by email
UPDATE public.appointments a
SET dentist_id = u.id
FROM auth.users u
WHERE u.email = a.dentist_email
  AND (a.dentist_id IS NULL OR a.dentist_id != u.id);

-- Fix 2: Update dentist_id to match dentists table (if email match fails)
UPDATE public.appointments a
SET dentist_id = d.id
FROM public.dentists d
WHERE d.name = a.dentist_name
  AND a.dentist_id IS NULL;

-- Fix 3: For Dr. Michael Chen specifically - find and fix
UPDATE public.appointments
SET dentist_id = (
  SELECT u.id 
  FROM auth.users u 
  WHERE u.email ILIKE '%michael%chen%' 
     OR u.email ILIKE '%chen%'
  LIMIT 1
)
WHERE dentist_name ILIKE '%michael%chen%'
  AND dentist_id IS NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_total_appointments INTEGER;
  v_valid_appointments INTEGER;
  v_invalid_appointments INTEGER;
  v_admin_count INTEGER;
  v_michael_chen_id UUID;
  v_michael_appointments INTEGER;
BEGIN
  -- Count appointments
  SELECT COUNT(*) INTO v_total_appointments FROM public.appointments;
  
  SELECT COUNT(*) INTO v_valid_appointments
  FROM public.appointments a
  INNER JOIN auth.users u ON u.id = a.dentist_id;
  
  SELECT COUNT(*) INTO v_invalid_appointments
  FROM public.appointments a
  LEFT JOIN auth.users u ON u.id = a.dentist_id
  WHERE a.dentist_id IS NOT NULL AND u.id IS NULL;
  
  -- Count admins
  SELECT COUNT(*) INTO v_admin_count
  FROM public.user_roles
  WHERE role = 'admin';
  
  -- Find Michael Chen's ID
  SELECT u.id INTO v_michael_chen_id
  FROM auth.users u
  WHERE u.email ILIKE '%michael%chen%' OR u.email ILIKE '%chen%'
  LIMIT 1;
  
  -- Count Michael's appointments
  IF v_michael_chen_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_michael_appointments
    FROM public.appointments
    WHERE dentist_id = v_michael_chen_id;
  ELSE
    v_michael_appointments := 0;
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 DIAGNOSTIC RESULTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Appointments:';
  RAISE NOTICE '  • Total: %', v_total_appointments;
  RAISE NOTICE '  • With valid dentist_id: %', v_valid_appointments;
  RAISE NOTICE '  • With invalid dentist_id: %', v_invalid_appointments;
  RAISE NOTICE '';
  RAISE NOTICE 'System:';
  RAISE NOTICE '  • Admin users: %', v_admin_count;
  RAISE NOTICE '';
  
  IF v_michael_chen_id IS NOT NULL THEN
    RAISE NOTICE 'Dr. Michael Chen:';
    RAISE NOTICE '  • Auth ID: %', v_michael_chen_id;
    RAISE NOTICE '  • Appointments: %', v_michael_appointments;
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '⚠️  Dr. Michael Chen not found in auth.users!';
    RAISE NOTICE '   Create an auth account for him.';
    RAISE NOTICE '';
  END IF;
  
  IF v_invalid_appointments > 0 THEN
    RAISE NOTICE '⚠️  ISSUE: % appointments have invalid dentist_id', v_invalid_appointments;
    RAISE NOTICE '   These won''t show in dentist or admin dashboards!';
    RAISE NOTICE '';
  END IF;
  
  IF v_admin_count = 0 THEN
    RAISE NOTICE '⚠️  ISSUE: No admin users found!';
    RAISE NOTICE '   Create an admin user in user_roles table.';
    RAISE NOTICE '';
  END IF;
  
  IF v_valid_appointments = v_total_appointments AND v_admin_count > 0 THEN
    RAISE NOTICE '✅ ALL SYSTEMS OPERATIONAL!';
    RAISE NOTICE '   Appointments should now appear in dashboards.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- Show final state
SELECT 
  '=== FINAL STATE ===' as section,
  a.id,
  a.patient_name,
  a.dentist_name,
  a.dentist_id,
  u.email as dentist_auth_email,
  a.appointment_date,
  a.status,
  CASE 
    WHEN u.id IS NOT NULL THEN '✅ WILL SHOW IN DASHBOARDS'
    ELSE '❌ WONT SHOW - NEEDS FIX'
  END as visibility_status
FROM public.appointments a
LEFT JOIN auth.users u ON u.id = a.dentist_id
ORDER BY a.created_at DESC
LIMIT 10;
