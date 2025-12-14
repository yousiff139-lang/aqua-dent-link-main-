-- ============================================
-- CHECK ALL DENTISTS & THEIR SPECIALIZATIONS
-- Run this in Supabase SQL Editor to verify
-- all doctors are stored in the database
-- ============================================

-- 1. List ALL dentists with their core info
SELECT 
    id,
    name,
    email,
    specialty,
    specialization,
    rating,
    phone,
    years_of_experience,
    created_at
FROM public.dentists
ORDER BY name;

-- 2. Show dentists grouped by specialization
SELECT 
    COALESCE(specialization, specialty, 'Not Set') as dental_specialty,
    COUNT(*) as dentist_count,
    STRING_AGG(name, ', ') as dentist_names
FROM public.dentists
GROUP BY COALESCE(specialization, specialty, 'Not Set')
ORDER BY dentist_count DESC;

-- 3. Check specifically for Orthodontics/Orthodontist (for Dr. Sarah Wilson)
SELECT 
    id,
    name,
    specialty,
    specialization,
    rating
FROM public.dentists
WHERE 
    LOWER(specialty) LIKE '%ortho%' 
    OR LOWER(specialization) LIKE '%ortho%'
    OR LOWER(name) LIKE '%sarah%'
    OR LOWER(name) LIKE '%wilson%';

-- 4. Check specifically for Oral Surgery (James Thompson)
SELECT 
    id,
    name,
    specialty,
    specialization,
    rating
FROM public.dentists
WHERE 
    LOWER(specialty) LIKE '%oral%' 
    OR LOWER(specialization) LIKE '%oral%'
    OR LOWER(specialty) LIKE '%surgeon%'
    OR LOWER(specialization) LIKE '%surgeon%'
    OR LOWER(name) LIKE '%james%'
    OR LOWER(name) LIKE '%thompson%';

-- 5. Full details of all dentists including availability
SELECT 
    id,
    name,
    email,
    specialty,
    specialization,
    rating,
    bio,
    available_times,
    created_at,
    updated_at
FROM public.dentists
ORDER BY rating DESC;

-- 6. Summary statistics
SELECT 
    COUNT(*) as total_dentists,
    COUNT(DISTINCT COALESCE(specialization, specialty)) as unique_specialties,
    AVG(rating) as average_rating,
    MIN(rating) as lowest_rating,
    MAX(rating) as highest_rating
FROM public.dentists;

-- ============================================
-- Expected specialization values for matching:
-- ============================================
-- The chatbot now looks for these values:
-- - 'Orthodontics' or 'orthodontist' or 'orthodontic'
-- - 'Periodontics' or 'periodontist' or 'periodontal'
-- - 'Endodontics' or 'endodontist' or 'root canal'
-- - 'Oral Surgery' or 'oral surgeon' or 'maxillofacial'
-- - 'Pediatric Dentistry' or 'pediatric'
-- - 'Prosthodontics' or 'prosthodontist' or 'dentures'
-- - 'Cosmetic Dentistry' or 'cosmetic' or 'whitening'
-- - 'Implant Dentistry' or 'implant' or 'implants'
-- - 'Restorative Dentistry' or 'restorative' or 'crowns'
-- - 'General Dentistry' or NULL (default)
-- ============================================
