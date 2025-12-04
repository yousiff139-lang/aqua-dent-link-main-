-- Fix broken dentist avatar images for Dr. David Kim and Dr. Emily Rodriguez
-- Update their image_url to working placeholder images

UPDATE public.dentists 
SET image_url = 'https://ui-avatars.com/api/?name=Emily+Rodriguez&background=8b5cf6&color=fff&size=400'
WHERE name = 'Dr. Emily Rodriguez';

UPDATE public.dentists 
SET image_url = 'https://ui-avatars.com/api/?name=David+Kim&background=3b82f6&color=fff&size=400'
WHERE name = 'Dr. David Kim';

-- Optionally update all dentists to use reliable avatar placeholders
-- Uncomment if you want to update all dentists:

-- UPDATE public.dentists 
-- SET image_url = 'https://ui-avatars.com/api/?name=' || REPLACE(name, ' ', '+') || '&background=random&color=fff&size=400'
-- WHERE image_url IS NULL OR image_url LIKE '%unsplash%';

-- Verify the update
SELECT name, image_url FROM public.dentists ORDER BY name;

DO $$
BEGIN
  RAISE NOTICE '✅ Updated dentist avatar images';
  RAISE NOTICE '✅ Dr. Emily Rodriguez and Dr. David Kim now have working avatars';
  RAISE NOTICE '';
  RAISE NOTICE 'Refresh the pages to see the changes';
END $$;
