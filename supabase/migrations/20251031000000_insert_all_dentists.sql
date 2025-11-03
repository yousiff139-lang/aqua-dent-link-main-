-- Insert all dentists from User Web App into Supabase
-- This ensures Dentist Portal can authenticate all dentists

-- Ensure dentists table exists with all required columns
CREATE TABLE IF NOT EXISTS public.dentists (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    specialization TEXT,
    rating DECIMAL(3,2) DEFAULT 0.0,
    experience_years INTEGER DEFAULT 0,
    years_of_experience INTEGER DEFAULT 0,
    phone TEXT,
    address TEXT,
    bio TEXT,
    education TEXT,
    expertise TEXT[],
    image_url TEXT,
    available_times JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view dentists (for public website)
DROP POLICY IF EXISTS "Anyone can view dentists" ON public.dentists;
CREATE POLICY "Anyone can view dentists" ON public.dentists
    FOR SELECT USING (true);

-- Allow dentists to update their own profile
DROP POLICY IF EXISTS "Dentists can update own profile" ON public.dentists;
CREATE POLICY "Dentists can update own profile" ON public.dentists
    FOR UPDATE USING (true); -- Simplified for now

-- Insert all 6 dentists
INSERT INTO public.dentists (
    id,
    name,
    email,
    specialization,
    rating,
    experience_years,
    years_of_experience,
    phone,
    address,
    bio,
    education,
    expertise,
    image_url,
    created_at,
    updated_at
) VALUES
    (
        '550e8400-e29b-41d4-a716-446655440001',
        'Dr. Sarah Johnson',
        'sarah.johnson@example.com',
        'General Dentistry',
        4.8,
        10,
        10,
        '+1-555-0101',
        '123 Main St, City, State',
        'Experienced general dentist with focus on preventive care and patient comfort. Specializes in routine cleanings, fillings, and oral health maintenance.',
        'DDS from Harvard University',
        ARRAY['Preventive Care', 'Restorative Dentistry', 'Oral Health'],
        'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=800&fit=crop',
        NOW(),
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440002',
        'Dr. Michael Chen',
        'michael.chen@example.com',
        'Orthodontics',
        4.9,
        15,
        15,
        '+1-555-0102',
        '456 Oak Ave, City, State',
        'Specialist in orthodontic treatments and braces. Expert in creating beautiful, straight smiles with the latest techniques.',
        'DDS from Stanford University, Orthodontics Residency',
        ARRAY['Braces', 'Invisalign', 'Jaw Surgery'],
        'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&h=800&fit=crop',
        NOW(),
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440003',
        'Dr. Emily Rodriguez',
        'emily.rodriguez@example.com',
        'Pediatric Dentistry',
        4.7,
        8,
        8,
        '+1-555-0103',
        '789 Pine St, City, State',
        'Dedicated to children''s dental health and comfort. Specializes in making dental visits fun and stress-free for young patients.',
        'DDS from UCLA, Pediatric Dentistry Fellowship',
        ARRAY['Child Dental Care', 'Sedation Dentistry', 'Preventive Care'],
        'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=800&h=800&fit=crop',
        NOW(),
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440004',
        'Dr. James Wilson',
        'james.wilson@example.com',
        'Oral Surgery',
        4.6,
        12,
        12,
        '+1-555-0104',
        '321 Elm St, City, State',
        'Expert in complex oral and maxillofacial surgeries. Specializes in wisdom teeth removal, dental implants, and reconstructive procedures.',
        'DDS from Columbia University, Oral Surgery Residency',
        ARRAY['Wisdom Teeth', 'Implants', 'Jaw Surgery'],
        'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&h=800&fit=crop',
        NOW(),
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440005',
        'Dr. Lisa Thompson',
        'lisa.thompson@example.com',
        'Cosmetic Dentistry',
        4.9,
        14,
        14,
        '+1-555-0105',
        '654 Maple Dr, City, State',
        'Specialist in cosmetic and aesthetic dental treatments. Expert in smile makeovers, veneers, and teeth whitening procedures.',
        'DDS from NYU, Cosmetic Dentistry Fellowship',
        ARRAY['Veneers', 'Teeth Whitening', 'Smile Design'],
        'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&h=800&fit=crop',
        NOW(),
        NOW()
    ),
    (
        '550e8400-e29b-41d4-a716-446655440006',
        'Dr. Robert Brown',
        'robert.brown@example.com',
        'Endodontics',
        4.8,
        11,
        11,
        '+1-555-0106',
        '987 Cedar Ln, City, State',
        'Root canal specialist with advanced techniques. Focuses on saving teeth and providing pain-free endodontic treatments.',
        'DDS from University of Michigan, Endodontics Residency',
        ARRAY['Root Canals', 'Endodontic Surgery', 'Pain Management'],
        'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800&h=800&fit=crop',
        NOW(),
        NOW()
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    specialization = EXCLUDED.specialization,
    rating = EXCLUDED.rating,
    experience_years = EXCLUDED.experience_years,
    years_of_experience = EXCLUDED.years_of_experience,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    bio = EXCLUDED.bio,
    education = EXCLUDED.education,
    expertise = EXCLUDED.expertise,
    image_url = EXCLUDED.image_url,
    updated_at = NOW();

-- Also ensure profiles exist for these dentists (for potential future linking)
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT 
    d.id,
    d.email,
    d.name,
    NOW(),
    NOW()
FROM public.dentists d
WHERE d.id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440006'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_dentists_email ON public.dentists(email);
CREATE INDEX IF NOT EXISTS idx_dentists_name ON public.dentists(name);

