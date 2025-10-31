-- Migration: Create booking and payment system tables
-- This migration adds payment support to appointments and creates payment_transactions table

-- Add payment-related columns to appointments table
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS patient_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS patient_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS dentist_id UUID REFERENCES public.dentists(id),
  ADD COLUMN IF NOT EXISTS dentist_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS appointment_time TIME,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) CHECK (payment_method IN ('stripe', 'cash')),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);

-- Update status column to match new requirements
ALTER TABLE public.appointments 
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments 
  ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'));

-- Update default status
ALTER TABLE public.appointments 
  ALTER COLUMN status SET DEFAULT 'pending';

-- Add unique constraint to prevent double-booking
-- Note: We need to handle the case where appointment_time might be null for existing records
CREATE UNIQUE INDEX IF NOT EXISTS unique_dentist_datetime 
  ON public.appointments(dentist_email, appointment_date, appointment_time)
  WHERE dentist_email IS NOT NULL AND appointment_time IS NOT NULL;

-- Create indexes for optimized queries
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_email_date 
  ON public.appointments(dentist_email, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_email_date 
  ON public.appointments(patient_email, appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_status 
  ON public.appointments(status);

CREATE INDEX IF NOT EXISTS idx_appointments_payment_status 
  ON public.appointments(payment_status);

CREATE INDEX IF NOT EXISTS idx_appointments_stripe_session 
  ON public.appointments(stripe_session_id);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  stripe_session_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  amount INTEGER NOT NULL, -- in cents
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  payment_method VARCHAR(20) NOT NULL,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on payment_transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Create indexes for payment_transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_appointment 
  ON public.payment_transactions(appointment_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_session 
  ON public.payment_transactions(stripe_session_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
  ON public.payment_transactions(status);

-- RLS policies for payment_transactions
-- Patients can view their payment transactions
CREATE POLICY "Patients can view their payment transactions"
  ON public.payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = payment_transactions.appointment_id
      AND appointments.patient_id = auth.uid()
    )
  );

-- Dentists can view payment transactions for their appointments
CREATE POLICY "Dentists can view their payment transactions"
  ON public.payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = payment_transactions.appointment_id
      AND appointments.dentist_id = auth.uid()
      AND public.has_role(auth.uid(), 'dentist')
    )
  );

-- Update RLS policies for appointments to include dentist access by email
-- Dentists can view appointments by their email
CREATE POLICY "Dentists can view appointments by email"
  ON public.appointments FOR SELECT
  USING (
    dentist_email IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = appointments.dentist_email
      AND public.has_role(auth.uid(), 'dentist')
    )
  );

-- Dentists can update their appointments
CREATE POLICY "Dentists can update their appointments"
  ON public.appointments FOR UPDATE
  USING (
    dentist_email IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email = appointments.dentist_email
      AND public.has_role(auth.uid(), 'dentist')
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger for appointments updated_at
DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for payment_transactions updated_at
DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON public.payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to document the schema
COMMENT ON TABLE public.payment_transactions IS 'Stores payment transaction records for appointment bookings';
COMMENT ON COLUMN public.appointments.payment_method IS 'Payment method: stripe for online payment, cash for in-person payment';
COMMENT ON COLUMN public.appointments.payment_status IS 'Payment status: pending, paid, or failed';
COMMENT ON COLUMN public.appointments.stripe_session_id IS 'Stripe Checkout session ID for tracking payments';
COMMENT ON COLUMN public.appointments.stripe_payment_intent_id IS 'Stripe Payment Intent ID for completed payments';
