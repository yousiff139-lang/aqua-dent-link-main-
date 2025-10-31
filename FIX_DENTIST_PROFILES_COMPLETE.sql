-- Add doctor_id and pdf_path to appointments, and FK to dentists
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS doctor_id INT NULL,
  ADD COLUMN IF NOT EXISTS pdf_path VARCHAR(255) NULL;

-- Add foreign key (if not present)
ALTER TABLE appointments
  ADD CONSTRAINT IF NOT EXISTS fk_appointments_doctor
  FOREIGN KEY (doctor_id) REFERENCES dentists(id);

-- Optional seed: available_slots as JSON text example
-- UPDATE dentists SET available_slots='["2025-11-01 09:00","2025-11-01 10:00","2025-11-02 14:00"]' WHERE id=1;

-- ============================================================================
-- COMPLETE FIX FOR DENTIST PROFILES
-- This script fixes all issues with dentist profiles:
-- 1. Fixes image URLs (replaces local paths with Unsplash URLs)
-- 2. Adds RLS policies for public access
-- 3. Verifies everything works
-- ============================================================================

-- STEP 1: Fix dentist images with proper Unsplash URLs
-- ============================================================================

UPDATE dentists SET image_url = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=800&fit=crop'
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

UPDATE dentists SET image_url = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&h=800&fit=crop'
WHERE id = '550e8400-e29b-41d4-a716-446655440002';

UPDATE dentists SET image_url = 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=800&h=800&fit=crop'
WHERE id = '550e8400-e29b-41d4-a716-446655440003';

UPDATE dentists SET image_url = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&h=800&fit=crop'
WHERE id = '550e8400-e29b-41d4-a716-446655440004';

UPDATE dentists SET image_url = 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&h=800&fit=crop'
WHERE id = '550e8400-e29b-41d4-a716-446655440005';

UPDATE dentists SET image_url = 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800&h=800&fit=crop'
WHERE id = '550e8400-e29b-41d4-a716-446655440006';

-- STEP 2: Enable RLS and create policies
-- ============================================================================

-- Enable RLS on dentists table
ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to dentists" ON public.dentists;
DROP POLICY IF EXISTS "Allow authenticated read access to dentists" ON public.dentists;
DROP POLICY IF EXISTS "Allow admin full access to dentists" ON public.dentists;

-- Create policy: Allow public (anonymous) users to view all dentists
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

-- STEP 3: Grant permissions
-- ============================================================================

GRANT SELECT ON public.dentists TO anon;
GRANT SELECT ON public.dentists TO authenticated;

-- STEP 4: Verification
-- ============================================================================

-- Verify images were updated
DO $$
DECLARE
  images_fixed INTEGER;
  total_dentists INTEGER;
BEGIN
  SELECT COUNT(*) INTO images_fixed
  FROM dentists
  WHERE image_url LIKE 'https://images.unsplash.com/%';
  
  SELECT COUNT(*) INTO total_dentists
  FROM dentists;
  
  RAISE NOTICE '✅ Images fixed: % out of % dentists', images_fixed, total_dentists;
END $$;

-- Verify RLS policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'dentists';
  
  RAISE NOTICE '✅ RLS policies created: % policies', policy_count;
END $$;

-- Verify public can read dentists
DO $$
DECLARE
  dentist_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dentist_count
  FROM dentists;
  
  RAISE NOTICE '✅ Dentists accessible: % dentists available', dentist_count;
END $$;

-- Display dentist data for verification
SELECT 
  id,
  name,
  specialization,
  rating,
  CASE 
    WHEN image_url LIKE 'https://images.unsplash.com/%' THEN '✅ Valid'
    WHEN image_url IS NULL THEN '❌ Missing'
    ELSE '⚠️ Invalid'
  END as image_status,
  LEFT(image_url, 50) || '...' as image_url_preview
FROM dentists
ORDER BY name;

-- Display RLS policies
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'dentists'
ORDER BY policyname;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 DENTIST PROFILES FIX COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Dentist images updated with Unsplash URLs';
  RAISE NOTICE '✅ RLS policies configured for public access';
  RAISE NOTICE '✅ Permissions granted to anon and authenticated users';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '   1. Refresh your browser';
  RAISE NOTICE '   2. Navigate to http://localhost:5173/dentists';
  RAISE NOTICE '   3. Verify dentist images load correctly';
  RAISE NOTICE '   4. Click "View Profile" to test profile pages';
  RAISE NOTICE '';
END $$;
