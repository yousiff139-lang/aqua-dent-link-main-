-- Fix dentist images with proper Unsplash URLs
-- Run this in Supabase SQL Editor to update existing dentists

-- Update dentist images with working Unsplash URLs
UPDATE dentists SET image_url = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=800&fit=crop'
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

UPDATE dentists SET image_url = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&h=800&fit=crop'
WHERE id = '550e8400-e29b-41d4-a716-446655440002';

UPDATE dentists SET image_url = 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=800&h=800&fit=crop'
WHERE id = '550e8400-e29b-41d4-a716-446655440003';

UPDATE dentists SET image_url = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&h=800&fit=crop'
WHERE id = '550e8400-e29b-41d4-a716-446655440004';

UPDATE dentists SET image_url = 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&h=800&fit=crop'
WHERE id = '550e8400-e29b-41d4-a716-446655440005';

UPDATE dentists SET image_url = 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800&h=800&fit=crop'
WHERE id = '550e8400-e29b-41d4-a716-446655440006';

-- Verify the updates
SELECT id, name, image_url FROM dentists ORDER BY name;
