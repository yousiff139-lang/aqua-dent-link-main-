-- ============================================================================
-- CREATE STORAGE BUCKETS FOR DOCUMENT UPLOADS
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Create medical-documents bucket for patient X-rays and documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-documents',
  'medical-documents',
  false,  -- Private bucket
  52428800,  -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/dicom']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800;

-- Create appointment-pdfs bucket for generated PDF reports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'appointment-pdfs',
  'appointment-pdfs',
  false,
  10485760,  -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760;

-- Create xray-uploads bucket for X-ray analysis
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'xray-uploads',
  'xray-uploads',
  false,
  52428800,  -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/dicom']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800;

-- ============================================================================
-- STORAGE POLICIES - Allow uploads and access
-- ============================================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Allow authenticated uploads to medical-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from medical-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to medical-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from medical-documents" ON storage.objects;

DROP POLICY IF EXISTS "Allow authenticated uploads to xray-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from xray-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to xray-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from xray-uploads" ON storage.objects;

-- Medical Documents - Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads to medical-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'medical-documents');

-- Medical Documents - Allow authenticated users to read
CREATE POLICY "Allow authenticated reads from medical-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'medical-documents');

-- Medical Documents - Allow anon uploads (for chatbot flow)
CREATE POLICY "Allow public uploads to medical-documents"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'medical-documents');

-- Medical Documents - Allow anon reads
CREATE POLICY "Allow public reads from medical-documents"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'medical-documents');

-- X-ray Uploads - Allow authenticated uploads
CREATE POLICY "Allow authenticated uploads to xray-uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'xray-uploads');

-- X-ray Uploads - Allow authenticated reads
CREATE POLICY "Allow authenticated reads from xray-uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'xray-uploads');

-- X-ray Uploads - Allow public uploads (for chatbot X-ray analysis)
CREATE POLICY "Allow public uploads to xray-uploads"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'xray-uploads');

-- X-ray Uploads - Allow public reads
CREATE POLICY "Allow public reads from xray-uploads"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'xray-uploads');

-- Appointment PDFs - Allow authenticated access
CREATE POLICY "Allow authenticated uploads to appointment-pdfs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'appointment-pdfs');

CREATE POLICY "Allow authenticated reads from appointment-pdfs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'appointment-pdfs');

-- ============================================================================
-- VERIFY BUCKETS CREATED
-- ============================================================================

SELECT id, name, public, file_size_limit FROM storage.buckets;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Storage buckets created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📁 Buckets:';
  RAISE NOTICE '   - medical-documents (for patient uploads)';
  RAISE NOTICE '   - xray-uploads (for X-ray analysis)';
  RAISE NOTICE '   - appointment-pdfs (for generated reports)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Policies: Upload and read access enabled';
  RAISE NOTICE '';
  RAISE NOTICE 'Document uploads should now work!';
END $$;
