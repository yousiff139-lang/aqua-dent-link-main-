-- ============================================================================
-- CRITICAL FIX - APPLY THIS FIRST
-- Fixes: Notifications RLS, Appointment Types, Cancel Function
-- ============================================================================

-- Step 1: Fix Notifications RLS (fixes the "new row violates RLS" error)
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;

CREATE POLICY "notifications_select" 
  ON public.notifications FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert" 
  ON public.notifications FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "notifications_update" 
  ON public.notifications FOR UPDATE 
  USING (auth.uid() = user_id);

-- Step 2: Add appointment type columns
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS appointment_type TEXT,
ADD COLUMN IF NOT EXISTS appointment_reason TEXT,
ADD COLUMN IF NOT EXISTS estimated_price DECIMAL(10,2);

-- Step 3: Create appointment_types table
CREATE TABLE IF NOT EXISTS public.appointment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_name TEXT NOT NULL UNIQUE,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointment_types_select" 
  ON public.appointment_types FOR SELECT 
  USING (true);

-- Step 4: Insert appointment types
INSERT INTO public.appointment_types (type_name, description, base_price, duration_minutes)
VALUES 
  ('General Checkup', 'Routine dental examination and cleaning', 50.00, 30),
  ('Cavity Filling', 'Treatment for dental cavities', 150.00, 45),
  ('Root Canal', 'Endodontic treatment for infected tooth', 500.00, 90),
  ('Tooth Extraction', 'Removal of damaged or problematic tooth', 200.00, 45),
  ('Teeth Whitening', 'Cosmetic teeth whitening procedure', 300.00, 60),
  ('Dental Crown', 'Crown placement for damaged tooth', 800.00, 90),
  ('Braces Consultation', 'Orthodontic consultation for braces', 100.00, 45),
  ('Oral Surgery', 'Surgical dental procedures', 1000.00, 120),
  ('Emergency Visit', 'Urgent dental care', 100.00, 30),
  ('Cleaning', 'Professional teeth cleaning', 75.00, 30)
ON CONFLICT (type_name) DO NOTHING;

-- Step 5: Create cancel appointment function
CREATE OR REPLACE FUNCTION cancel_appointment(
  p_appointment_id UUID,
  p_cancellation_reason TEXT DEFAULT 'Cancelled by user'
)
RETURNS JSONB AS $$
DECLARE
  v_appointment RECORD;
BEGIN
  SELECT * INTO v_appointment
  FROM public.appointments
  WHERE id = p_appointment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Appointment not found');
  END IF;

  IF v_appointment.patient_id != auth.uid() 
     AND v_appointment.dentist_id != auth.uid()
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles 
       WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
     ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  UPDATE public.appointments
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = p_cancellation_reason,
    updated_at = NOW()
  WHERE id = p_appointment_id;

  -- Notify patient with proper message
  IF v_appointment.patient_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_appointment.patient_id,
      'appointment_cancelled',
      'Appointment Cancelled',
      'Your appointment on ' || COALESCE(v_appointment.appointment_date::TEXT, 'scheduled date') || ' has been cancelled. Reason: ' || COALESCE(p_cancellation_reason, 'No reason provided'),
      jsonb_build_object('appointment_id', p_appointment_id, 'reason', p_cancellation_reason)
    );
  END IF;

  -- Notify dentist with proper message
  IF v_appointment.dentist_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_appointment.dentist_id,
      'appointment_cancelled',
      'Appointment Cancelled',
      'Appointment on ' || COALESCE(v_appointment.appointment_date::TEXT, 'scheduled date') || ' has been cancelled. Reason: ' || COALESCE(p_cancellation_reason, 'No reason provided'),
      jsonb_build_object('appointment_id', p_appointment_id, 'reason', p_cancellation_reason)
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Appointment cancelled successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cancel_appointment TO authenticated;

-- Step 6: Fix dentist portal RLS
DROP POLICY IF EXISTS "appointments_dentist_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_dentist_update" ON public.appointments;

CREATE POLICY "appointments_dentist_select" 
  ON public.appointments FOR SELECT 
  USING (
    dentist_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND dentist_id = appointments.dentist_id 
      AND role = 'dentist'
    )
  );

CREATE POLICY "appointments_dentist_update" 
  ON public.appointments FOR UPDATE 
  USING (
    dentist_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND dentist_id = appointments.dentist_id 
      AND role = 'dentist'
    )
  );

-- Step 7: Update notification trigger to prevent null messages
CREATE OR REPLACE FUNCTION notify_new_appointment()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify the dentist directly (using dentist_id)
  IF NEW.dentist_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.dentist_id,
      'appointment_confirmation',
      'New Appointment',
      'New appointment from ' || COALESCE(NEW.patient_name, 'Patient') || ' on ' || 
      COALESCE(NEW.appointment_date::TEXT, 'scheduled date') || ' at ' || 
      COALESCE(NEW.appointment_time, 'scheduled time'),
      jsonb_build_object(
        'appointment_id', NEW.id,
        'patient_name', COALESCE(NEW.patient_name, 'Unknown'),
        'appointment_date', NEW.appointment_date,
        'appointment_time', NEW.appointment_time,
        'appointment_type', NEW.appointment_type,
        'estimated_price', NEW.estimated_price
      )
    );
  END IF;
  
  -- Notify all admins
  INSERT INTO public.notifications (user_id, type, title, message, data)
  SELECT 
    ur.user_id,
    'appointment_confirmation',
    'New Appointment Booked',
    'New appointment with ' || COALESCE(NEW.dentist_name, 'dentist') || ' on ' || 
    COALESCE(NEW.appointment_date::TEXT, 'scheduled date') || ' at ' || 
    COALESCE(NEW.appointment_time, 'scheduled time'),
    jsonb_build_object(
      'appointment_id', NEW.id,
      'dentist_name', COALESCE(NEW.dentist_name, 'Unknown'),
      'patient_name', COALESCE(NEW.patient_name, 'Unknown'),
      'appointment_type', NEW.appointment_type,
      'estimated_price', NEW.estimated_price
    )
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  
  -- Notify the patient (if they have an account)
  IF NEW.patient_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.patient_id,
      'appointment_confirmation',
      'Appointment Confirmed',
      'Your appointment with ' || COALESCE(NEW.dentist_name, 'your dentist') || 
      ' is confirmed for ' || COALESCE(NEW.appointment_date::TEXT, 'scheduled date') || 
      ' at ' || COALESCE(NEW.appointment_time, 'scheduled time') ||
      CASE WHEN NEW.appointment_type IS NOT NULL 
        THEN '. Type: ' || NEW.appointment_type 
        ELSE '' 
      END,
      jsonb_build_object(
        'appointment_id', NEW.id,
        'booking_reference', NEW.booking_reference,
        'appointment_type', NEW.appointment_type,
        'estimated_price', NEW.estimated_price
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS appointment_created_trigger ON public.appointments;
CREATE TRIGGER appointment_created_trigger
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION notify_new_appointment();

-- Verification
SELECT 'Setup complete! All notification messages will have proper values.' as status;
