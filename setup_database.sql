-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Tables (if not exist)

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  email text UNIQUE,
  full_name text,
  phone text,
  role text DEFAULT 'patient' CHECK (role IN ('patient', 'dentist', 'admin')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Dentists
CREATE TABLE IF NOT EXISTS public.dentists (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  specialization text,
  specialty text, -- Keeping for compatibility, but prefer specialization
  rating numeric DEFAULT 0.0,
  reviews integer DEFAULT 0, -- Added missing column based on frontend usage
  years_of_experience integer DEFAULT 0,
  experience_years integer DEFAULT 0, -- Keeping for compatibility
  phone text,
  address text,
  bio text,
  education text,
  expertise text[], -- Changed to text[] for standard array
  image_url text,
  profile_picture text, -- Keeping for compatibility
  available_times jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  role text NOT NULL CHECK (role IN ('patient', 'dentist', 'admin')),
  dentist_id uuid, -- Optional link to dentist table
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES auth.users(id),
  dentist_id uuid REFERENCES public.dentists(id),
  patient_name text NOT NULL,
  patient_email text NOT NULL,
  patient_phone text,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled')),
  type text DEFAULT 'General Checkup',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Profiles: Public read for dentists, Self read/write for others, Admin read all
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Dentists: Public read, Admin write
DROP POLICY IF EXISTS "Dentists are viewable by everyone" ON public.dentists;
CREATE POLICY "Dentists are viewable by everyone" 
ON public.dentists FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins can manage dentists" ON public.dentists;
CREATE POLICY "Admins can manage dentists" 
ON public.dentists FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- User Roles: Read own, Admin read all
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" 
ON public.user_roles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Fix infinite recursion by NOT querying user_roles in user_roles policy for admins?
-- Actually, for user_roles, we can just allow read if user_id = auth.uid().
-- For Admin check, we need a way to identify admin without recursion.
-- We can trust the 'role' claim in JWT if using custom claims, but standard is DB check.
-- To avoid recursion in user_roles policy:
-- The "Admins can manage roles" policy queries `user_roles`. This IS recursive.
-- FIX: Create a security definer function to check admin status or use a separate admin list.
-- OR: Just rely on `profiles.role` for admin check if `profiles` is secure.

-- Alternative Admin Check using Profiles (assuming profiles is safe)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" 
ON public.user_roles FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. Functions

-- Function to handle new user signup (triggers)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'patient')
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'patient')
  ON CONFLICT DO NOTHING;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

