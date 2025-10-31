-- Add dentist portal columns to appointments table
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS dentist_notes TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('pending', 'sent', 'paid', 'failed')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS booking_reference TEXT UNIQUE;

-- Create payment_emails tracking table
CREATE TABLE IF NOT EXISTS public.payment_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  patient_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT CHECK (status IN ('sent', 'failed', 'bounced')) DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on payment_emails
ALTER TABLE public.payment_emails ENABLE ROW LEVEL SECURITY;

-- RLS policies for dentist portal
CREATE POLICY "Dentists can view their own bookings"
  ON public.appointments FOR SELECT
  USING (
    dentist_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'dentist'
    )
  );

CREATE POLICY "Dentists can update their own bookings"
  ON public.appointments FOR UPDATE
  USING (
    dentist_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'dentist'
    )
  );

CREATE POLICY "Dentists can view their payment emails"
  ON public.payment_emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = payment_emails.appointment_id
      AND appointments.dentist_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_status ON public.appointments(dentist_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_date ON public.appointments(dentist_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_payment_emails_appointment ON public.payment_emails(appointment_id);

-- Function to generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate booking reference
CREATE OR REPLACE FUNCTION set_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_reference IS NULL THEN
    NEW.booking_reference := generate_booking_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_booking_reference
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_reference();
