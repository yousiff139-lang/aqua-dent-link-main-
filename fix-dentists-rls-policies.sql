-- Fix RLS policies for dentists table
-- This ensures public users can view dentist profiles
-- Run this in Supabase SQL Editor

-- Enable RLS on dentists table (if not already enabled)
ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to dentists" ON public.dentists;
DROP POLICY IF EXISTS "Allow authenticated read access to dentists" ON public.dentists;
DROP POLICY IF EXISTS "Allow admin full access to dentists" ON public.dentists;

-- Create policy: Allow public (anonymous) users to view all dentists
-- This is required for the dentists list and profile pages to work
CREATE POLICY "Allow public read access to dentists"
  ON public.dentists
  FOR SELECT
  TO public
  USING (true);

-- Create policy: Allow authenticated users to view all dentists
CREATE POLICY "Allow authenticated read access to dentists"
  ON public.dentists
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy: Allow admins to manage dentists
CREATE POLICY "Allow admin full access to dentists"
  ON public.dentists
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('karrarmayaly@gmail.com', 'bingo@gmail.com')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('karrarmayaly@gmail.com', 'bingo@gmail.com')
    )
  );

-- Grant permissions
GRANT SELECT ON public.dentists TO anon;
GRANT SELECT ON public.dentists TO authenticated;

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'dentists'
ORDER BY policyname;

-- Test public access
SELECT COUNT(*) as dentist_count FROM public.dentists;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies for dentists table configured successfully';
  RAISE NOTICE '✅ Public users can now view dentist profiles';
  RAISE NOTICE '✅ Authenticated users can view dentist profiles';
  RAISE NOTICE '✅ Admins can manage dentists';
END $$;
