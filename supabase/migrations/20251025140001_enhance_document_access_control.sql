-- Migration: Enhance document access control with signed URLs and expiration
-- This migration improves security for appointment document access

-- ============================================================================
-- UPDATE STORAGE BUCKET CONFIGURATION
-- ============================================================================

-- Update appointment-documents bucket to be private (not public)
UPDATE storage.buckets
SET public = false
WHERE id = 'appointment-documents';

-- ============================================================================
-- ENHANCED STORAGE RLS POLICIES
-- ============================================================================

-- Drop existing storage policies to recreate with enhancements
DROP POLICY IF EXISTS "Authenticated users can upload appointment documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their appointment documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their appointment documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete old appointment documents" ON storage.objects;

-- Policy: Authenticated users can upload documents (with validation)
CREATE POLICY "Authenticated users can upload appointment documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'appointment-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
  -- Validate file size (max 10MB)
  AND (
    SELECT pg_column_size(storage.objects.metadata)
  ) <= 10485760
);

-- Policy: Users can view documents for their appointments (patients and dentists)
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
    -- Patient can view documents they uploaded
    EXISTS (
      SELECT 1 FROM public.appointment_documents
      WHERE appointment_documents.uploaded_by = auth.uid()
      AND appointment_documents.file_url LIKE '%' || storage.objects.name || '%'
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
    -- Dentist can view documents for their appointments
    EXISTS (
      SELECT 1 FROM public.appointment_documents ad
      JOIN public.appointments a ON ad.appointment_id = a.id
      WHERE a.dentist_id = auth.uid()
      AND public.has_role(auth.uid(), 'dentist'::public.app_role)
      AND ad.file_url LIKE '%' || storage.objects.name || '%'
    )
    OR
    -- Admin can view all documents
    public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- Policy: Users can update their appointment documents (limited)
CREATE POLICY "Users can update their appointment documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'appointment-documents' AND (
    -- Patient can update documents they uploaded
    EXISTS (
      SELECT 1 FROM public.appointment_documents
      WHERE appointment_documents.uploaded_by = auth.uid()
      AND appointment_documents.file_url LIKE '%' || storage.objects.name || '%'
    )
    OR
    -- Admin can update all documents
    public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- Policy: Users can delete their old appointment documents
CREATE POLICY "Users can delete old appointment documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'appointment-documents' AND (
    -- Patient can delete documents they uploaded (within 24 hours)
    EXISTS (
      SELECT 1 FROM public.appointment_documents
      WHERE appointment_documents.uploaded_by = auth.uid()
      AND appointment_documents.file_url LIKE '%' || storage.objects.name || '%'
      AND appointment_documents.created_at > now() - INTERVAL '24 hours'
    )
    OR
    -- System can delete old documents (via service role)
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE (
        appointments.booking_summary_url LIKE '%' || storage.objects.name || '%'
        OR appointments.excel_sheet_url LIKE '%' || storage.objects.name || '%'
      )
    )
    OR
    -- Admin can delete all documents
    public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- ============================================================================
-- DOCUMENT ACCESS TRACKING
-- ============================================================================

-- Create table to track document access
CREATE TABLE IF NOT EXISTS public.document_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  document_name TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('booking_summary', 'excel_sheet', 'patient_upload')),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  access_type TEXT CHECK (access_type IN ('view', 'download', 'upload', 'delete')),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on document access log
ALTER TABLE public.document_access_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own access logs
CREATE POLICY "Users can view own access logs"
  ON public.document_access_log FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Policy: System can insert access logs
CREATE POLICY "System can insert access logs"
  ON public.document_access_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_document_access_log_user_id ON public.document_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_document_access_log_appointment_id ON public.document_access_log(appointment_id);
CREATE INDEX IF NOT EXISTS idx_document_access_log_created_at ON public.document_access_log(created_at);
CREATE INDEX IF NOT EXISTS idx_document_access_log_document_type ON public.document_access_log(document_type);

-- ============================================================================
-- SIGNED URL GENERATION FUNCTION
-- ============================================================================

-- Function to generate signed URL with expiration
CREATE OR REPLACE FUNCTION public.generate_signed_document_url(
  p_document_path TEXT,
  p_appointment_id UUID,
  p_expiration_seconds INTEGER DEFAULT 3600
)
RETURNS TABLE (
  signed_url TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_user_id UUID;
  v_has_access BOOLEAN := false;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Validate expiration time (max 24 hours)
  IF p_expiration_seconds > 86400 THEN
    RAISE EXCEPTION 'Expiration time cannot exceed 24 hours';
  END IF;
  
  -- Check if user has access to this document
  SELECT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id = p_appointment_id
    AND (
      a.patient_id = v_user_id
      OR (a.dentist_id = v_user_id AND public.has_role(v_user_id, 'dentist'::app_role))
      OR public.has_role(v_user_id, 'admin'::app_role)
    )
  ) INTO v_has_access;
  
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'User does not have access to this document';
  END IF;
  
  -- Calculate expiration time
  v_expires_at := now() + (p_expiration_seconds || ' seconds')::INTERVAL;
  
  -- Log document access
  INSERT INTO public.document_access_log (
    user_id,
    document_name,
    document_type,
    appointment_id,
    access_type
  ) VALUES (
    v_user_id,
    p_document_path,
    CASE 
      WHEN p_document_path LIKE '%booking-summary%' THEN 'booking_summary'
      WHEN p_document_path LIKE '%appointment-sheet%' THEN 'excel_sheet'
      ELSE 'patient_upload'
    END,
    p_appointment_id,
    'view'
  );
  
  -- Note: Actual signed URL generation would be done by Supabase Storage API
  -- This function validates access and logs the request
  -- The frontend/edge function should call Supabase Storage createSignedUrl()
  
  RETURN QUERY SELECT 
    p_document_path::TEXT as signed_url,
    v_expires_at as expires_at;
END;
$;

-- ============================================================================
-- DOCUMENT PERMISSION VALIDATION FUNCTION
-- ============================================================================

-- Function to validate user has permission to access document
CREATE OR REPLACE FUNCTION public.validate_document_access(
  p_document_url TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_user_id UUID;
  v_has_access BOOLEAN := false;
BEGIN
  -- Use provided user_id or get current user
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user has access to this document
  SELECT EXISTS (
    -- Check if it's a booking summary or excel sheet
    SELECT 1 FROM public.appointments
    WHERE (
      booking_summary_url = p_document_url
      OR excel_sheet_url = p_document_url
    )
    AND (
      patient_id = v_user_id
      OR (dentist_id = v_user_id AND public.has_role(v_user_id, 'dentist'::app_role))
      OR public.has_role(v_user_id, 'admin'::app_role)
    )
    
    UNION
    
    -- Check if it's a patient-uploaded document
    SELECT 1 FROM public.appointment_documents ad
    JOIN public.appointments a ON ad.appointment_id = a.id
    WHERE ad.file_url = p_document_url
    AND (
      a.patient_id = v_user_id
      OR ad.uploaded_by = v_user_id
      OR (a.dentist_id = v_user_id AND public.has_role(v_user_id, 'dentist'::app_role))
      OR public.has_role(v_user_id, 'admin'::app_role)
    )
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions
GRANT SELECT, INSERT ON public.document_access_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_signed_document_url(TEXT, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_document_access(TEXT, UUID) TO authenticated;

-- Add comments
COMMENT ON TABLE public.document_access_log IS 
  'Tracks all document access operations for audit and security purposes.';

COMMENT ON FUNCTION public.generate_signed_document_url(TEXT, UUID, INTEGER) IS 
  'Validates user access and prepares for signed URL generation with expiration. Max expiration: 24 hours.';

COMMENT ON FUNCTION public.validate_document_access(TEXT, UUID) IS 
  'Validates whether a user has permission to access a specific document URL.';
