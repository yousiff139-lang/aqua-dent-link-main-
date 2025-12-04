-- Fix Dentist Creation and Seed Data

-- 1. Create delete_dentist_profile RPC
CREATE OR REPLACE FUNCTION delete_dentist_profile(p_dentist_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id from dentists table (assuming id is the user_id)
  v_user_id := p_dentist_id;

  -- Delete from dentists (cascade should handle others, but let's be safe)
  DELETE FROM public.dentists WHERE id = v_user_id;
  
  -- Delete from profiles
  DELETE FROM public.profiles WHERE id = v_user_id;
  
  -- Delete from user_roles
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  
  -- Note: We cannot delete from auth.users via RPC easily. 
  -- The backend should handle auth.users deletion using admin API if possible,
  -- or we rely on the fact that deleting the dentist profile removes access.
  -- Ideally, the backend calls supabase.auth.admin.deleteUser(id).

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Seed Original Dentists
-- (Content from insert-6-dentists.sql)
INSERT INTO dentists (id, name, email, specialization, rating, experience_years, phone, address, bio, education, expertise, image_url, status)
VALUES 
    (
        '550e8400-e29b-41d4-a716-446655440001',
        'Dr. Sarah Johnson',
        'sarah.johnson@example.com',
        'General Dentistry',
        4.8,
        10,
        '+1-555-0101',
        '123 Main St, City, State',
        'Experienced general dentist with focus on preventive care and patient comfort. Specializes in routine cleanings, fillings, and oral health maintenance.',
        'DDS from Harvard University',
        ARRAY['Preventive Care', 'Restorative Dentistry', 'Oral Health'],
        'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=800&fit=crop',
        'active'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440002',
        'Dr. Michael Chen',
        'michael.chen@example.com',
        'Orthodontics',
        4.9,
        15,
        '+1-555-0102',
        '456 Oak Ave, City, State',
        'Specialist in orthodontic treatments and braces. Expert in creating beautiful, straight smiles with the latest techniques.',
        'DDS from Stanford University, Orthodontics Residency',
        ARRAY['Braces', 'Invisalign', 'Jaw Surgery'],
        'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&h=800&fit=crop',
        'active'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440003',
        'Dr. Emily Rodriguez',
        'emily.rodriguez@example.com',
        'Pediatric Dentistry',
        4.7,
        8,
        '+1-555-0103',
        '789 Pine St, City, State',
        'Dedicated to children''s dental health and comfort. Specializes in making dental visits fun and stress-free for young patients.',
        'DDS from UCLA, Pediatric Dentistry Fellowship',
        ARRAY['Child Dental Care', 'Sedation Dentistry', 'Preventive Care'],
        'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=800&h=800&fit=crop',
        'active'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440004',
        'Dr. James Wilson',
        'james.wilson@example.com',
        'Oral Surgery',
        4.6,
        12,
        '+1-555-0104',
        '321 Elm St, City, State',
        'Expert in complex oral and maxillofacial surgeries. Specializes in wisdom teeth removal, dental implants, and reconstructive procedures.',
        'DDS from Columbia University, Oral Surgery Residency',
        ARRAY['Wisdom Teeth', 'Implants', 'Jaw Surgery'],
        'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&h=800&fit=crop',
        'active'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440005',
        'Dr. Lisa Thompson',
        'lisa.thompson@example.com',
        'Cosmetic Dentistry',
        4.9,
        14,
        '+1-555-0105',
        '654 Maple Dr, City, State',
        'Specialist in cosmetic and aesthetic dental treatments. Expert in smile makeovers, veneers, and teeth whitening procedures.',
        'DDS from NYU, Cosmetic Dentistry Fellowship',
        ARRAY['Veneers', 'Teeth Whitening', 'Smile Design'],
        'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&h=800&fit=crop',
        'active'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440006',
        'Dr. Robert Brown',
        'robert.brown@example.com',
        'Endodontics',
        4.8,
        11,
        '+1-555-0106',
        '987 Cedar Ln, City, State',
        'Root canal specialist with advanced techniques. Focuses on saving teeth and providing pain-free endodontic treatments.',
        'DDS from University of Michigan, Endodontics Residency',
        ARRAY['Root Canals', 'Endodontic Surgery', 'Pain Management'],
        'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800&h=800&fit=crop',
        'active'
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    specialization = EXCLUDED.specialization,
    rating = EXCLUDED.rating,
    experience_years = EXCLUDED.experience_years,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    bio = EXCLUDED.bio,
    education = EXCLUDED.education,
    expertise = EXCLUDED.expertise,
    image_url = EXCLUDED.image_url,
    status = 'active';

-- 3. Ensure profiles exist for these dentists (so they can login if they had auth users, or just for display)
INSERT INTO profiles (id, full_name, email, role, created_at, updated_at)
SELECT 
    id, 
    name, 
    email, 
    'dentist', 
    NOW(), 
    NOW()
FROM dentists
WHERE id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440006'
)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = 'dentist';

-- 4. Ensure user_roles exist
INSERT INTO user_roles (user_id, role, dentist_id)
SELECT 
    id, 
    'dentist', 
    id
FROM dentists
WHERE id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440006'
)
ON CONFLICT (user_id, role) DO NOTHING;
