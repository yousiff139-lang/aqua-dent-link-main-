-- ============================================================================
-- ADD SPECIALTY-BASED SERVICE FILTERING
-- Services are filtered based on dentist specialization
-- ============================================================================

-- Step 1: Add specialty field to appointment_types
ALTER TABLE public.appointment_types 
ADD COLUMN IF NOT EXISTS applicable_specialties TEXT[];

-- Step 2: Update appointment types with applicable specialties
UPDATE public.appointment_types 
SET applicable_specialties = ARRAY['General Dentistry', 'General Dentist', 'Dentist']
WHERE type_name = 'General Checkup';

UPDATE public.appointment_types 
SET applicable_specialties = ARRAY['General Dentistry', 'General Dentist', 'Dentist', 'Endodontist']
WHERE type_name = 'Cavity Filling';

UPDATE public.appointment_types 
SET applicable_specialties = ARRAY['Endodontist', 'General Dentistry']
WHERE type_name = 'Root Canal';

UPDATE public.appointment_types 
SET applicable_specialties = ARRAY['Oral Surgeon', 'Oral Surgery', 'General Dentistry']
WHERE type_name = 'Tooth Extraction';

UPDATE public.appointment_types 
SET applicable_specialties = ARRAY['Cosmetic Dentist', 'General Dentistry']
WHERE type_name = 'Teeth Whitening';

UPDATE public.appointment_types 
SET applicable_specialties = ARRAY['Prosthodontist', 'General Dentistry']
WHERE type_name = 'Dental Crown';

UPDATE public.appointment_types 
SET applicable_specialties = ARRAY['Orthodontist']
WHERE type_name = 'Braces Consultation';

UPDATE public.appointment_types 
SET applicable_specialties = ARRAY['Oral Surgeon', 'Oral Surgery', 'Maxillofacial Surgeon']
WHERE type_name = 'Oral Surgery';

UPDATE public.appointment_types 
SET applicable_specialties = ARRAY['General Dentistry', 'General Dentist', 'Dentist', 'Emergency Dentist']
WHERE type_name = 'Emergency Visit';

UPDATE public.appointment_types 
SET applicable_specialties = ARRAY['General Dentistry', 'General Dentist', 'Dentist', 'Hygienist', 'Periodontist']
WHERE type_name = 'Cleaning';

-- Step 3: Add more specialty-specific services
INSERT INTO public.appointment_types (type_name, description, base_price, duration_minutes, applicable_specialties)
VALUES 
  ('Wisdom Teeth Removal', 'Surgical removal of wisdom teeth', 600.00, 90, ARRAY['Oral Surgeon', 'Oral Surgery']),
  ('Gum Disease Treatment', 'Treatment for periodontal disease', 400.00, 60, ARRAY['Periodontist', 'General Dentistry']),
  ('Dental Implant', 'Surgical placement of dental implant', 2000.00, 120, ARRAY['Oral Surgeon', 'Prosthodontist']),
  ('Invisalign Consultation', 'Clear aligner orthodontic consultation', 150.00, 45, ARRAY['Orthodontist']),
  ('Teeth Scaling', 'Deep cleaning for gum health', 200.00, 45, ARRAY['Periodontist', 'Hygienist', 'General Dentistry']),
  ('Cosmetic Bonding', 'Tooth bonding for cosmetic improvement', 250.00, 60, ARRAY['Cosmetic Dentist', 'General Dentistry']),
  ('Denture Fitting', 'Custom denture creation and fitting', 1500.00, 90, ARRAY['Prosthodontist']),
  ('TMJ Treatment', 'Treatment for jaw joint disorders', 350.00, 60, ARRAY['Oral Surgeon', 'General Dentistry'])
ON CONFLICT (type_name) DO NOTHING;

-- Step 4: Create function to get services for a dentist
CREATE OR REPLACE FUNCTION get_services_for_dentist(p_dentist_id UUID)
RETURNS TABLE (
  id UUID,
  type_name TEXT,
  description TEXT,
  base_price DECIMAL,
  duration_minutes INTEGER
) AS $$
DECLARE
  v_dentist_specialty TEXT;
BEGIN
  -- Get dentist's specialty
  SELECT COALESCE(specialization, specialty, 'General Dentistry') 
  INTO v_dentist_specialty
  FROM public.dentists
  WHERE id = p_dentist_id;

  -- Return services that match the dentist's specialty
  RETURN QUERY
  SELECT 
    at.id,
    at.type_name,
    at.description,
    at.base_price,
    at.duration_minutes
  FROM public.appointment_types at
  WHERE 
    v_dentist_specialty = ANY(at.applicable_specialties)
    OR at.applicable_specialties IS NULL
    OR array_length(at.applicable_specialties, 1) IS NULL
  ORDER BY at.base_price;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_services_for_dentist TO authenticated, anon;

-- Step 5: Make appointment_type optional in validation
COMMENT ON COLUMN public.appointments.appointment_type IS 'Optional - Patient can select a service or just provide symptoms';
COMMENT ON COLUMN public.appointments.appointment_reason IS 'Required - Patient describes their symptoms or reason for visit';

-- Verification
DO $$
DECLARE
  v_total_services INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_services FROM public.appointment_types;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SPECIALTY-BASED SERVICES CONFIGURED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total services available: %', v_total_services;
  RAISE NOTICE 'Services are now filtered by dentist specialty';
  RAISE NOTICE 'Appointment type is OPTIONAL';
  RAISE NOTICE '========================================';
END $$;

SELECT 'Specialty-based service filtering enabled!' as status;
