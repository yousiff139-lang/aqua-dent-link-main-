-- Check if dentists table has RLS enabled and what policies exist
-- Run this in Supabase SQL Editor to diagnose access issues

-- Check if RLS is enabled on dentists table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'dentists';

-- Check what policies exist on dentists table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'dentists'
ORDER BY policyname;

-- Test if anonymous users can read dentists
-- This should work if policies are correct
SELECT id, name, email, image_url 
FROM dentists 
LIMIT 3;

-- If the above fails, we need to add RLS policies for dentists table
