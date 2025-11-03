# Dentist Portal Sync Instructions

## Issue
The `dentists` table doesn't exist in Supabase, so dentists can't log in to the Dentist Portal.

## Solution

You need to run the migration SQL file to create the table and insert all dentists.

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** in the left sidebar
4. Open the file: `supabase/migrations/20251031000000_insert_all_dentists.sql`
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click **Run** or press `Ctrl+Enter`
8. You should see "Success" message

### Option 2: Via Supabase CLI

If you have Supabase CLI installed:

```bash
supabase migration up
```

Or apply the specific migration:

```bash
supabase db push
```

### Option 3: Manual SQL Execution

Run this SQL directly in Supabase SQL Editor:

```sql
-- Create dentists table if it doesn't exist
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

-- Allow anyone to view dentists
CREATE POLICY "Anyone can view dentists" ON public.dentists
    FOR SELECT USING (true);

-- Allow updates
CREATE POLICY "Dentists can update own profile" ON public.dentists
    FOR UPDATE USING (true);

-- Insert all 6 dentists
INSERT INTO public.dentists (
    id, name, email, specialization, rating, experience_years, years_of_experience,
    phone, address, bio, education, expertise, image_url, created_at, updated_at
) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Dr. Sarah Johnson', 'sarah.johnson@example.com', 'General Dentistry', 4.8, 10, 10, '+1-555-0101', '123 Main St, City, State', 'Experienced general dentist with focus on preventive care.', 'DDS from Harvard University', ARRAY['Preventive Care', 'Restorative Dentistry'], 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=800&fit=crop', NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440002', 'Dr. Michael Chen', 'michael.chen@example.com', 'Orthodontics', 4.9, 15, 15, '+1-555-0102', '456 Oak Ave, City, State', 'Specialist in orthodontic treatments and braces.', 'DDS from Stanford University', ARRAY['Braces', 'Invisalign'], 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&h=800&fit=crop', NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440003', 'Dr. Emily Rodriguez', 'emily.rodriguez@example.com', 'Pediatric Dentistry', 4.7, 8, 8, '+1-555-0103', '789 Pine St, City, State', 'Dedicated to children''s dental health.', 'DDS from UCLA', ARRAY['Child Dental Care', 'Sedation Dentistry'], 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=800&h=800&fit=crop', NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440004', 'Dr. James Wilson', 'james.wilson@example.com', 'Oral Surgery', 4.6, 12, 12, '+1-555-0104', '321 Elm St, City, State', 'Expert in complex oral surgeries.', 'DDS from Columbia University', ARRAY['Wisdom Teeth', 'Implants'], 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&h=800&fit=crop', NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440005', 'Dr. Lisa Thompson', 'lisa.thompson@example.com', 'Cosmetic Dentistry', 4.9, 14, 14, '+1-555-0105', '654 Maple Dr, City, State', 'Specialist in cosmetic treatments.', 'DDS from NYU', ARRAY['Veneers', 'Teeth Whitening'], 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&h=800&fit=crop', NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440006', 'Dr. Robert Brown', 'robert.brown@example.com', 'Endodontics', 4.8, 11, 11, '+1-555-0106', '987 Cedar Ln, City, State', 'Root canal specialist.', 'DDS from University of Michigan', ARRAY['Root Canals', 'Endodontic Surgery'], 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800&h=800&fit=crop', NOW(), NOW())
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
```

## After Running Migration

Once the migration is complete, you can:

1. **Login to Dentist Portal** using any of these emails:
   - `sarah.johnson@example.com`
   - `michael.chen@example.com` ✅ (This is the one you tried)
   - `emily.rodriguez@example.com`
   - `james.wilson@example.com`
   - `lisa.thompson@example.com`
   - `robert.brown@example.com`

2. **Verify Dentists**: After running the SQL, verify by running:
   ```bash
   npm run sync:dentists
   ```
   This should show all 6 dentists successfully synced.

## Automatic Synchronization

Once the dentists are in the database, **both systems automatically sync** because:
- User Web App reads from `dentists` table
- Dentist Portal reads from `dentists` table
- When you edit a profile in Dentist Portal, it updates the `dentists` table
- Changes immediately appear in User Web App (no refresh needed if using real-time)

## Future Dentist Additions

When you add a new dentist in the User Web App:
1. The dentist is inserted into the `dentists` table
2. They can immediately log in to Dentist Portal with their email
3. No manual sync needed!

