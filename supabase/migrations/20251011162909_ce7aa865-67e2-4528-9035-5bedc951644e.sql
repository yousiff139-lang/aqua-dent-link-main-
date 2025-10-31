-- Add explicit access control policies for appointments table to prevent unauthorized access

-- Drop existing policies to consolidate them with better security
DROP POLICY IF EXISTS "Patients can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Patients can create appointments" ON appointments;
DROP POLICY IF EXISTS "Patients can update own appointments" ON appointments;
DROP POLICY IF EXISTS "Patients can delete own appointments" ON appointments;
DROP POLICY IF EXISTS "Dentists can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Dentists can update their appointments" ON appointments;

-- Create comprehensive policies with explicit authorization checks

-- Deny all anonymous access to appointments
CREATE POLICY "Deny anonymous access to appointments"
ON appointments
FOR ALL
TO anon
USING (false);

-- Allow patients to view only their own appointments
CREATE POLICY "Patients can view own appointments"
ON appointments
FOR SELECT
TO authenticated
USING (
  auth.uid() = patient_id 
  AND has_role(auth.uid(), 'patient'::app_role)
);

-- Allow patients to create their own appointments
CREATE POLICY "Patients can create appointments"
ON appointments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = patient_id 
  AND has_role(auth.uid(), 'patient'::app_role)
);

-- Allow patients to update their own appointments
CREATE POLICY "Patients can update own appointments"
ON appointments
FOR UPDATE
TO authenticated
USING (
  auth.uid() = patient_id 
  AND has_role(auth.uid(), 'patient'::app_role)
);

-- Allow patients to delete their own appointments
CREATE POLICY "Patients can delete own appointments"
ON appointments
FOR DELETE
TO authenticated
USING (
  auth.uid() = patient_id 
  AND has_role(auth.uid(), 'patient'::app_role)
);

-- Allow dentists to view their assigned appointments
CREATE POLICY "Dentists can view their appointments"
ON appointments
FOR SELECT
TO authenticated
USING (
  auth.uid() = dentist_id 
  AND has_role(auth.uid(), 'dentist'::app_role)
);

-- Allow dentists to update their assigned appointments
CREATE POLICY "Dentists can update their appointments"
ON appointments
FOR UPDATE
TO authenticated
USING (
  auth.uid() = dentist_id 
  AND has_role(auth.uid(), 'dentist'::app_role)
);