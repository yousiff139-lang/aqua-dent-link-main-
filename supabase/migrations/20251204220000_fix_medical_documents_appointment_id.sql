-- Migration: Add appointment_id column to medical_documents
-- This fixes the X-ray retrieval issue in the dentist portal

-- Add appointment_id column if it doesn't exist
ALTER TABLE public.medical_documents
ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_medical_documents_appointment_id 
ON public.medical_documents(appointment_id);

-- Update existing documents to link to appointments via health_info
-- This migrates existing data
UPDATE public.medical_documents md
SET appointment_id = ahi.appointment_id
FROM public.appointment_health_info ahi
WHERE md.health_info_id = ahi.id
  AND md.appointment_id IS NULL
  AND ahi.appointment_id IS NOT NULL;

-- Add RLS policy for the new column
DROP POLICY IF EXISTS "Dentists can view patient X-rays for their appointments" ON public.medical_documents;

CREATE POLICY "Dentists can view patient X-rays for their appointments"
ON public.medical_documents
FOR SELECT
USING (
    -- Patient can see their own documents
    auth.uid() = patient_id
    OR
    -- Dentist can see documents for their appointments
    EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.id = medical_documents.appointment_id
        AND a.dentist_id IN (
            SELECT d.id FROM public.dentists d
            JOIN public.user_roles ur ON ur.dentist_id = d.id
            WHERE ur.user_id = auth.uid()
        )
    )
    OR
    -- Admin can see all documents
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
    )
);

-- Grant necessary permissions
GRANT ALL ON public.medical_documents TO authenticated;
GRANT ALL ON public.medical_documents TO service_role;
