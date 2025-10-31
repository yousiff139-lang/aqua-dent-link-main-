-- Create slot_reservations table for temporary holds during booking
CREATE TABLE IF NOT EXISTS public.slot_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID REFERENCES public.dentists(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slot_time TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dentist_id, slot_time)
);

-- Add comment to explain the table purpose
COMMENT ON TABLE public.slot_reservations IS 'Temporary slot reservations during booking process. Expires after 5 minutes.';

-- Create index for efficient cleanup of expired reservations
CREATE INDEX IF NOT EXISTS idx_slot_reservations_expires_at 
  ON public.slot_reservations(expires_at);

-- Create index for dentist lookups
CREATE INDEX IF NOT EXISTS idx_slot_reservations_dentist_id 
  ON public.slot_reservations(dentist_id);

-- Create index for patient lookups
CREATE INDEX IF NOT EXISTS idx_slot_reservations_patient_id 
  ON public.slot_reservations(patient_id);

-- Enable RLS on slot_reservations
ALTER TABLE public.slot_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Patients can view their own reservations
CREATE POLICY "Patients can view own reservations"
  ON public.slot_reservations FOR SELECT
  USING (auth.uid() = patient_id);

-- RLS Policy: Patients can create their own reservations
CREATE POLICY "Patients can create reservations"
  ON public.slot_reservations FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- RLS Policy: Patients can delete their own reservations
CREATE POLICY "Patients can delete own reservations"
  ON public.slot_reservations FOR DELETE
  USING (auth.uid() = patient_id);

-- RLS Policy: Dentists can view reservations for their slots
CREATE POLICY "Dentists can view their slot reservations"
  ON public.slot_reservations FOR SELECT
  USING (
    auth.uid() = dentist_id 
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'dentist'
    )
  );

-- Function to clean up expired slot reservations
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  DELETE FROM public.slot_reservations
  WHERE expires_at < now();
END;
$;

-- Grant execute permission on cleanup function
GRANT EXECUTE ON FUNCTION public.cleanup_expired_reservations() TO authenticated;

COMMENT ON FUNCTION public.cleanup_expired_reservations() IS 'Removes expired slot reservations. Should be called periodically.';
