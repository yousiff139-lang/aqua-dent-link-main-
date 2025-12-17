-- Fix missing images for Dr. Emily Rodriguez and Dr. David Kim
-- Run this in Supabase SQL Editor

-- Update Dr. Emily Rodriguez's image
UPDATE public.dentists 
SET image_url = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop'
WHERE name LIKE '%Emily%' OR email LIKE '%emily%';

-- Update Dr. David Kim's image  
UPDATE public.dentists
SET image_url = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop'
WHERE name LIKE '%David%' OR email LIKE '%david%';

-- Verify the updates
SELECT name, email, image_url FROM public.dentists WHERE name LIKE '%Emily%' OR name LIKE '%David%';
