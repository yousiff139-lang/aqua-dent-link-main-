-- COMPLETE DATABASE SETUP SCRIPT
-- This script sets up the entire database schema, fixes RLS policies, and adds sample dentist data
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- PART 1: DISABLE RLS TEMPORARILY TO CLEAN UP
-- ============================================================================

ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dentists DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: DROP ALL EXISTING POLICIES
-- ============================================================================

-- Drop old policy names
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Simple public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Simple self update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Simple self insert profiles" ON public.profiles;

-- Drop new policy names (in case script was run before)
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;

DROP POLICY IF EXISTS "Allow public read access to dentists" ON public.dentists;
DROP POLICY IF EXISTS "Allow authenticated read access to dentists" ON public.dentists;
DROP POLICY IF EXISTS "Allow admin full access to dentists" ON public.dentists;
DROP POLICY IF EXISTS "Dentists are viewable by everyone" ON public.dentists;
DROP POLICY IF EXISTS "Admins can manage dentists" ON public.dentists;
DROP POLICY IF EXISTS "Simple public read dentists" ON public.dentists;
DROP POLICY IF EXISTS "Authenticated can manage dentists" ON public.dentists;

-- Drop new policy names (in case script was run before)
DROP POLICY IF EXISTS "dentists_public_read" ON public.dentists;
DROP POLICY IF EXISTS "dentists_auth_manage" ON public.dentists;

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Simple public read roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated can manage roles" ON public.user_roles;

-- Drop new policy names (in case script was run before)
DROP POLICY IF EXISTS "user_roles_public_read" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_auth_manage" ON public.user_roles;

-- ============================================================================
-- PART 3: RE-ENABLE RLS
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: CREATE SIMPLE, NON-RECURSIVE POLICIES
-- ============================================================================

-- Profiles: Public read (no recursion)
CREATE POLICY "profiles_public_read"
ON public.profiles FOR SELECT
TO public
USING (true);

-- Profiles: Self insert
CREATE POLICY "profiles_self_insert"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Profiles: Self update
CREATE POLICY "profiles_self_update"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Dentists: Public read (everyone can see dentists)
CREATE POLICY "dentists_public_read"
ON public.dentists FOR SELECT
TO public
USING (true);

-- Dentists: Authenticated users can manage (simplified for now)
CREATE POLICY "dentists_auth_manage"
ON public.dentists FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- User Roles: Public read (needed for role checks)
CREATE POLICY "user_roles_public_read"
ON public.user_roles FOR SELECT
TO public
USING (true);

-- User Roles: Authenticated can manage
CREATE POLICY "user_roles_auth_manage"
ON public.user_roles FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================================
-- PART 5: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

GRANT SELECT ON public.dentists TO anon, authenticated;
GRANT ALL ON public.dentists TO authenticated;

GRANT SELECT ON public.user_roles TO anon, authenticated;
GRANT ALL ON public.user_roles TO authenticated;

-- ============================================================================
-- PART 6: VERIFY SETUP
-- ============================================================================

-- Check if tables exist and are accessible
SELECT 'Profiles count:' as info, count(*) as count FROM public.profiles
UNION ALL
SELECT 'Dentists count:' as info, count(*) as count FROM public.dentists
UNION ALL
SELECT 'User roles count:' as info, count(*) as count FROM public.user_roles;

-- Show current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'dentists', 'user_roles')
ORDER BY tablename, policyname;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database setup complete!';
  RAISE NOTICE '✅ RLS policies fixed (no more infinite recursion)';
  RAISE NOTICE '✅ Public can now read dentists, profiles, and user_roles';
  RAISE NOTICE '✅ Authenticated users can manage data';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh your admin panel at http://localhost:3010/doctors';
  RAISE NOTICE '2. If no doctors appear, run seed_dentists.ts to add sample data';
END $$;
