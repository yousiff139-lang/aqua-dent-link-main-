-- Create appointment_medical_info table to store all medical data separately
-- This ensures reliable PDF generation with all patient information

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
    
    -- Documents (JSONB array of {name, url, type})
    documents JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one medical record per appointment
    UNIQUE(appointment_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointment_medical_info_appointment_id ON public.appointment_medical_info(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_medical_info_patient_id ON public.appointment_medical_info(patient_id);

-- Add RLS policies
ALTER TABLE public.appointment_medical_info ENABLE ROW LEVEL SECURITY;

-- Dentists can view medical info for their appointments
CREATE POLICY "Dentists can view medical info for their appointments"
ON public.appointment_medical_info
FOR SELECT
USING (
    appointment_id IN (
        SELECT id FROM public.appointments 
        WHERE dentist_id = auth.uid()
    )
);

-- Patients can view their own medical info
CREATE POLICY "Patients can view their own medical info"
ON public.appointment_medical_info
FOR SELECT
USING (patient_id = auth.uid());

-- Patients can insert their own medical info
CREATE POLICY "Patients can insert their own medical info"
ON public.appointment_medical_info
FOR INSERT
WITH CHECK (patient_id = auth.uid());

-- Patients can update their own medical info
CREATE POLICY "Patients can update their own medical info"
ON public.appointment_medical_info
FOR UPDATE
USING (patient_id = auth.uid());

-- Refresh schema cache
NOTIFY pgrst, 'reload config';
