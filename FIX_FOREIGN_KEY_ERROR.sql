-- ============================================================================
-- FIX FOREIGN KEY CONSTRAINT ERROR
-- The issue: Trying to send notifications to dentist_id that doesn't exist in auth.users
-- Solution: Only send notifications if the user_id exists
-- ============================================================================

-- Update the notification trigger to check if user exists before inserting
CREATE OR REPLACE FUNCTION notify_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_time_display TEXT;
  v_date_display TEXT;
  v_dentist_exists BOOLEAN;
  v_patient_exists BOOLEAN;
BEGIN
  -- Format time for display
  v_time_display := COALESCE(NEW.appointment_time::TEXT, 'TBD');
  v_date_display := COALESCE(NEW.appointment_date::TEXT, 'TBD');
  
  -- Check if dentist exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = NEW.dentist_id) INTO v_dentist_exists;
  
  -- Check if patient exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = NEW.patient_id) INTO v_patient_exists;
  
  -- Notify the dentist directly (only if they exist in auth.users)
  IF NEW.dentist_id IS NOT NULL AND v_dentist_exists THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.dentist_id,
      'appointment_confirmation',
      'New Appointment',
      'New appointment from ' || COALESCE(NEW.patient_name, 'Patient') || 
      ' on ' || v_date_display || ' at ' || v_time_display,
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
  
  -- Notify all admins (only those who exist in auth.users)
  INSERT INTO public.notifications (user_id, type, title, message, data)
  SELECT 
    ur.user_id,
    'appointment_confirmation',
    'New Appointment Booked',
    'New appointment with ' || COALESCE(NEW.dentist_name, 'dentist') || 
    ' on ' || v_date_display || ' at ' || v_time_display,
    jsonb_build_object(
      'appointment_id', NEW.id,
      'dentist_name', COALESCE(NEW.dentist_name, 'Unknown'),
      'patient_name', COALESCE(NEW.patient_name, 'Unknown'),
      'appointment_type', NEW.appointment_type,
      'estimated_price', NEW.estimated_price
    )
  FROM public.user_roles ur
  WHERE ur.role = 'admin'
    AND EXISTS(SELECT 1 FROM auth.users WHERE id = ur.user_id);
  
  -- Notify the patient (only if they exist in auth.users)
  IF NEW.patient_id IS NOT NULL AND v_patient_exists THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.patient_id,
      'appointment_confirmation',
      'Appointment Confirmed',
      'Your appointment with ' || COALESCE(NEW.dentist_name, 'your dentist') || 
      ' is confirmed for ' || v_date_display || ' at ' || v_time_display ||
      CASE 
        WHEN NEW.appointment_type IS NOT NULL AND NEW.appointment_type != '' 
        THEN '. Service: ' || NEW.appointment_type 
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

-- Also update cancel function to check user existence
CREATE OR REPLACE FUNCTION cancel_appointment(
  p_appointment_id UUID,
  p_cancellation_reason TEXT DEFAULT 'Cancelled by user'
)
RETURNS JSONB AS $$
DECLARE
  v_appointment RECORD;
  v_date_display TEXT;
  v_time_display TEXT;
  v_dentist_exists BOOLEAN;
  v_patient_exists BOOLEAN;
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

  -- Format date and time for display
  v_date_display := COALESCE(v_appointment.appointment_date::TEXT, 'scheduled date');
  v_time_display := COALESCE(v_appointment.appointment_time::TEXT, 'scheduled time');

  -- Check if users exist
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = v_appointment.dentist_id) INTO v_dentist_exists;
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = v_appointment.patient_id) INTO v_patient_exists;

  UPDATE public.appointments
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_reason = p_cancellation_reason,
    updated_at = NOW()
  WHERE id = p_appointment_id;

  -- Notify patient (only if they exist)
  IF v_appointment.patient_id IS NOT NULL AND v_patient_exists THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_appointment.patient_id,
      'appointment_cancelled',
      'Appointment Cancelled',
      'Your appointment on ' || v_date_display || ' at ' || v_time_display || 
      ' has been cancelled. Reason: ' || COALESCE(p_cancellation_reason, 'No reason provided'),
      jsonb_build_object('appointment_id', p_appointment_id, 'reason', p_cancellation_reason)
    );
  END IF;

  -- Notify dentist (only if they exist)
  IF v_appointment.dentist_id IS NOT NULL AND v_dentist_exists THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_appointment.dentist_id,
      'appointment_cancelled',
      'Appointment Cancelled',
      'Appointment on ' || v_date_display || ' at ' || v_time_display || 
      ' has been cancelled. Reason: ' || COALESCE(p_cancellation_reason, 'No reason provided'),
      jsonb_build_object('appointment_id', p_appointment_id, 'reason', p_cancellation_reason)
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Appointment cancelled successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification
SELECT 'Foreign key constraint error fixed! Notifications only sent to existing users.' as status;
