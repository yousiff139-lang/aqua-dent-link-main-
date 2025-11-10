-- Unified Sync Schema for Admin, User, Dentist portals
-- Creates/ensures core tables and relationships used by all apps

-- 1) PROFILES (minimal)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) DENTISTS
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

CREATE INDEX IF NOT EXISTS idx_dentists_email ON public.dentists(email);
CREATE INDEX IF NOT EXISTS idx_dentists_name ON public.dentists(name);

-- 3) DENTIST AVAILABILITY (structured weekly schedule)
CREATE TABLE IF NOT EXISTS public.dentist_availability (
  dentist_id UUID REFERENCES public.dentists(id) ON DELETE CASCADE,
  day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6), -- 0 Mon .. 6 Sun
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (dentist_id, day_of_week)
);

-- 4) APPOINTMENTS
CREATE TYPE IF NOT EXISTS appointment_status AS ENUM (
  'pending','confirmed','completed','cancelled'
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID NOT NULL REFERENCES public.dentists(id) ON DELETE CASCADE,
  patient_name TEXT,
  patient_email TEXT,
  patient_phone TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INT DEFAULT 30,
  status appointment_status DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_dentist_date ON public.appointments(dentist_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- 5) BASIC RLS SCAFFOLD (policies added in separate migration)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentist_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 6) SAFE VIEWS (optional)
-- None required now







