-- Insert dentist data directly into dentists table
-- This populates the dentists table with sample data that will appear in admin panel and user web app
-- Run this in Supabase SQL Editor

-- First, let's create some dentist records using generated UUIDs
-- These will NOT have auth accounts, but will appear in the apps

INSERT INTO public.dentists (id, name, email, specialization, phone, years_of_experience, rating, bio, image_url, status)
VALUES
  (gen_random_uuid(), 'Dr. Sarah Wilson', 'sarah.wilson@aquadent.com', 'Orthodontics', '+1 (555) 123-4567', 12, 4.9, 'Dr. Wilson is a board-certified orthodontist with over a decade of experience in creating beautiful smiles. She specializes in Invasalign and traditional braces for both children and adults.', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop', 'active'),
  (gen_random_uuid(), 'Dr. Michael Chen', 'michael.chen@aquadent.com', 'Cosmetic Dentistry', '+1 (555) 234-5678', 15, 4.8, 'Dr. Chen is renowned for his artistic approach to smile makeovers. He combines advanced technology with dental artistry to deliver natural-looking results.', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop', 'active'),
  (gen_random_uuid(), 'Dr. Emily Rodriguez', 'emily.rodriguez@aquadent.com', 'Pediatric Dentistry', '+1 (555) 345-6789', 8, 4.9, 'Dr. Rodriguez creates a fun and safe environment for children. Her gentle approach helps young patients build positive associations with dental care.', 'https://images.unsplash.com/photo-1594824476969-51c44d7eccca?w=400&h=400&fit=crop', 'active'),
  (gen_random_uuid(), 'Dr. James Thompson', 'james.thompson@aquadent.com', 'Oral Surgery', '+1 (555) 456-7890', 20, 5.0, 'Dr. Thompson is a specialist in oral and maxillofacial surgery. He is an expert in complex extractions, dental implants, and reconstructive surgery.', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop', 'active'),
  (gen_random_uuid(), 'Dr. Lisa Patel', 'lisa.patel@aquadent.com', 'Periodontics', '+1 (555) 567-8901', 10, 4.7, 'Dr. Patel focuses on the prevention, diagnosis, and treatment of periodontal disease. She is dedicated to helping patients maintain healthy gums.', 'https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=400&h=400&fit=crop', 'active'),
  (gen_random_uuid(), 'Dr. David Kim', 'david.kim@aquadent.com', 'Endodontics', '+1 (555) 678-9012', 14, 4.8, 'Dr. Kim specializes in root canal therapy. He uses the latest microscopic techniques to save natural teeth and relieve pain efficiently.', 'https://images.unsplash.com/photo-1582750433449-d22b1274be8f?w=400&h=400&fit=crop', 'active')
ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT id, name, email, specialization, status FROM public.dentists;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Inserted 6 dentists into dentists table';
  RAISE NOTICE '✅ These dentists will now appear in:';
  RAISE NOTICE '   - Admin Panel (Doctors section)';
  RAISE NOTICE '   - User Web App (Dentists section)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NOTE: These dentists do NOT have dentist portal logins';
  RAISE NOTICE '⚠️  They are display-only records';
  RAISE NOTICE '⚠️  To give them portal access, use admin panel "Add Doctor"';
END $$;
