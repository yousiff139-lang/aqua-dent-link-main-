-- Phase 2: Database Schema for AI Chatbot Health Information
-- Creates tables for storing health questionnaire data and medical documents

-- Table for storing appointment health information
CREATE TABLE IF NOT EXISTS appointment_health_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES profiles(id) NOT NULL,
  
  -- Health questionnaire data
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  is_pregnant BOOLEAN,
  phone VARCHAR(50) NOT NULL,
  chronic_diseases TEXT,
  medical_history TEXT,
  symptoms TEXT NOT NULL,
  
  -- AI analysis results
  suggested_specialty VARCHAR(100),
  ai_confidence DECIMAL(3, 2),
  ai_explanation TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing medical documents (X-rays, reports, etc.)
CREATE TABLE IF NOT EXISTS medical_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  health_info_id UUID REFERENCES appointment_health_info(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES profiles(id) NOT NULL,
  
  -- File information
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
 file_size_bytes BIGINT,
  
  -- Metadata
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_health_info_appointment ON appointment_health_info(appointment_id);
CREATE INDEX IF NOT EXISTS idx_health_info_patient ON appointment_health_info(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_docs_health_info ON medical_documents(health_info_id);
CREATE INDEX IF NOT EXISTS idx_medical_docs_patient ON medical_documents(patient_id);

-- Add service_id column to appointments table (for service bookings)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS service_id UUID;

-- Create updated_at trigger for appointment_health_info
CREATE OR REPLACE FUNCTION update_health_info_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_health_info_timestamp
BEFORE UPDATE ON appointment_health_info
FOR EACH ROW
EXECUTE FUNCTION update_health_info_timestamp();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE appointment_health_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;

-- Patients can view their own health info
CREATE POLICY "Patients can view their own health info"
ON appointment_health_info
FOR SELECT
USING (auth.uid() = patient_id);

-- Patients can insert their own health info
CREATE POLICY "Patients can insert their own health info"
ON appointment_health_info
FOR INSERT
WITH CHECK (auth.uid() = patient_id);

-- Admins can view all health info
CREATE POLICY "Admins can view all health info"
ON appointment_health_info
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Dentists can view health info for their appointments
CREATE POLICY "Dentists can view health info for their appointments"
ON appointment_health_info
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN profiles p ON p.id = auth.uid()
    WHERE a.id = appointment_health_info.appointment_id
    AND a.dentist_id = auth.uid()
    AND p.role = 'dentist'
  )
);

-- Patients can view their own medical documents
CREATE POLICY "Patients can view their own medical documents"
ON medical_documents
FOR SELECT
USING (auth.uid() = patient_id);

-- Patients can upload their own medical documents
CREATE POLICY "Patients can insert their own medical documents"
ON medical_documents
FOR INSERT
WITH CHECK (auth.uid() = patient_id);

-- Patients can delete their own medical documents
CREATE POLICY "Patients can delete their own medical documents"
ON medical_documents
FOR DELETE
USING (auth.uid() = patient_id);

-- Admins can view all medical documents
CREATE POLICY "Admins can view all medical documents"
ON medical_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Dentists can view medical documents for their patients' appointments
CREATE POLICY "Dentists can view medical documents for their appointments"
ON medical_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM appointment_health_info ahi
    JOIN appointments a ON a.id = ahi.appointment_id
    JOIN profiles p ON p.id = auth.uid()
    WHERE ahi.id = medical_documents.health_info_id
    AND a.dentist_id = auth.uid()
    AND p.role = 'dentist'
  )
);

-- Grant permissions (run as postgres superuser)
GRANT ALL ON appointment_health_info TO authenticated;
GRANT ALL ON medical_documents TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Phase 2 database schema created successfully!';
  RAISE NOTICE 'Tables created: appointment_health_info, medical_documents';
  RAISE NOTICE 'RLS policies enabled for patient privacy';
END $$;
