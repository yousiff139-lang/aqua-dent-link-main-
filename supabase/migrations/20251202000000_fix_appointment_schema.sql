-- Add missing columns to appointments table
-- Using standard SQL for better compatibility

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS chronic_diseases TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS is_pregnant BOOLEAN DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS medications TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS previous_dental_work TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS smoking BOOLEAN DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS symptoms TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS chief_complaint TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- Refresh schema cache
NOTIFY pgrst, 'reload config';
