-- ============================================================================
-- VERIFY DENTIST APPOINTMENTS SYNC
-- This helps diagnose why appointments aren't showing in dentist portal
-- ============================================================================

-- Step 1: Check if appointments exist
SELECT 
  'Total Appointments' as check_type,
  COUNT(*) as count
FROM public.appointments;

-- Step 2: Check appointments by dentist
SELECT 
  'Appointments by Dentist' as check_type,
  dentist_id,
  dentist_name,
  COUNT(*) as appointment_count
FROM public.appointments
GROUP BY dentist_id, dentist_name
ORDER BY appointment_count DESC;

-- Step 3: Check if dentist_id matches auth.users
SELECT 
  'Dentist ID Validation' as check_type,
  a.dentist_id,
  a.dentist_name,
  CASE 
    WHEN u.id IS NOT NULL THEN 'EXISTS in auth.users ✅'
    ELSE 'NOT FOUND in auth.users ❌'
  END as auth_status,
  COUNT(*) as appointment_count
FROM public.appointments a
LEFT JOIN auth.users u ON u.id = a.dentist_id
GROUP BY a.dentist_id, a.dentist_name, u.id
ORDER BY appointment_count DESC;

-- Step 4: Check dentists table
SELECT 
  'Dentists Table' as check_type,
  d.id as dentist_id,
  d.name as dentist_name,
  d.email,
  CASE 
    WHEN u.id IS NOT NULL THEN 'Has auth account ✅'
    ELSE 'No auth account ❌'
  END as auth_status
FROM public.dentists d
LEFT JOIN auth.users u ON u.id = d.id
ORDER BY d.name;

-- Step 5: Check user_roles for dentists
SELECT 
  'User Roles for Dentists' as check_type,
  ur.user_id,
  ur.dentist_id,
  ur.role,
  d.name as dentist_name
FROM public.user_roles ur
LEFT JOIN public.dentists d ON d.id = ur.dentist_id
WHERE ur.role = 'dentist'
ORDER BY d.name;

-- Step 6: Check RLS policies
SELECT 
  'RLS Policies for Appointments' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'appointments'
ORDER BY policyname;

-- ============================================================================
-- DIAGNOSTIC SUMMARY
-- ============================================================================

DO $$
DECLARE
  v_total_appointments INTEGER;
  v_dentists_with_auth INTEGER;
  v_dentists_without_auth INTEGER;
  v_appointments_with_valid_dentist INTEGER;
  v_appointments_with_invalid_dentist INTEGER;
BEGIN
  -- Count total appointments
  SELECT COUNT(*) INTO v_total_appointments FROM public.appointments;
  
  -- Count dentists with auth accounts
  SELECT COUNT(*) INTO v_dentists_with_auth
  FROM public.dentists d
  INNER JOIN auth.users u ON u.id = d.id;
  
  -- Count dentists without auth accounts
  SELECT COUNT(*) INTO v_dentists_without_auth
  FROM public.dentists d
  LEFT JOIN auth.users u ON u.id = d.id
  WHERE u.id IS NULL;
  
  -- Count appointments with valid dentist_id
  SELECT COUNT(*) INTO v_appointments_with_valid_dentist
  FROM public.appointments a
  INNER JOIN auth.users u ON u.id = a.dentist_id;
  
  -- Count appointments with invalid dentist_id
  SELECT COUNT(*) INTO v_appointments_with_invalid_dentist
  FROM public.appointments a
  LEFT JOIN auth.users u ON u.id = a.dentist_id
  WHERE u.id IS NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 DENTIST APPOINTMENTS DIAGNOSTIC';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Appointments:';
  RAISE NOTICE '  • Total: %', v_total_appointments;
  RAISE NOTICE '  • With valid dentist_id: %', v_appointments_with_valid_dentist;
  RAISE NOTICE '  • With invalid dentist_id: %', v_appointments_with_invalid_dentist;
  RAISE NOTICE '';
  RAISE NOTICE 'Dentists:';
  RAISE NOTICE '  • With auth account: %', v_dentists_with_auth;
  RAISE NOTICE '  • Without auth account: %', v_dentists_without_auth;
  RAISE NOTICE '';
  
  IF v_appointments_with_invalid_dentist > 0 THEN
    RAISE NOTICE '⚠️  ISSUE FOUND:';
    RAISE NOTICE '   % appointments have dentist_id that doesn''t exist in auth.users', v_appointments_with_invalid_dentist;
    RAISE NOTICE '   These appointments won''t show in dentist portal!';
    RAISE NOTICE '';
    RAISE NOTICE '💡 SOLUTION:';
    RAISE NOTICE '   Run FIX_DENTIST_IDS.sql to correct the dentist_id values';
  ELSE
    RAISE NOTICE '✅ All appointments have valid dentist_id values!';
  END IF;
  
  IF v_dentists_without_auth > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  ISSUE FOUND:';
    RAISE NOTICE '   % dentists don''t have auth accounts', v_dentists_without_auth;
    RAISE NOTICE '   They cannot login to see their appointments!';
    RAISE NOTICE '';
    RAISE NOTICE '💡 SOLUTION:';
    RAISE NOTICE '   Create auth accounts for these dentists via Supabase Auth';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
