-- RESTORE DATABASE TO ORIGINAL STATE
-- Run this in Supabase SQL Editor to undo any payment-related changes

-- 1. Restore the original unique slot constraint
DROP INDEX IF EXISTS idx_appointments_unique_slot;

CREATE UNIQUE INDEX idx_appointments_unique_slot 
ON public.appointments (dentist_email, appointment_date, appointment_time) 
WHERE status != 'cancelled';

-- 2. Clean up any appointments with new statuses that don't exist in original
-- Update any 'pending_payment' or 'payment_expired' back to 'upcoming' or delete them
DELETE FROM medical_documents WHERE appointment_id IN (
  SELECT id FROM appointments WHERE status IN ('pending_payment', 'payment_expired')
);
DELETE FROM appointments WHERE status IN ('pending_payment', 'payment_expired');

-- 3. Clean up appointments with 'awaiting' payment_status
UPDATE appointments SET payment_status = 'pending' WHERE payment_status = 'awaiting';

-- Done! Database is restored to original state
SELECT 'Database restored to original state' as message;
