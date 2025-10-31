-- Fix Missing Tables and Authentication Issues
-- This migration adds the missing dentist_availability table and fixes authentication

-- Create dentist_availability table
CREATE TABLE IF NOT EXISTS dentist_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dentist_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_dentist_availability_dentist_id ON dentist_availability(dentist_id);
CREATE INDEX IF NOT EXISTS idx_dentist_availability_day ON dentist_availability(day_of_week);

-- Enable RLS for dentist_availability
ALTER TABLE dentist_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dentist_availability
-- Dentists can view and manage their own availability
CREATE POLICY "Dentists can manage own availability" ON dentist_availability
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'dentist' 
            AND dentist_id = dentist_availability.dentist_id
        )
    );

-- Admins can view all availability
CREATE POLICY "Admins can view all availability" ON dentist_availability
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('patient', 'dentist', 'admin')),
    dentist_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Enable RLS for user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Create dentists table if it doesn't exist
CREATE TABLE IF NOT EXISTS dentists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    specialization TEXT,
    rating DECIMAL(3,2) DEFAULT 0.0,
    experience_years INTEGER DEFAULT 0,
    phone TEXT,
    address TEXT,
    bio TEXT,
    education TEXT,
    expertise TEXT[],
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for dentists
ALTER TABLE dentists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dentists
CREATE POLICY "Anyone can view dentists" ON dentists
    FOR SELECT USING (true);

CREATE POLICY "Dentists can update own profile" ON dentists
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'dentist' 
            AND dentist_id = dentists.id
        )
    );

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create chatbot_conversations table if it doesn't exist
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    dentist_id UUID,
    messages JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    appointment_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for chatbot_conversations
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chatbot_conversations
CREATE POLICY "Users can manage own conversations" ON chatbot_conversations
    FOR ALL USING (auth.uid() = patient_id);

CREATE POLICY "Dentists can view patient conversations" ON chatbot_conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'dentist' 
            AND dentist_id = chatbot_conversations.dentist_id
        )
    );

-- Insert sample dentist data if not exists
INSERT INTO dentists (id, name, email, specialization, rating, experience_years, phone, address, bio, education, expertise, image_url)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Dr. Sarah Johnson', 'sarah.johnson@example.com', 'General Dentistry', 4.8, 10, '+1-555-0101', '123 Main St, City, State', 'Experienced general dentist with focus on preventive care', 'DDS from Harvard University', ARRAY['Preventive Care', 'Restorative Dentistry'], '/dentist-1.jpg'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Dr. Michael Chen', 'michael.chen@example.com', 'Orthodontics', 4.9, 15, '+1-555-0102', '456 Oak Ave, City, State', 'Specialist in orthodontic treatments and braces', 'DDS from Stanford University, Orthodontics Residency', ARRAY['Braces', 'Invisalign', 'Jaw Surgery'], '/dentist-2.jpg'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Dr. Emily Rodriguez', 'emily.rodriguez@example.com', 'Pediatric Dentistry', 4.7, 8, '+1-555-0103', '789 Pine St, City, State', 'Dedicated to children''s dental health and comfort', 'DDS from UCLA, Pediatric Dentistry Fellowship', ARRAY['Child Dental Care', 'Sedation Dentistry'], '/dentist-3.jpg'),
    ('550e8400-e29b-41d4-a716-446655440004', 'Dr. James Wilson', 'james.wilson@example.com', 'Oral Surgery', 4.6, 12, '+1-555-0104', '321 Elm St, City, State', 'Expert in complex oral and maxillofacial surgeries', 'DDS from Columbia University, Oral Surgery Residency', ARRAY['Wisdom Teeth', 'Implants', 'Jaw Surgery'], '/dentist-4.jpg'),
    ('550e8400-e29b-41d4-a716-446655440005', 'Dr. Lisa Thompson', 'lisa.thompson@example.com', 'Cosmetic Dentistry', 4.9, 14, '+1-555-0105', '654 Maple Dr, City, State', 'Specialist in cosmetic and aesthetic dental treatments', 'DDS from NYU, Cosmetic Dentistry Fellowship', ARRAY['Veneers', 'Teeth Whitening', 'Smile Design'], '/dentist-5.jpg'),
    ('550e8400-e29b-41d4-a716-446655440006', 'Dr. Robert Brown', 'robert.brown@example.com', 'Endodontics', 4.8, 11, '+1-555-0106', '987 Cedar Ln, City, State', 'Root canal specialist with advanced techniques', 'DDS from University of Michigan, Endodontics Residency', ARRAY['Root Canals', 'Endodontic Surgery', 'Pain Management'], '/dentist-6.jpg')
ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
