-- Triggers and functions for booking consistency and auditing

-- 1) Prevent double-booking: ensure no overlapping appointment for same dentist/time
CREATE OR REPLACE FUNCTION public.prevent_double_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.dentist_id = NEW.dentist_id
      AND a.appointment_date = NEW.appointment_date
      AND a.appointment_time = NEW.appointment_time
      AND a.status IN ('pending','confirmed')
      AND a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
  ) THEN
    RAISE EXCEPTION 'Time slot already booked for this dentist';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_double_booking ON public.appointments;
CREATE TRIGGER tr_prevent_double_booking
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.prevent_double_booking();

-- 2) Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_updated_at_dentists ON public.dentists;
CREATE TRIGGER tr_set_updated_at_dentists
BEFORE UPDATE ON public.dentists
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tr_set_updated_at_appointments ON public.appointments;
CREATE TRIGGER tr_set_updated_at_appointments
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Optional audit table for appointment status changes
CREATE TABLE IF NOT EXISTS public.appointment_audit (
  id BIGSERIAL PRIMARY KEY,
  appointment_id UUID NOT NULL,
  dentist_id UUID NOT NULL,
  old_status TEXT,
  new_status TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.audit_appointment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.appointment_audit (appointment_id, dentist_id, old_status, new_status)
    VALUES (OLD.id, OLD.dentist_id, OLD.status::text, NEW.status::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_audit_appointment_status ON public.appointments;
CREATE TRIGGER tr_audit_appointment_status
AFTER UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.audit_appointment_status();







