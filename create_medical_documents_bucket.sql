-- Create medical_documents storage bucket for chatbot file uploads
-- Run this in Supabase SQL Editor

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical_documents',
  'medical_documents',
  true, -- Public bucket so users can upload
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
-- Allow authenticated and anonymous users to upload (for chatbot)
CREATE POLICY "Allow uploads to medical_documents"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'medical_documents'
);

-- Allow authenticated users to read their own files
CREATE POLICY "Allow users to read their medical documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical_documents'
);

-- Allow public read access (since files are linked in appointments)
CREATE POLICY "Public read access for medical documents"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'medical_documents'
);

-- Allow users to delete their own files
CREATE POLICY "Allow users to delete their medical documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'medical_documents'
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO public;
GRANT ALL ON storage.buckets TO public;
