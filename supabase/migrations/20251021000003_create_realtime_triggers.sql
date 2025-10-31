-- Trigger function for appointment changes
CREATE OR REPLACE FUNCTION public.notify_appointment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_start_time TIMESTAMPTZ;
  v_latency_ms INTEGER;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Broadcast to pg_notify for real-time listeners
  PERFORM pg_notify(
    'appointment_change',
    json_build_object(
      'event', TG_OP,
      'dentist_id', COALESCE(NEW.dentist_id, OLD.dentist_id),
      'patient_id', COALESCE(NEW.patient_id, OLD.patient_id),
      'appointment_id', COALESCE(NEW.id, OLD.id),
      'appointment', CASE 
        WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
        ELSE row_to_json(NEW)
      END,
      'timestamp', EXTRACT(EPOCH FROM now())
    )::text
  );
  
  -- Calculate latency
  v_latency_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER;
  
  -- Log event for monitoring
  PERFORM log_realtime_event(
    TG_OP,
    'appointments',
    COALESCE(NEW.id, OLD.id),
    CASE 
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
      ELSE row_to_json(NEW)::jsonb
    END,
    v_latency_ms
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$;

COMMENT ON FUNCTION public.notify_appointment_change() IS 'Trigger function that broadcasts appointment changes via pg_notify and logs to realtime_events table.';

-- Create trigger on appointments table
DROP TRIGGER IF EXISTS on_appointment_change ON public.appointments;
CREATE TRIGGER on_appointment_change
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_appointment_change();

-- Trigger function for availability changes
CREATE OR REPLACE FUNCTION public.notify_availability_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_start_time TIMESTAMPTZ;
  v_latency_ms INTEGER;
BEGIN
  v_start_time := clock_timestamp();
  
  -- Only trigger if available_times actually changed
  IF (TG_OP = 'UPDATE' AND OLD.available_times IS NOT DISTINCT FROM NEW.available_times) THEN
    RETURN NEW;
  END IF;
  
  -- Broadcast to pg_notify for real-time listeners
  PERFORM pg_notify(
    'availability_change',
    json_build_object(
      'event', TG_OP,
      'dentist_id', NEW.id,
      'availability', NEW.available_times,
      'timestamp', EXTRACT(EPOCH FROM now())
    )::text
  );
  
  -- Calculate latency
  v_latency_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER;
  
  -- Log event for monitoring
  PERFORM log_realtime_event(
    TG_OP,
    'dentists',
    NEW.id,
    json_build_object('available_times', NEW.available_times)::jsonb,
    v_latency_ms
  );
  
  RETURN NEW;
END;
$;

COMMENT ON FUNCTION public.notify_availability_change() IS 'Trigger function that broadcasts dentist availability changes via pg_notify and logs to realtime_events table.';

-- Create trigger on dentists table for availability changes
DROP TRIGGER IF EXISTS on_availability_change ON public.dentists;
CREATE TRIGGER on_availability_change
  AFTER INSERT OR UPDATE OF available_times ON public.dentists
  FOR EACH ROW EXECUTE FUNCTION public.notify_availability_change();

-- Trigger function for slot reservation changes
CREATE OR REPLACE FUNCTION public.notify_slot_reservation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  -- Broadcast to pg_notify for real-time listeners
  PERFORM pg_notify(
    'slot_reservation_change',
    json_build_object(
      'event', TG_OP,
      'dentist_id', COALESCE(NEW.dentist_id, OLD.dentist_id),
      'patient_id', COALESCE(NEW.patient_id, OLD.patient_id),
      'slot_time', COALESCE(NEW.slot_time, OLD.slot_time),
      'reservation', CASE 
        WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
        ELSE row_to_json(NEW)
      END,
      'timestamp', EXTRACT(EPOCH FROM now())
    )::text
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$;

COMMENT ON FUNCTION public.notify_slot_reservation_change() IS 'Trigger function that broadcasts slot reservation changes via pg_notify.';

-- Create trigger on slot_reservations table
DROP TRIGGER IF EXISTS on_slot_reservation_change ON public.slot_reservations;
CREATE TRIGGER on_slot_reservation_change
  AFTER INSERT OR DELETE ON public.slot_reservations
  FOR EACH ROW EXECUTE FUNCTION public.notify_slot_reservation_change();

-- Function to automatically clean up expired reservations (can be called by cron job)
CREATE OR REPLACE FUNCTION public.auto_cleanup_expired_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete expired reservations
  DELETE FROM public.slot_reservations
  WHERE expires_at < now();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Log cleanup if any records were deleted
  IF v_deleted_count > 0 THEN
    RAISE NOTICE 'Cleaned up % expired slot reservations', v_deleted_count;
  END IF;
END;
$;

COMMENT ON FUNCTION public.auto_cleanup_expired_reservations() IS 'Automatically removes expired slot reservations. Should be called periodically via cron job or pg_cron.';
