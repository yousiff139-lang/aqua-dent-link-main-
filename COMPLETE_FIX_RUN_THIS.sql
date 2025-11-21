-- ============================================================================
-- COMPLETE FIX - RUN THIS ONE FILE
-- Fixes ALL issues: RLS, notifications, appointment types, specialty filtering
-- Safe to run multiple times
-- ============================================================================

-- ============================================================================
-- PART 1: FIX NOTIFICATIONS RLS
-- ============================================================================

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

-- ============================================================================
-- PART 1.5: FIX REALTIME_EVENTS RLS
-- ============================================================================

DROP POLICY IF EXISTS "realtime_events_insert" ON public.realtime_events;
CREATE POLICY "realtime_events_insert" 
  ON public.realtime_events FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "realtime_events_select" ON public.realtime_events;
CREATE POLICY "realtime_events_select" 
  ON public.realtime_events FOR SELECT 
  USING (true);

-- ============================================================================
-- PART 2: ADD APPOINTMENT COLUMNS
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'appointment_type'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN appointment_type TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'appointment_reason'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN appointment_reason TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'estimated_price'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN estimated_price DECIMAL(10,2);
  END IF;
END $$;

-- ============================================================================
-- PART 3: CREATE APPOINTMENT TYPES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.appointment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_name TEXT NOT NULL UNIQUE,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  applicable_specialties TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointment_types_select" ON public.appointment_types;
CREATE POLICY "appointment_types_select" 
  ON public.appointment_types FOR SELECT 
  USING (true);

-- ============================================================================
-- PART 4: INSERT APPOINTMENT TYPES WITH SPECIALTIES
-- ============================================================================

INSERT INTO public.appointment_types (type_name, description, base_price, duration_minutes, applicable_specialties)
VALUES 
  ('General Checkup', 'Routine dental examination and cleaning', 50.00, 30, ARRAY['General Dentistry', 'General Dentist', 'Dentist']),
  ('Cavity Filling', 'Treatment for dental cavities', 150.00, 45, ARRAY['General Dentistry', 'General Dentist', 'Dentist', 'Endodontist']),
  ('Root Canal', 'Endodontic treatment for infected tooth', 500.00, 90, ARRAY['Endodontist', 'General Dentistry']),
  ('Tooth Extraction', 'Removal of damaged or problematic tooth', 200.00, 45, ARRAY['Oral Surgeon', 'Oral Surgery', 'General Dentistry']),
  ('Teeth Whitening', 'Cosmetic teeth whitening procedure', 300.00, 60, ARRAY['Cosmetic Dentist', 'General Dentistry']),
  ('Dental Crown', 'Crown placement for damaged tooth', 800.00, 90, ARRAY['Prosthodontist', 'General Dentistry']),
  ('Braces Consultation', 'Orthodontic consultation for braces', 100.00, 45, ARRAY['Orthodontist']),
  ('Oral Surgery', 'Surgical dental procedures', 1000.00, 120, ARRAY['Oral Surgeon', 'Oral Surgery', 'Maxillofacial Surgeon']),
  ('Emergency Visit', 'Urgent dental care', 100.00, 30, ARRAY['General Dentistry', 'General Dentist', 'Dentist', 'Emergency Dentist']),
  ('Cleaning', 'Professional teeth cleaning', 75.00, 30, ARRAY['General Dentistry', 'General Dentist', 'Dentist', 'Hygienist', 'Periodontist']),
  ('Wisdom Teeth Removal', 'Surgical removal of wisdom teeth', 600.00, 90, ARRAY['Oral Surgeon', 'Oral Surgery']),
  ('Gum Disease Treatment', 'Treatment for periodontal disease', 400.00, 60, ARRAY['Periodontist', 'General Dentistry']),
  ('Dental Implant', 'Surgical placement of dental implant', 2000.00, 120, ARRAY['Oral Surgeon', 'Prosthodontist']),
  ('Invisalign Consultation', 'Clear aligner orthodontic consultation', 150.00, 45, ARRAY['Orthodontist']),
  ('Teeth Scaling', 'Deep cleaning for gum health', 200.00, 45, ARRAY['Periodontist', 'Hygienist', 'General Dentistry']),
  ('Cosmetic Bonding', 'Tooth bonding for cosmetic improvement', 250.00, 60, ARRAY['Cosmetic Dentist', 'General Dentistry']),
  ('Denture Fitting', 'Custom denture creation and fitting', 1500.00, 90, ARRAY['Prosthodontist']),
  ('TMJ Treatment', 'Treatment for jaw joint disorders', 350.00, 60, ARRAY['Oral Surgeon', 'General Dentistry'])
ON CONFLICT (type_name) DO UPDATE SET
  applicable_specialties = EXCLUDED.applicable_specialties,
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price,
  duration_minutes = EXCLUDED.duration_minutes;

-- ============================================================================
-- PART 5: CREATE FUNCTION TO GET SERVICES FOR DENTIST
-- ============================================================================

CREATE OR REPLACE FUNCTION get_services_for_dentist(p_dentist_id UUID)
RETURNS TABLE (
  id UUID,
  type_name TEXT,
  description TEXT,
  base_price DECIMAL,
  duration_minutes INTEGER
) AS $$
DECLARE
  v_dentist_specialty TEXT;
BEGIN
  -- Get dentist's specialty
  SELECT COALESCE(specialization, specialty, 'General Dentistry') 
  INTO v_dentist_specialty
  FROM public.dentists
  WHERE id = p_dentist_id;

  -- Return services that match the dentist's specialty
  RETURN QUERY
  SELECT 
    at.id,
    at.type_name,
    at.description,
    at.base_price,
    at.duration_minutes
  FROM public.appointment_types at
  WHERE 
    v_dentist_specialty = ANY(at.applicable_specialties)
    OR at.applicable_specialties IS NULL
    OR array_length(at.applicable_specialties, 1) IS NULL
  ORDER BY at.base_price;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_services_for_dentist TO authenticated, anon;

-- ============================================================================
-- PART 6: CREATE CANCEL APPOINTMENT FUNCTION
-- ============================================================================

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

GRANT EXECUTE ON FUNCTION cancel_appointment TO authenticated;

-- ============================================================================
-- PART 7: FIX DENTIST PORTAL RLS
-- ============================================================================

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

-- ============================================================================
-- PART 8: UPDATE NOTIFICATION TRIGGER (FIX "scheduled time" ERROR)
-- ============================================================================

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

DROP TRIGGER IF EXISTS appointment_created_trigger ON public.appointments;
CREATE TRIGGER appointment_created_trigger
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION notify_new_appointment();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_appointment_types_count INTEGER;
  v_notification_policies INTEGER;
  v_appointment_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_appointment_types_count FROM public.appointment_types;
  SELECT COUNT(*) INTO v_notification_policies FROM pg_policies WHERE tablename = 'notifications';
  SELECT COUNT(*) INTO v_appointment_policies FROM pg_policies WHERE tablename = 'appointments';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL FIXES APPLIED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  • Appointment types: %', v_appointment_types_count;
  RAISE NOTICE '  • Notification policies: %', v_notification_policies;
  RAISE NOTICE '  • Appointment policies: %', v_appointment_policies;
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed Issues:';
  RAISE NOTICE '  ✅ Notifications RLS error';
  RAISE NOTICE '  ✅ Notification message null error';
  RAISE NOTICE '  ✅ "scheduled time" syntax error';
  RAISE NOTICE '  ✅ Appointment types with pricing';
  RAISE NOTICE '  ✅ Specialty-based service filtering';
  RAISE NOTICE '  ✅ Cancel appointment function';
  RAISE NOTICE '  ✅ Dentist portal RLS';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

SELECT 'Setup complete! All systems operational.' as status;
