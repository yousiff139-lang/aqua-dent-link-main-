-- Create storage bucket for medical files
INSERT INTO storage.buckets (id, name, public) VALUES ('medical-files', 'medical-files', false);

-- Create policy for authenticated users to upload their own files
CREATE POLICY "Users can upload their own medical files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'medical-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for users to view their own files
CREATE POLICY "Users can view their own medical files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'medical-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);