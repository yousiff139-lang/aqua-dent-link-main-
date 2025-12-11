-- FIX: Allow public access to dentists and services
-- Run this in Supabase SQL Editor

-- 1. Allow anyone (even not logged in) to view dentists
DROP POLICY IF EXISTS "Allow public read access to dentists" ON dentists;
CREATE POLICY "Allow public read access to dentists"
ON dentists FOR SELECT
TO public
USING (true);

-- 2. Allow anyone to view services/appointment_types
DROP POLICY IF EXISTS "Allow public read access to appointment_types" ON appointment_types;
CREATE POLICY "Allow public read access to appointment_types"
ON appointment_types FOR SELECT
TO public
USING (true);

-- 3. Also allow anon access explicitly
DROP POLICY IF EXISTS "Allow anon read access to dentists" ON dentists;
CREATE POLICY "Allow anon read access to dentists"
ON dentists FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Allow anon read access to appointment_types" ON appointment_types;
CREATE POLICY "Allow anon read access to appointment_types"
ON appointment_types FOR SELECT
TO anon
USING (true);

-- 4. Make sure all dentists are active
UPDATE dentists SET status = 'active' WHERE status IS NULL OR status != 'active';

-- 5. Verify
SELECT 'Dentists count: ' || COUNT(*) as info FROM dentists WHERE status = 'active';
