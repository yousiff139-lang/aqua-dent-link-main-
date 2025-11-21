-- ============================================================================
-- FIX NOTIFICATION MESSAGE NOT NULL ERROR
-- This fixes the "null value in column message violates not-null constraint"
-- ============================================================================

-- Update the notification trigger to ensure messages are never null
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
  
  -- Also notify via user_roles table (backup method for dentists)
  INSERT INTO public.notifications (user_id, type, title, message, data)
  SELECT 
    ur.user_id,
    'appointment_confirmation',
    'New Appointment',
    'New appointment from ' || COALESCE(NEW.patient_name, 'Patient') || ' on ' || 
    COALESCE(NEW.appointment_date::TEXT, 'scheduled date') || ' at ' || 
    COALESCE(NEW.appointment_time, 'scheduled time'),
    jsonb_build_object(
      'appointment_id', NEW.id,
      'patient_name', COALESCE(NEW.patient_name, 'Unknown'),
      'appointment_date', NEW.appointment_date,
      'appointment_time', NEW.appointment_time
    )
  FROM public.user_roles ur
  WHERE ur.dentist_id = NEW.dentist_id AND ur.role = 'dentist';
  
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
SELECT 'Notification trigger updated - messages will never be null!' as status;
