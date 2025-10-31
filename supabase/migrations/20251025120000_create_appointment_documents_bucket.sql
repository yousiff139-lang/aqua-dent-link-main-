-- Migration: Create storage bucket for appointment documents
-- This migration creates a storage bucket for PDF summaries and Excel sheets

-- Create storage bucket for appointment documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'appointment-documents',
  'appointment-documents',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for appointment-documents bucket

-- Policy: Authenticated users can upload documents
CREATE POLICY "Authenticated users can upload appointment documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'appointment-documents'
);

-- Policy: Users can view documents for their appointments
CREATE POLICY "Users can view their appointment documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'appointment-documents' AND (
    -- Patient can view their own appointment documents
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.patient_id = auth.uid()
      AND (
        appointments.booking_summary_url LIKE '%' || storage.objects.name || '%'
        OR appointments.excel_sheet_url LIKE '%' || storage.objects.name || '%'
      )
    )
    OR
    -- Dentist can view their appointment documents
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.dentist_id = auth.uid()
      AND public.has_role(auth.uid(), 'dentist'::public.app_role)
      AND (
        appointments.booking_summary_url LIKE '%' || storage.objects.name || '%'
        OR appointments.excel_sheet_url LIKE '%' || storage.objects.name || '%'
      )
    )
    OR
    -- Admin can view all documents
    public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- Policy: Users can update their appointment documents
CREATE POLICY "Users can update their appointment documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'appointment-documents' AND (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.patient_id = auth.uid()
      AND (
        appointments.booking_summary_url LIKE '%' || storage.objects.name || '%'
        OR appointments.excel_sheet_url LIKE '%' || storage.objects.name || '%'
      )
    )
    OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- Policy: Users can delete their old appointment documents
CREATE POLICY "Users can delete old appointment documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'appointment-documents' AND (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.patient_id = auth.uid()
      AND (
        appointments.booking_summary_url LIKE '%' || storage.objects.name || '%'
        OR appointments.excel_sheet_url LIKE '%' || storage.objects.name || '%'
      )
    )
    OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- Create function to cleanup old appointment documents
CREATE OR REPLACE FUNCTION public.cleanup_old_appointment_documents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_document RECORD;
BEGIN
  -- Find documents older than 90 days that are not referenced in appointments
  FOR old_document IN
    SELECT name
    FROM storage.objects
    WHERE bucket_id = 'appointment-documents'
    AND created_at < NOW() - INTERVAL '90 days'
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.booking_summary_url LIKE '%' || storage.objects.name || '%'
      OR appointments.excel_sheet_url LIKE '%' || storage.objects.name || '%'
    )
  LOOP
    -- Delete the old document
    DELETE FROM storage.objects
    WHERE bucket_id = 'appointment-documents'
    AND name = old_document.name;
    
    RAISE NOTICE 'Deleted old document: %', old_document.name;
  END LOOP;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.cleanup_old_appointment_documents() IS 
  'Cleans up appointment documents older than 90 days that are not referenced in any appointments. Should be run periodically via cron job.';

-- Grant execute permission to authenticated users (for admin use)
GRANT EXECUTE ON FUNCTION public.cleanup_old_appointment_documents() TO authenticated;
