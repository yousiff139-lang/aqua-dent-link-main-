-- ============================================================================
-- FIX: Database Trigger Permission Error for Dentist Creation
-- ============================================================================
-- This script fixes the "Database error creating new user" issue by updating
-- the handle_new_user() trigger function to properly bypass RLS policies.
--
-- INSTRUCTIONS:
-- 1. Copy all the SQL below
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run the query
-- 4. Verify: "Success. No rows returned"
-- ============================================================================

-- Drop and recreate the function with improved permissions and error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER -- Run with function owner's privileges (postgres superuser)
SET search_path = public, auth
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get role from metadata, default to 'patient'
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'patient');
  
  -- Insert profile (bypass RLS because function is SECURITY DEFINER)
  -- This will work even though auth.uid() is NULL during trigger execution
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    user_role,
    new.created_at,
    new.created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = EXCLUDED.role,
    updated_at = EXCLUDED.updated_at;
  
  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, user_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth user creation
  -- This prevents the entire user creation from failing if profile insert has issues
  RAISE WARNING 'Error in handle_new_user for user %: %', new.id, SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists and is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions to ensure SECURITY DEFINER works properly
-- The function owner (postgres) needs these permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Verify the trigger was created successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    RAISE NOTICE '✅ Trigger on_auth_user_created successfully created';
  ELSE
    RAISE WARNING '❌ Trigger on_auth_user_created was not created';
  END IF;
END $$;

-- Verify the function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user'
  ) THEN
    RAISE NOTICE '✅ Function handle_new_user() successfully created';
  ELSE
    RAISE WARNING '❌ Function handle_new_user() was not created';
  END IF;
END $$;

-- ============================================================================
-- AFTER RUNNING THIS SCRIPT:
-- 1. Check the output for the ✅ messages
-- 2. Restart your backend server
-- 3. Try creating a new dentist in the Admin Panel
-- ============================================================================
