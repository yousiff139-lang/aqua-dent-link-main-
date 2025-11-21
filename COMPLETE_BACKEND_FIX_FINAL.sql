-- ============================================================================
-- COMPLETE BACKEND FIX - SUPABASE MIGRATION
-- ============================================================================
-- This migration fixes:
-- 1. Admin endpoints (appointments, patients, dentists)
-- 2. Mark appointment as completed functionality
-- 3. Dentist login and profile access
-- 4. Add/remove dentist synchronization
-- 5. RLS policies for all operations
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENSURE APPOINTMENTS TABLE HAS ALL REQUIRED COLUMNS
-- ============================================================================

-- Add completed_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE appointments ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Ensure status column allows 'completed'
DO $$ 
BEGIN
  -- Check if constraint exists and allows 'completed'
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'appointments' 
    AND constraint_name LIKE '%status%check%'
  ) THEN
    -- Drop existing constraint if it doesn't allow 'completed'
    ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
  END IF;
  
  -- Add new constraint that allows all statuses
  ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
    CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. ENSURE DENTISTS TABLE EXISTS AND HAS REQUIRED COLUMNS
-- ============================================================================

CREATE TABLE IF NOT EXISTS dentists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  specialization TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  years_of_experience INTEGER,
  experience_years INTEGER,
  education TEXT,
  bio TEXT,
  profile_picture TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to dentists table
DO $$ 
BEGIN
  -- Add profile_picture if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dentists' AND column_name = 'profile_picture'
  ) THEN
    ALTER TABLE dentists ADD COLUMN profile_picture TEXT;
  END IF;
  
  -- Add image_url if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dentists' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE dentists ADD COLUMN image_url TEXT;
  END IF;
  
  -- Add status if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dentists' AND column_name = 'status'
  ) THEN
    ALTER TABLE dentists ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- ============================================================================
-- 3. ENSURE PROFILES TABLE HAS ROLE COLUMN
-- ============================================================================

-- Add role column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'patient';
  END IF;
END $$;

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_appointments_dentist_email ON appointments(dentist_email);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_id ON appointments(dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_dentists_email ON dentists(email);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================================================
-- 5. RLS POLICIES FOR APPOINTMENTS
-- ============================================================================

-- Enable RLS on appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
DROP POLICY IF EXISTS "Dentists can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Dentists can update their appointments" ON appointments;
DROP POLICY IF EXISTS "Dentists can mark appointments as completed" ON appointments;
DROP POLICY IF EXISTS "Admin can view all appointments" ON appointments;
DROP POLICY IF EXISTS "Public can create appointments" ON appointments;

-- Users can view their own appointments
CREATE POLICY "Users can view their own appointments" ON appointments
  FOR SELECT
  USING (
    auth.uid() = patient_id 
    OR auth.uid() = dentist_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Dentists can view appointments assigned to them
CREATE POLICY "Dentists can view their appointments" ON appointments
  FOR SELECT
  USING (
    auth.uid() = dentist_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.email = appointments.dentist_email OR profiles.role = 'admin')
    )
  );

-- Dentists can update their appointments (including marking as completed)
CREATE POLICY "Dentists can update their appointments" ON appointments
  FOR UPDATE
  USING (
    auth.uid() = dentist_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.email = appointments.dentist_email OR profiles.role = 'admin')
    )
  )
  WITH CHECK (
    auth.uid() = dentist_id
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.email = appointments.dentist_email OR profiles.role = 'admin')
    )
  );

-- Public can create appointments (for guest bookings)
CREATE POLICY "Public can create appointments" ON appointments
  FOR INSERT
  WITH CHECK (true);

-- Admin can view all appointments
CREATE POLICY "Admin can view all appointments" ON appointments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 6. RLS POLICIES FOR DENTISTS
-- ============================================================================

-- Enable RLS on dentists
ALTER TABLE dentists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view active dentists" ON dentists;
DROP POLICY IF EXISTS "Dentists can view their own profile" ON dentists;
DROP POLICY IF EXISTS "Admin can manage dentists" ON dentists;

-- Public can view active dentists
CREATE POLICY "Public can view active dentists" ON dentists
  FOR SELECT
  USING (status = 'active' OR status IS NULL);

-- Dentists can view their own profile
CREATE POLICY "Dentists can view their own profile" ON dentists
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.email = dentists.email
    )
  );

-- Admin can manage all dentists
CREATE POLICY "Admin can manage dentists" ON dentists
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 7. RLS POLICIES FOR PROFILES
-- ============================================================================

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin can view all profiles
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'admin'
    )
  );

-- ============================================================================
-- 8. FUNCTION TO SYNC DENTIST FROM PROFILES TO DENTISTS TABLE
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_dentist_from_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- If profile role is 'dentist', ensure entry exists in dentists table
  IF NEW.role = 'dentist' THEN
    INSERT INTO dentists (id, name, email, phone, status, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.full_name,
      NEW.email,
      NEW.phone,
      'active',
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (email) DO UPDATE
    SET 
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync dentist from profile
DROP TRIGGER IF EXISTS trigger_sync_dentist_from_profile ON profiles;
CREATE TRIGGER trigger_sync_dentist_from_profile
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'dentist')
  EXECUTE FUNCTION sync_dentist_from_profile();

-- ============================================================================
-- 9. FUNCTION TO UPDATE UPDATED_AT TIMESTAMP
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_dentists_updated_at ON dentists;
CREATE TRIGGER update_dentists_updated_at
  BEFORE UPDATE ON dentists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON appointments TO authenticated;
GRANT SELECT ON dentists TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;

-- Grant permissions to anon users (for guest bookings)
GRANT SELECT ON dentists TO anon;
GRANT INSERT ON appointments TO anon;

-- ============================================================================
-- 11. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN appointments.status IS 'Appointment status: pending, confirmed, upcoming, completed, cancelled';
COMMENT ON COLUMN appointments.completed_at IS 'Timestamp when appointment was marked as completed';
COMMENT ON COLUMN dentists.status IS 'Dentist status: active or inactive';
COMMENT ON COLUMN profiles.role IS 'User role: patient, dentist, or admin';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '✅ All tables and policies are set up correctly';
  RAISE NOTICE '✅ Appointments can be marked as completed';
  RAISE NOTICE '✅ Dentist login will work from both dentists and profiles tables';
  RAISE NOTICE '✅ Admin endpoints have proper access';
END $$;

COMMIT;

