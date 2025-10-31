-- Migration: Create time_slot_reservations table for chatbot booking system
-- This table manages temporary time slot reservations during the booking process
-- Reservations automatically expire after 5 minutes

-- Create time_slot_reservations table
CREATE TABLE IF NOT EXISTS public.time_slot_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slot_time TIMESTAMPTZ NOT NULL,
  reserved_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reservation_expires_at TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('reserved', 'confirmed', 'expired')) DEFAULT 'reserved',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dentist_id, slot_time)
);

-- Add comments to explain the table structure
COMMENT ON TABLE public.time_slot_reservations IS 
  'Manages temporary time slot reservations during booking. Reservations expire after 5 minutes if not confirmed.';

COMMENT ON COLUMN public.time_slot_reservations.status IS 
  'Reservation status: reserved (temporary hold), confirmed (booking completed), expired (time limit exceeded)';

COMMENT ON COLUMN public.time_slot_reservations.reservation_expires_at IS 
  'Timestamp when the reservation expires. Typically set to 5 minutes from creation.';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_time_slot_reservations_dentist_id 
  ON public.time_slot_reservations(dentist_id);

CREATE INDEX IF NOT EXISTS idx_time_slot_reservations_reserved_by 
  ON public.time_slot_reservations(reserved_by);

CREATE INDEX IF NOT EXISTS idx_time_slot_reservations_slot_time 
  ON public.time_slot_reservations(slot_time);

CREATE INDEX IF NOT EXISTS idx_time_slot_reservations_expires_at 
  ON public.time_slot_reservations(reservation_expires_at);

CREATE INDEX IF NOT EXISTS idx_time_slot_reservations_status 
  ON public.time_slot_reservations(status);

CREATE INDEX IF NOT EXISTS idx_time_slot_reservations_dentist_slot 
  ON public.time_slot_reservations(dentist_id, slot_time, status);

-- Enable Row Level Security
ALTER TABLE public.time_slot_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Patients can view their own reservations
CREATE POLICY "Patients can view own reservations"
  ON public.time_slot_reservations FOR SELECT
  TO authenticated
  USING (auth.uid() = reserved_by);

-- RLS Policy: Patients can create reservations
CREATE POLICY "Patients can create reservations"
  ON public.time_slot_reservations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reserved_by);

-- RLS Policy: Patients can update their own reservations
CREATE POLICY "Patients can update own reservations"
  ON public.time_slot_reservations FOR UPDATE
  TO authenticated
  USING (auth.uid() = reserved_by);

-- RLS Policy: Patients can delete their own reservations
CREATE POLICY "Patients can delete own reservations"
  ON public.time_slot_reservations FOR DELETE
  TO authenticated
  USING (auth.uid() = reserved_by);

-- RLS Policy: Dentists can view reservations for their slots
CREATE POLICY "Dentists can view their slot reservations"
  ON public.time_slot_reservations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = dentist_id 
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'dentist'
    )
  );

-- RLS Policy: Admins can view all reservations
CREATE POLICY "Admins can view all reservations"
  ON public.time_slot_reservations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to automatically expire reservations after 5 minutes
CREATE OR REPLACE FUNCTION public.auto_expire_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  -- Update status to 'expired' for reservations past their expiration time
  UPDATE public.time_slot_reservations
  SET status = 'expired'
  WHERE status = 'reserved'
    AND reservation_expires_at < now();
END;
$;

-- Add comment to explain the function
COMMENT ON FUNCTION public.auto_expire_reservations() IS 
  'Automatically marks reservations as expired when they pass their expiration time. Should be called periodically (e.g., every minute via cron job or before checking slot availability).';

-- Function to clean up old expired reservations (optional cleanup)
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  -- Delete expired reservations older than 24 hours
  DELETE FROM public.time_slot_reservations
  WHERE status = 'expired'
    AND reservation_expires_at < now() - INTERVAL '24 hours';
END;
$;

-- Add comment to explain the cleanup function
COMMENT ON FUNCTION public.cleanup_expired_reservations() IS 
  'Removes expired reservations older than 24 hours to keep the table clean. Should be called periodically (e.g., daily via cron job).';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_slot_reservations TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_expire_reservations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_reservations() TO authenticated;

