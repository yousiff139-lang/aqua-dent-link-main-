-- Add unique constraint to prevent double bookings
-- This ensures that a dentist cannot have two appointments at the same date and time
-- We use a unique index on dentist_email, appointment_date, and appointment_time
-- We only enforce this for active appointments (status != 'cancelled')

BEGIN;

-- Create a unique index if it doesn't exist
-- We use a partial index to exclude cancelled appointments
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_slot 
ON public.appointments (dentist_email, appointment_date, appointment_time) 
WHERE status != 'cancelled';

COMMIT;
