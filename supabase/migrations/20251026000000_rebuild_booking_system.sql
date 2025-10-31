-- Complete Booking System Rebuild Migration
-- This migration creates a comprehensive booking system with medical history, payments, and PDF reports

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS appointment_history CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS medical_documents CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;

-- Create appointments table with comprehensive fields
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dentist_id UUID NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'cash')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    
    -- Patient information
    patient_name TEXT NOT NULL,
    patient_email TEXT NOT NULL,
    patient_phone TEXT NOT NULL,
    
    -- Medical information
    chief_complaint TEXT,
    symptoms TEXT,
    medical_history TEXT,
    smoking BOOLEAN DEFAULT FALSE,
    medications TEXT,
    allergies TEXT,
    previous_dental_work TEXT,
    cause_identified BOOLEAN DEFAULT TRUE,
    uncertainty_note TEXT,
    
    -- Notes
    patient_notes TEXT,
    dentist_notes TEXT,
    
    -- Payment information
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    
    -- PDF report
    pdf_report_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create medical_documents table for patient uploads
CREATE TABLE medical_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointment_history table for tracking status changes
CREATE TABLE appointment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    status_from TEXT,
    status_to TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_transactions table for Stripe payments
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    amount INTEGER NOT NULL, -- Amount in cents
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled', 'refunded')),
    stripe_webhook_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_dentist_id ON appointments(dentist_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_payment_status ON appointments(payment_status);
CREATE INDEX idx_medical_documents_appointment_id ON medical_documents(appointment_id);
CREATE INDEX idx_appointment_history_appointment_id ON appointment_history(appointment_id);
CREATE INDEX idx_payment_transactions_appointment_id ON payment_transactions(appointment_id);
CREATE INDEX idx_payment_transactions_stripe_session_id ON payment_transactions(stripe_session_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create appointment history trigger
CREATE OR REPLACE FUNCTION log_appointment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO appointment_history (appointment_id, status_from, status_to, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.patient_id);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_appointment_status_change_trigger
    AFTER UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION log_appointment_status_change();

-- Enable Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointments
-- Patients can view their own appointments
CREATE POLICY "Patients can view own appointments" ON appointments
    FOR SELECT USING (auth.uid() = patient_id);

-- Patients can insert their own appointments
CREATE POLICY "Patients can create own appointments" ON appointments
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- Patients can update their own appointments (limited fields)
CREATE POLICY "Patients can update own appointments" ON appointments
    FOR UPDATE USING (auth.uid() = patient_id)
    WITH CHECK (auth.uid() = patient_id);

-- Dentists can view appointments assigned to them
CREATE POLICY "Dentists can view assigned appointments" ON appointments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'dentist' 
            AND dentist_id = appointments.dentist_id
        )
    );

-- Dentists can update appointments assigned to them
CREATE POLICY "Dentists can update assigned appointments" ON appointments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'dentist' 
            AND dentist_id = appointments.dentist_id
        )
    );

-- Admins can view all appointments
CREATE POLICY "Admins can view all appointments" ON appointments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for medical_documents
CREATE POLICY "Patients can view own medical documents" ON medical_documents
    FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Patients can insert own medical documents" ON medical_documents
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Dentists can view patient medical documents" ON medical_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM appointments a
            JOIN user_roles ur ON ur.dentist_id = a.dentist_id
            WHERE a.id = medical_documents.appointment_id
            AND ur.user_id = auth.uid()
            AND ur.role = 'dentist'
        )
    );

CREATE POLICY "Admins can view all medical documents" ON medical_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for appointment_history
CREATE POLICY "Users can view appointment history for their appointments" ON appointment_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.id = appointment_history.appointment_id
            AND (
                a.patient_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM user_roles ur 
                    WHERE ur.user_id = auth.uid() 
                    AND ur.role = 'dentist' 
                    AND ur.dentist_id = a.dentist_id
                )
                OR EXISTS (
                    SELECT 1 FROM user_roles ur 
                    WHERE ur.user_id = auth.uid() 
                    AND ur.role = 'admin'
                )
            )
        )
    );

-- RLS Policies for payment_transactions
CREATE POLICY "Users can view payment transactions for their appointments" ON payment_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.id = payment_transactions.appointment_id
            AND (
                a.patient_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM user_roles ur 
                    WHERE ur.user_id = auth.uid() 
                    AND ur.role = 'dentist' 
                    AND ur.dentist_id = a.dentist_id
                )
                OR EXISTS (
                    SELECT 1 FROM user_roles ur 
                    WHERE ur.user_id = auth.uid() 
                    AND ur.role = 'admin'
                )
            )
        )
    );

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
    ('medical-documents', 'medical-documents', false),
    ('appointment-pdfs', 'appointment-pdfs', false);

-- Storage policies for medical-documents bucket
CREATE POLICY "Patients can upload medical documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'medical-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Patients can view own medical documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'medical-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Dentists can view patient medical documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'medical-documents' 
        AND EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'dentist'
        )
    );

CREATE POLICY "Admins can view all medical documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'medical-documents' 
        AND EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

-- Storage policies for appointment-pdfs bucket
CREATE POLICY "Users can view appointment PDFs" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'appointment-pdfs' 
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR EXISTS (
                SELECT 1 FROM user_roles ur 
                WHERE ur.user_id = auth.uid() 
                AND (ur.role = 'dentist' OR ur.role = 'admin')
            )
        )
    );

-- Create function to get available time slots for a dentist
CREATE OR REPLACE FUNCTION get_available_time_slots(
    p_dentist_id UUID,
    p_date DATE
)
RETURNS TABLE (
    time_slot TIME,
    is_available BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH time_slots AS (
        SELECT generate_series(
            '09:00'::time,
            '17:00'::time,
            '30 minutes'::interval
        ) AS time_slot
    )
    SELECT 
        ts.time_slot::time,
        NOT EXISTS (
            SELECT 1 FROM appointments a
            WHERE a.dentist_id = p_dentist_id
            AND a.appointment_date = p_date
            AND a.appointment_time = ts.time_slot::time
            AND a.status IN ('pending', 'confirmed')
        ) AS is_available
    FROM time_slots ts
    ORDER BY ts.time_slot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check appointment conflicts
CREATE OR REPLACE FUNCTION check_appointment_conflict(
    p_dentist_id UUID,
    p_date DATE,
    p_time TIME
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM appointments
        WHERE dentist_id = p_dentist_id
        AND appointment_date = p_date
        AND appointment_time = p_time
        AND status IN ('pending', 'confirmed')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample dentist data if not exists
INSERT INTO dentists (id, name, email, specialization, rating, experience_years, phone, address, bio, education, expertise, image_url)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Dr. Sarah Johnson', 'sarah.johnson@example.com', 'General Dentistry', 4.8, 10, '+1-555-0101', '123 Main St, City, State', 'Experienced general dentist with focus on preventive care', 'DDS from Harvard University', 'Preventive Care, Restorative Dentistry', '/dentist-1.jpg'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Dr. Michael Chen', 'michael.chen@example.com', 'Orthodontics', 4.9, 15, '+1-555-0102', '456 Oak Ave, City, State', 'Specialist in orthodontic treatments and braces', 'DDS from Stanford University, Orthodontics Residency', 'Braces, Invisalign, Jaw Surgery', '/dentist-2.jpg'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Dr. Emily Rodriguez', 'emily.rodriguez@example.com', 'Pediatric Dentistry', 4.7, 8, '+1-555-0103', '789 Pine St, City, State', 'Dedicated to children''s dental health and comfort', 'DDS from UCLA, Pediatric Dentistry Fellowship', 'Child Dental Care, Sedation Dentistry', '/dentist-3.jpg'),
    ('550e8400-e29b-41d4-a716-446655440004', 'Dr. James Wilson', 'james.wilson@example.com', 'Oral Surgery', 4.6, 12, '+1-555-0104', '321 Elm St, City, State', 'Expert in complex oral and maxillofacial surgeries', 'DDS from Columbia University, Oral Surgery Residency', 'Wisdom Teeth, Implants, Jaw Surgery', '/dentist-4.jpg'),
    ('550e8400-e29b-41d4-a716-446655440005', 'Dr. Lisa Thompson', 'lisa.thompson@example.com', 'Cosmetic Dentistry', 4.9, 14, '+1-555-0105', '654 Maple Dr, City, State', 'Specialist in cosmetic and aesthetic dental treatments', 'DDS from NYU, Cosmetic Dentistry Fellowship', 'Veneers, Teeth Whitening, Smile Design', '/dentist-5.jpg'),
    ('550e8400-e29b-41d4-a716-446655440006', 'Dr. Robert Brown', 'robert.brown@example.com', 'Endodontics', 4.8, 11, '+1-555-0106', '987 Cedar Ln, City, State', 'Root canal specialist with advanced techniques', 'DDS from University of Michigan, Endodontics Residency', 'Root Canals, Endodontic Surgery, Pain Management', '/dentist-6.jpg')
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
