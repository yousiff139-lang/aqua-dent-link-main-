-- ============================================================================
-- ADD SAMPLE DENTISTS FOR TESTING
-- This migration adds 6 dentists with complete profiles
-- ============================================================================

-- Insert sample dentists
INSERT INTO public.dentists (id, name, email, specialization, rating, experience_years, bio, education, expertise, image_url)
VALUES
  (
    gen_random_uuid(),
    'Dr. Sarah Johnson',
    'sarah.johnson@dentalcare.com',
    'General Dentistry',
    4.9,
    12,
    'Dr. Sarah Johnson is a dedicated general dentist with over 12 years of experience providing comprehensive dental care. She believes in preventive dentistry and patient education, ensuring her patients understand their treatment options and feel comfortable throughout their visit.',
    E'Doctor of Dental Surgery (DDS), University of Michigan, 2013\nBachelor of Science in Biology, University of Michigan, 2009',
    ARRAY['Preventive Care', 'Restorative Dentistry', 'Cosmetic Procedures', 'Root Canal Therapy', 'Dental Implants'],
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop'
  ),
  (
    gen_random_uuid(),
    'Dr. Michael Chen',
    'michael.chen@dentalcare.com',
    'Orthodontics',
    4.8,
    15,
    'Dr. Michael Chen specializes in orthodontics with a focus on creating beautiful, healthy smiles. With 15 years of experience, he has helped thousands of patients achieve their dream smiles using traditional braces, clear aligners, and other advanced orthodontic techniques.',
    E'Doctor of Dental Medicine (DMD), University of California San Francisco, 2010\nOrthodontic Residency, Stanford University, 2013\nBachelor of Science in Biochemistry, UC Berkeley, 2006',
    ARRAY['Invisalign', 'Traditional Braces', 'Retainers', 'Jaw Alignment', 'Early Orthodontic Treatment'],
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop'
  ),
  (
    gen_random_uuid(),
    'Dr. Emily Rodriguez',
    'emily.rodriguez@dentalcare.com',
    'Cosmetic Dentistry',
    5.0,
    10,
    'Dr. Emily Rodriguez is passionate about cosmetic dentistry and helping patients achieve their perfect smile. She combines artistry with advanced dental techniques to deliver stunning, natural-looking results. Her warm personality puts even the most anxious patients at ease.',
    E'Doctor of Dental Surgery (DDS), New York University, 2015\nCosmetic Dentistry Fellowship, UCLA, 2017\nBachelor of Arts in Chemistry, Columbia University, 2011',
    ARRAY['Teeth Whitening', 'Veneers', 'Smile Makeovers', 'Bonding', 'Gum Contouring'],
    'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop'
  ),
  (
    gen_random_uuid(),
    'Dr. James Wilson',
    'james.wilson@dentalcare.com',
    'Endodontics',
    4.7,
    18,
    'Dr. James Wilson is a highly skilled endodontist specializing in root canal therapy and dental pain management. With 18 years of experience, he uses the latest technology and techniques to save teeth and eliminate pain, making procedures as comfortable as possible.',
    E'Doctor of Dental Surgery (DDS), University of Washington, 2007\nEndodontic Residency, University of Washington, 2010\nBachelor of Science in Biology, Washington State University, 2003',
    ARRAY['Root Canal Therapy', 'Endodontic Retreatment', 'Apicoectomy', 'Dental Trauma', 'Pain Management'],
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop'
  ),
  (
    gen_random_uuid(),
    'Dr. Lisa Thompson',
    'lisa.thompson@dentalcare.com',
    'Pediatric Dentistry',
    4.9,
    14,
    'Dr. Lisa Thompson specializes in pediatric dentistry, creating positive dental experiences for children from infancy through adolescence. Her gentle approach and child-friendly office environment help young patients develop healthy dental habits that last a lifetime.',
    E'Doctor of Dental Medicine (DMD), University of North Carolina, 2011\nPediatric Dentistry Residency, Boston Children''s Hospital, 2013\nBachelor of Science in Child Development, UNC Chapel Hill, 2007',
    ARRAY['Preventive Care for Children', 'Fluoride Treatments', 'Dental Sealants', 'Behavior Management', 'Special Needs Dentistry'],
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop'
  ),
  (
    gen_random_uuid(),
    'Dr. David Kim',
    'david.kim@dentalcare.com',
    'Oral Surgery',
    4.8,
    20,
    'Dr. David Kim is a board-certified oral and maxillofacial surgeon with 20 years of experience. He performs complex surgical procedures including wisdom teeth extraction, dental implants, and corrective jaw surgery with precision and care.',
    E'Doctor of Dental Medicine (DMD), Harvard School of Dental Medicine, 2005\nMedical Degree (MD), Harvard Medical School, 2007\nOral Surgery Residency, UCLA Medical Center, 2011\nBachelor of Science in Biology, MIT, 2001',
    ARRAY['Wisdom Teeth Extraction', 'Dental Implant Surgery', 'Bone Grafting', 'TMJ Treatment', 'Corrective Jaw Surgery'],
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop'
  )
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  specialization = EXCLUDED.specialization,
  rating = EXCLUDED.rating,
  experience_years = EXCLUDED.experience_years,
  bio = EXCLUDED.bio,
  education = EXCLUDED.education,
  expertise = EXCLUDED.expertise,
  image_url = EXCLUDED.image_url,
  updated_at = NOW();

-- Add some availability for each dentist (Monday-Friday, 9 AM - 5 PM)
INSERT INTO public.dentist_availability (dentist_id, day_of_week, start_time, end_time, is_available)
SELECT 
  d.id,
  dow,
  '09:00'::time,
  '17:00'::time,
  true
FROM public.dentists d
CROSS JOIN generate_series(1, 5) AS dow  -- Monday (1) to Friday (5)
ON CONFLICT DO NOTHING;

-- Verify insertion
DO $
DECLARE
  dentist_count integer;
BEGIN
  SELECT COUNT(*) INTO dentist_count FROM public.dentists;
  RAISE NOTICE '✅ Sample dentists added. Total dentists in database: %', dentist_count;
END $;
