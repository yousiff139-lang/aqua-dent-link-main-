-- ============================================================================
-- VERIFICATION SCRIPT - Run this AFTER applying the migration
-- ============================================================================
-- This script verifies that the appointments table and RLS policies
-- are correctly set up after applying 20251027140000_fix_schema_cache_appointments.sql
-- ============================================================================

-- 1. Check if appointments table exists
DO $
DECLARE
    table_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '✅ SUCCESS: Appointments table exists';
    ELSE
        RAISE EXCEPTION '❌ FAIL: Appointments table does not exist';
    END IF;
END $;

-- 2. Check column count
DO $
DECLARE
    column_count integer;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments';
    
    IF column_count >= 25 THEN
        RAISE NOTICE '✅ SUCCESS: Appointments table has % columns (expected 25+)', column_count;
    ELSE
        RAISE WARNING '⚠️  WARNING: Appointments table has only % columns (expected 25+)', column_count;
    END IF;
END $;

-- 3. Check RLS is enabled
DO $
DECLARE
    rls_enabled boolean;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'appointments'
    AND relnamespace = 'public'::regnamespace;
    
    IF rls_enabled THEN
        RAISE NOTICE '✅ SUCCESS: RLS is enabled on appointments table';
    ELSE
        RAISE EXCEPTION '❌ FAIL: RLS is NOT enabled on appointments table';
    END IF;
END $;

-- 4. Check RLS policies count
DO $
DECLARE
    policy_count integer;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'appointments';
    
    IF policy_count >= 9 THEN
        RAISE NOTICE '✅ SUCCESS: Found % RLS policies (expected 9)', policy_count;
    ELSE
        RAISE WARNING '⚠️  WARNING: Found only % RLS policies (expected 9)', policy_count;
    END IF;
END $;

-- 5. List all RLS policies
DO $
BEGIN
    RAISE NOTICE '📋 RLS Policies:';
END $;

SELECT 
    policyname,
    cmd,
    CASE 
        WHEN roles = '{public}' THEN 'public'
        WHEN roles = '{authenticated}' THEN 'authenticated'
        ELSE array_to_string(roles, ', ')
    END as roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'appointments'
ORDER BY policyname;

-- 6. Check required columns exist
DO $
DECLARE
    missing_columns text[];
    required_columns text[] := ARRAY[
        'id', 'patient_id', 'dentist_id', 'patient_name', 'patient_email',
        'patient_phone', 'dentist_name', 'dentist_email', 'appointment_date',
        'appointment_time', 'appointment_type', 'status', 'payment_method',
        'payment_status', 'chief_complaint', 'symptoms', 'medical_history',
        'cause_identified', 'uncertainty_note', 'patient_notes', 'dentist_notes',
        'documents', 'booking_reference', 'conversation_id', 'created_at', 'updated_at'
    ];
    col text;
    col_exists boolean;
BEGIN
    FOREACH col IN ARRAY required_columns
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'appointments'
            AND column_name = col
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) IS NULL THEN
        RAISE NOTICE '✅ SUCCESS: All required columns exist';
    ELSE
        RAISE WARNING '⚠️  WARNING: Missing columns: %', array_to_string(missing_columns, ', ');
    END IF;
END $;

-- 7. Check indexes
DO $
DECLARE
    index_count integer;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'appointments';
    
    IF index_count >= 7 THEN
        RAISE NOTICE '✅ SUCCESS: Found % indexes (expected 7+)', index_count;
    ELSE
        RAISE WARNING '⚠️  WARNING: Found only % indexes (expected 7+)', index_count;
    END IF;
END $;

-- 8. List all indexes
DO $
BEGIN
    RAISE NOTICE '📋 Indexes:';
END $;

SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'appointments'
ORDER BY indexname;

-- 9. Check grants/permissions
DO $
DECLARE
    has_authenticated_select boolean;
    has_authenticated_insert boolean;
    has_anon_insert boolean;
BEGIN
    -- Check authenticated role permissions
    SELECT 
        has_table_privilege('authenticated', 'public.appointments', 'SELECT') INTO has_authenticated_select;
    SELECT 
        has_table_privilege('authenticated', 'public.appointments', 'INSERT') INTO has_authenticated_insert;
    SELECT 
        has_table_privilege('anon', 'public.appointments', 'INSERT') INTO has_anon_insert;
    
    IF has_authenticated_select THEN
        RAISE NOTICE '✅ SUCCESS: authenticated role has SELECT permission';
    ELSE
        RAISE WARNING '⚠️  WARNING: authenticated role missing SELECT permission';
    END IF;
    
    IF has_authenticated_insert THEN
        RAISE NOTICE '✅ SUCCESS: authenticated role has INSERT permission';
    ELSE
        RAISE WARNING '⚠️  WARNING: authenticated role missing INSERT permission';
    END IF;
    
    IF has_anon_insert THEN
        RAISE NOTICE '✅ SUCCESS: anon role has INSERT permission';
    ELSE
        RAISE WARNING '⚠️  WARNING: anon role missing INSERT permission';
    END IF;
END $;

-- 10. Test public insert (simulated)
DO $
BEGIN
    -- We can't actually test as anon role, but we can check the policy exists
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'appointments'
        AND policyname = 'Allow public appointment creation'
        AND cmd = 'INSERT'
    ) THEN
        RAISE NOTICE '✅ SUCCESS: Public insert policy exists';
    ELSE
        RAISE WARNING '⚠️  WARNING: Public insert policy not found';
    END IF;
END $;

-- 11. Check constraints
DO $
BEGIN
    RAISE NOTICE '📋 Constraints:';
END $;

SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.appointments'::regclass
ORDER BY conname;

-- 12. Sample data count
DO $
DECLARE
    row_count integer;
BEGIN
    SELECT COUNT(*) INTO row_count FROM public.appointments;
    RAISE NOTICE '📊 Current appointment count: %', row_count;
END $;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================
DO $
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '                    VERIFICATION COMPLETE                      ';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Review any warnings above';
    RAISE NOTICE '2. Test booking form in your application';
    RAISE NOTICE '3. Verify appointments appear in dashboard';
    RAISE NOTICE '4. Check browser console for errors';
    RAISE NOTICE '';
    RAISE NOTICE 'If all checks passed, your booking system is ready! 🎉';
    RAISE NOTICE '';
END $;
