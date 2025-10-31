-- Add document/attachment support to appointments
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS patient_notes TEXT,
  ADD COLUMN IF NOT EXISTS medical_history TEXT;

-- Create appointment_documents table for better document management
CREATE TABLE IF NOT EXISTS public.appointment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.appointment_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for appointment_documents
CREATE POLICY "Patients can view their appointment documents"
  ON public.appointment_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = appointment_documents.appointment_id
      AND appointments.patient_id = auth.uid()
    )
  );

CREATE POLICY "Dentists can view their appointment documents"
  ON public.appointment_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = appointment_documents.appointment_id
      AND appointments.dentist_id = auth.uid()
      AND public.has_role(auth.uid(), 'dentist')
    )
  );

CREATE POLICY "Patients can upload documents to their appointments"
  ON public.appointment_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = appointment_documents.appointment_id
      AND appointments.patient_id = auth.uid()
    )
  );

-- Grant dentist role to specified email
-- This will be executed when the user with this email signs up or exists
DO $
DECLARE
  target_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'karrarmayaly@gmail.com';
  
  -- If user exists, grant dentist role
  IF target_user_id IS NOT NULL THEN
    -- Insert dentist role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'dentist')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Create dentist profile if not exists
    INSERT INTO public.dentists (id, specialization, bio, years_of_experience, rating)
    VALUES (
      target_user_id,
      'General Dentistry',
      'Experienced dentist providing comprehensive dental care.',
      10,
      5.0
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Dentist role granted to user: %', target_user_id;
  ELSE
    RAISE NOTICE 'User with email karrarmayaly@gmail.com not found. Role will be granted upon signup.';
  END IF;
END $;

-- Create function to auto-grant dentist role to specific email on signup
CREATE OR REPLACE FUNCTION public.grant_dentist_role_to_specific_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  -- Check if the new user has the specified email
  IF NEW.email = 'karrarmayaly@gmail.com' THEN
    -- Grant dentist role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'dentist')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Create dentist profile
    INSERT INTO public.dentists (id, specialization, bio, years_of_experience, rating)
    VALUES (
      NEW.id,
      'General Dentistry',
      'Experienced dentist providing comprehensive dental care.',
      10,
      5.0
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$;

-- Create trigger for auto-granting dentist role
DROP TRIGGER IF EXISTS on_auth_user_grant_dentist_role ON auth.users;
CREATE TRIGGER on_auth_user_grant_dentist_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_dentist_role_to_specific_email();

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_id ON public.appointments(dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointment_documents_appointment_id ON public.appointment_documents(appointment_id);
