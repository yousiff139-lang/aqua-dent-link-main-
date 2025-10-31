-- Add available_times column to dentists table
ALTER TABLE public.dentists 
  ADD COLUMN IF NOT EXISTS available_times JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the structure
COMMENT ON COLUMN public.dentists.available_times IS 'Available booking times for each day of the week. Format: {"monday": "09:00-17:00", "tuesday": "09:00-17:00", ...}';
