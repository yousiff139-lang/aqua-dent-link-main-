-- Comprehensive fix for document upload system
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. FIX appointment_medical_info TABLE
-- ============================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.appointment_medical_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Personal Info
    gender TEXT,
    is_pregnant BOOLEAN DEFAULT false,
    
    -- Medical Info
    chronic_diseases TEXT,
    medical_history TEXT,
    medications TEXT,
    allergies TEXT,
    previous_dental_work TEXT,
    smoking BOOLEAN DEFAULT false,
    
    -- Symptoms
    symptoms TEXT,
    chief_complaint TEXT,
    
    -- Documents (JSONB array of {name, url, type, size})
    documents JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one medical record per appointment
    UNIQUE(appointment_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_appointment_medical_info_appointment_id 
ON public.appointment_medical_info(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_medical_info_patient_id 
ON public.appointment_medical_info(patient_id);

-- Enable RLS
ALTER TABLE public.appointment_medical_info ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Dentists can view medical info for their appointments" ON public.appointment_medical_info;
DROP POLICY IF EXISTS "Patients can view their own medical info" ON public.appointment_medical_info;
DROP POLICY IF EXISTS "Patients can insert their own medical info" ON public.appointment_medical_info;
DROP POLICY IF EXISTS "Patients can update their own medical info" ON public.appointment_medical_info;
DROP POLICY IF EXISTS "Allow all authenticated users to insert medical info" ON public.appointment_medical_info;
DROP POLICY IF EXISTS "Allow all authenticated users to view medical info" ON public.appointment_medical_info;

-- Create permissive policies for authenticated users
CREATE POLICY "Allow all authenticated users to insert medical info"
ON public.appointment_medical_info
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to view medical info"
ON public.appointment_medical_info
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow all authenticated users to update medical info"
ON public.appointment_medical_info
FOR UPDATE
TO authenticated
USING (true);

-- ============================================
-- 2. GRANT PERMISSIONS
-- ============================================

GRANT ALL ON public.appointment_medical_info TO authenticated;
GRANT ALL ON public.appointment_medical_info TO service_role;

-- ============================================
-- 3. ENSURE STORAGE BUCKET EXISTS
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-documents', 'medical-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Allow authenticated uploads to medical-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to medical-documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload medical documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view medical documents" ON storage.objects;

-- Create storage policies
CREATE POLICY "Allow authenticated uploads to medical-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'medical-documents');

CREATE POLICY "Allow public read access to medical-documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'medical-documents');

-- ============================================
-- DONE! Test with:
-- 1. Book a new appointment with document upload
-- 2. Check dentist portal to see the documents
-- ============================================
