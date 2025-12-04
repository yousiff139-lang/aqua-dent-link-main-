-- Fix X-Ray Lab Upload RLS Policies
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. FIX STORAGE BUCKET POLICIES
-- ============================================

-- First, ensure the medical-documents bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-documents', 'medical-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies to recreate them
DROP POLICY IF EXISTS "Authenticated users can upload medical documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view medical documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to medical-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to medical-documents" ON storage.objects;
DROP POLICY IF EXISTS "medical_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "medical_documents_select" ON storage.objects;

-- Allow ANY authenticated user to upload to medical-documents bucket
CREATE POLICY "Allow authenticated uploads to medical-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'medical-documents');

-- Allow anyone to view medical documents (public bucket)
CREATE POLICY "Allow public read access to medical-documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'medical-documents');

-- Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated updates to medical-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'medical-documents');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated deletes to medical-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'medical-documents');

-- ============================================
-- 2. FIX MEDICAL_DOCUMENTS TABLE POLICIES
-- ============================================

-- Add appointment_id column if missing
ALTER TABLE public.medical_documents
ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_medical_documents_appointment_id 
ON public.medical_documents(appointment_id);

-- Drop all existing policies on medical_documents
DROP POLICY IF EXISTS "Users can view their own medical documents" ON public.medical_documents;
DROP POLICY IF EXISTS "Users can insert their own medical documents" ON public.medical_documents;
DROP POLICY IF EXISTS "Users can update their own medical documents" ON public.medical_documents;
DROP POLICY IF EXISTS "Dentists can view patient X-rays for their appointments" ON public.medical_documents;
DROP POLICY IF EXISTS "medical_documents_select" ON public.medical_documents;
DROP POLICY IF EXISTS "medical_documents_insert" ON public.medical_documents;
DROP POLICY IF EXISTS "medical_documents_update" ON public.medical_documents;

-- Enable RLS
ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Allow INSERT for authenticated users
CREATE POLICY "Anyone authenticated can insert medical documents"
ON public.medical_documents FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Allow SELECT for authenticated users (dentists need to see all X-rays)
CREATE POLICY "Authenticated users can view all medical documents"
ON public.medical_documents FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow UPDATE for authenticated users
CREATE POLICY "Authenticated users can update medical documents"
ON public.medical_documents FOR UPDATE
TO authenticated
USING (true);

-- Policy: Allow DELETE for authenticated users
CREATE POLICY "Authenticated users can delete medical documents"
ON public.medical_documents FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- 3. GRANT PERMISSIONS
-- ============================================

GRANT ALL ON public.medical_documents TO authenticated;
GRANT ALL ON public.medical_documents TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;

-- ============================================
-- 4. FIX PROFILES TABLE (for patient_id foreign key)
-- ============================================

-- Make sure profiles table allows the dentist's user ID
-- The patient_id in medical_documents references profiles(id)
-- We need to ensure the dentist exists in profiles

-- Add policy to allow inserting into profiles if needed
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- ============================================
-- DONE! X-Ray Lab should now work.
-- ============================================
