-- Create Dental Services Table and Insert Sample Data
-- This enables the Services catalog feature in the user web app

-- 1. Create dental_services table
CREATE TABLE IF NOT EXISTS public.dental_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  specialty VARCHAR(100) NOT NULL, -- matches dentists.specialization
  duration_minutes INTEGER NOT NULL, -- e.g., 60
  price_min DECIMAL(10,2) NOT NULL,
  price_max DECIMAL(10,2),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Grant permissions (disable RLS for simplicity)
ALTER TABLE public.dental_services DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.dental_services TO anon, authenticated;

-- 3. Insert sample dental services
INSERT INTO public.dental_services (name, description, specialty, duration_minutes, price_min, price_max, image_url, is_active)
VALUES
  (
    'General Dental Cleanup',
    'Professional teeth cleaning, plaque removal, and comprehensive oral examination. Includes fluoride treatment and personalized oral hygiene recommendations.',
    'General Dentistry',
    60,
    150.00,
    150.00,
    'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop',
    true
  ),
  (
    'Teeth Whitening',
    'Professional teeth whitening treatment using advanced laser technology. Get a brighter smile in just one session with long-lasting results.',
    'Cosmetic Dentistry',
    90,
    400.00,
    600.00,
    'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop',
    true
  ),
  (
    'Orthodontic Consultation & Braces',
    'Initial consultation, digital impressions, and braces fitting. Includes treatment planning and first set of adjustments. Regular follow-ups scheduled separately.',
    'Orthodontics',
    90,
    2500.00,
    3500.00,
    'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=400&h=300&fit=crop',
    true
  ),
  (
    'Root Canal Treatment',
    'Complete root canal therapy including anesthesia, cleaning, shaping, and filling of root canals. Performed by endodontic specialists with modern equipment.',
    'Endodontics',
    90,
    800.00,
    1200.00,
    'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop',
    true
  ),
  (
    'Dental Implant',
    'Single tooth implant including surgical placement, abutment, and crown. Performed by oral surgery specialists with titanium implants.',
    'Oral Surgery',
    120,
    1500.00,
    2500.00,
    'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop',
    true
  ),
  (
    'Periodontal Treatment',
    'Deep cleaning and scaling to treat gum disease. Includes root planing and antimicrobial treatment to restore gum health.',
    'Periodontics',
    90,
    500.00,
    800.00,
    'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop',
    true
  ),
  (
    'Dental Filling',
    'Tooth-colored composite fillings to restore cavities. Quick and painless procedure with natural-looking results.',
    'General Dentistry',
    45,
    200.00,
    350.00,
    'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop',
    true
  ),
  (
    'Crown & Bridge',
    'Custom-made dental crowns or bridges to restore damaged or missing teeth. Includes impressions, temporary placement, and final fitting.',
    'General Dentistry',
    120,
    900.00,
    1500.00,
    'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop',
    true
  );

-- 4. Modify appointments table to track services
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES dental_services(id),
ADD COLUMN IF NOT EXISTS service_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS service_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS service_duration INTEGER;

-- 5. Verify data
SELECT name, specialty, duration_minutes, price_min, price_max FROM public.dental_services ORDER BY price_min;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Created dental_services table';
  RAISE NOTICE '✅ Inserted 8 sample dental services';
  RAISE NOTICE '✅ Added service tracking to appointments table';
  RAISE NOTICE '';
  RAISE NOTICE 'Services ready for booking in user web app!';
END $$;
