-- Create medical documents storage bucket and policies
-- This enables file uploads for appointment medical documents

-- Drop existing policies first (in case they exist with different definitions)
DROP POLICY IF EXISTS "Authenticated users can upload medical documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view medical documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update medical documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete medical documents" ON storage.objects;

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-documents', 'medical-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload medical documents
CREATE POLICY "Authenticated users can upload medical documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'medical-documents');

-- Allow authenticated users to view medical documents
CREATE POLICY "Users can view medical documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'medical-documents');

-- Allow users to update their medical documents
CREATE POLICY "Users can update medical documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'medical-documents');

-- Allow users to delete medical documents
CREATE POLICY "Users can delete medical documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'medical-documents');

-- Verify bucket was created
SELECT id, name, public FROM storage.buckets WHERE id = 'medical-documents';
