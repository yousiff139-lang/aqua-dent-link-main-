-- ============================================================================
-- FIX DENTIST IDS IN APPOINTMENTS
-- This ensures appointments use the correct dentist_id from auth.users
-- ============================================================================

-- Step 1: Show current mismatches
SELECT 
  'Current Mismatches' as status,
  a.id as appointment_id,
  a.dentist_name,
  a.dentist_email,
  a.dentist_id as current_dentist_id,
  d.id as dentists_table_id,
  u.id as auth_user_id,
  CASE 
    WHEN u.id IS NULL THEN '❌ No auth account'
    WHEN a.dentist_id != u.id THEN '⚠️  ID mismatch'
    ELSE '✅ Correct'
  END as status_check
FROM public.appointments a
LEFT JOIN public.dentists d ON d.email = a.dentist_email OR d.name = a.dentist_name
LEFT JOIN auth.users u ON u.email = a.dentist_email
WHERE a.dentist_id IS NOT NULL
ORDER BY a.created_at DESC
LIMIT 20;

-- Step 2: Fix appointments by matching dentist email
UPDATE public.appointments a
SET dentist_id = u.id
FROM auth.users u
WHERE u.email = a.dentist_email
  AND (a.dentist_id IS NULL OR a.dentist_id != u.id)
  AND u.id IS NOT NULL;

-- Step 3: Fix appointments by matching dentist name (if email match fails)
UPDATE public.appointments a
SET dentist_id = d.id
FROM public.dentists d
INNER JOIN auth.users u ON u.id = d.id
WHERE d.name = a.dentist_name
  AND a.dentist_id IS NULL
  AND u.id IS NOT NULL;

-- Step 4: Verify the fix
DO $$
DECLARE
  v_fixed_count INTEGER;
  v_remaining_issues INTEGER;
BEGIN
  -- Count appointments with valid dentist_id
  SELECT COUNT(*) INTO v_fixed_count
  FROM public.appointments a
  INNER JOIN auth.users u ON u.id = a.dentist_id;
  
  -- Count appointments with invalid dentist_id
  SELECT COUNT(*) INTO v_remaining_issues
  FROM public.appointments a
  LEFT JOIN auth.users u ON u.id = a.dentist_id
  WHERE a.dentist_id IS NOT NULL AND u.id IS NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ DENTIST IDS FIXED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Results:';
  RAISE NOTICE '  • Appointments with valid dentist_id: %', v_fixed_count;
  RAISE NOTICE '  • Appointments with invalid dentist_id: %', v_remaining_issues;
  RAISE NOTICE '';
  
  IF v_remaining_issues > 0 THEN
    RAISE NOTICE '⚠️  Some appointments still have issues.';
    RAISE NOTICE '   These dentists may not have auth accounts yet.';
    RAISE NOTICE '   Create auth accounts for them in Supabase Auth.';
  ELSE
    RAISE NOTICE '🎉 All appointments now have valid dentist_id!';
    RAISE NOTICE '   Dentists can now see their appointments in the portal.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- Step 5: Show updated appointments
SELECT 
  'Updated Appointments' as status,
  a.id as appointment_id,
  a.dentist_name,
  a.dentist_email,
  a.dentist_id,
  a.patient_name,
  a.appointment_date,
  a.appointment_time,
  a.status,
  CASE 
    WHEN u.id IS NOT NULL THEN '✅ Valid'
    ELSE '❌ Invalid'
  END as dentist_id_status
FROM public.appointments a
LEFT JOIN auth.users u ON u.id = a.dentist_id
ORDER BY a.created_at DESC
LIMIT 10;
