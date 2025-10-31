-- Migration: Enhance RLS policies for chatbot booking system security
-- This migration adds comprehensive RLS policies and security enhancements

-- ============================================================================
-- CHATBOT_CONVERSATIONS TABLE - Enhanced RLS Policies
-- ============================================================================

-- Drop existing policies to recreate with enhancements
DROP POLICY IF EXISTS "Patients can view own conversations" ON public.chatbot_conversations;
DROP POLICY IF EXISTS "Patients can create own conversations" ON public.chatbot_conversations;
DROP POLICY IF EXISTS "Patients can update own conversations" ON public.chatbot_conversations;
DROP POLICY IF EXISTS "Dentists can view their conversations" ON public.chatbot_conversations;
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.chatbot_conversations;

-- Policy: Patients can view their own conversations
CREATE POLICY "Patients can view own conversations"
  ON public.chatbot_conversations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = patient_id
  );

-- Policy: Patients can create their own conversations
CREATE POLICY "Patients can create own conversations"
  ON public.chatbot_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = patient_id
    AND status IN ('active', 'completed', 'abandoned')
  );

-- Policy: Patients can update their own active conversations
CREATE POLICY "Patients can update own conversations"
  ON public.chatbot_conversations FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = patient_id
    AND status IN ('active', 'completed', 'abandoned')
  )
  WITH CHECK (
    auth.uid() = patient_id
    AND status IN ('active', 'completed', 'abandoned')
  );

-- Policy: Patients can delete their own conversations (only if not completed)
CREATE POLICY "Patients can delete own conversations"
  ON public.chatbot_conversations FOR DELETE
  TO authenticated
  USING (
    auth.uid() = patient_id
    AND status = 'abandoned'
  );

-- Policy: Dentists can view conversations for their appointments
CREATE POLICY "Dentists can view their conversations"
  ON public.chatbot_conversations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = dentist_id 
    AND public.has_role(auth.uid(), 'dentist'::public.app_role)
  );

-- Policy: Admins can view all conversations
CREATE POLICY "Admins can view all conversations"
  ON public.chatbot_conversations FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Policy: Admins can manage all conversations
CREATE POLICY "Admins can manage all conversations"
  ON public.chatbot_conversations FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- ============================================================================
-- TIME_SLOT_RESERVATIONS TABLE - Enhanced RLS Policies
-- ============================================================================

-- Drop existing policies to recreate with enhancements
DROP POLICY IF EXISTS "Patients can view own reservations" ON public.time_slot_reservations;
DROP POLICY IF EXISTS "Patients can create reservations" ON public.time_slot_reservations;
DROP POLICY IF EXISTS "Patients can update own reservations" ON public.time_slot_reservations;
DROP POLICY IF EXISTS "Patients can delete own reservations" ON public.time_slot_reservations;
DROP POLICY IF EXISTS "Dentists can view their slot reservations" ON public.time_slot_reservations;
DROP POLICY IF EXISTS "Admins can view all reservations" ON public.time_slot_reservations;

-- Policy: Patients can view their own reservations
CREATE POLICY "Patients can view own reservations"
  ON public.time_slot_reservations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = reserved_by
  );

-- Policy: Patients can create reservations (with validation)
CREATE POLICY "Patients can create reservations"
  ON public.time_slot_reservations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reserved_by
    AND status = 'reserved'
    AND reservation_expires_at > now()
    AND slot_time > now()
    -- Ensure no duplicate reservation for same slot
    AND NOT EXISTS (
      SELECT 1 FROM public.time_slot_reservations tsr
      WHERE tsr.dentist_id = time_slot_reservations.dentist_id
      AND tsr.slot_time = time_slot_reservations.slot_time
      AND tsr.status IN ('reserved', 'confirmed')
      AND tsr.reservation_expires_at > now()
    )
  );

-- Policy: Patients can update their own reservations (only status changes)
CREATE POLICY "Patients can update own reservations"
  ON public.time_slot_reservations FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = reserved_by
    AND reservation_expires_at > now()
  )
  WITH CHECK (
    auth.uid() = reserved_by
    AND status IN ('reserved', 'confirmed', 'expired')
  );

-- Policy: Patients can delete their own reservations
CREATE POLICY "Patients can delete own reservations"
  ON public.time_slot_reservations FOR DELETE
  TO authenticated
  USING (
    auth.uid() = reserved_by
    AND status = 'reserved'
  );

-- Policy: Dentists can view reservations for their slots
CREATE POLICY "Dentists can view their slot reservations"
  ON public.time_slot_reservations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = dentist_id 
    AND public.has_role(auth.uid(), 'dentist'::public.app_role)
  );

-- Policy: Dentists can update their slot reservations (e.g., mark as expired)
CREATE POLICY "Dentists can update their slot reservations"
  ON public.time_slot_reservations FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = dentist_id 
    AND public.has_role(auth.uid(), 'dentist'::public.app_role)
  )
  WITH CHECK (
    auth.uid() = dentist_id 
    AND public.has_role(auth.uid(), 'dentist'::public.app_role)
  );

-- Policy: Admins can view all reservations
CREATE POLICY "Admins can view all reservations"
  ON public.time_slot_reservations FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Policy: Admins can manage all reservations
CREATE POLICY "Admins can manage all reservations"
  ON public.time_slot_reservations FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- ============================================================================
-- DENTIST_AVAILABILITY TABLE - Enhanced RLS Policies
-- ============================================================================

-- Drop existing policies to recreate with enhancements
DROP POLICY IF EXISTS "Authenticated users can view availability" ON public.dentist_availability;
DROP POLICY IF EXISTS "Public can view availability" ON public.dentist_availability;
DROP POLICY IF EXISTS "Dentists can insert own availability" ON public.dentist_availability;
DROP POLICY IF EXISTS "Dentists can update own availability" ON public.dentist_availability;
DROP POLICY IF EXISTS "Dentists can delete own availability" ON public.dentist_availability;
DROP POLICY IF EXISTS "Admins can manage all availability" ON public.dentist_availability;

-- Policy: Anyone (authenticated users) can view active dentist availability
CREATE POLICY "Authenticated users can view availability"
  ON public.dentist_availability FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Public (unauthenticated) users can view active dentist availability
CREATE POLICY "Public can view active availability"
  ON public.dentist_availability FOR SELECT
  TO anon
  USING (is_available = true);

-- Policy: Dentists can insert their own availability (with validation)
CREATE POLICY "Dentists can insert own availability"
  ON public.dentist_availability FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = dentist_id 
    AND public.has_role(auth.uid(), 'dentist'::app_role)
    AND day_of_week BETWEEN 0 AND 6
    AND slot_duration_minutes > 0
    AND start_time < end_time
  );

-- Policy: Dentists can update their own availability
CREATE POLICY "Dentists can update own availability"
  ON public.dentist_availability FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = dentist_id 
    AND public.has_role(auth.uid(), 'dentist'::app_role)
  )
  WITH CHECK (
    auth.uid() = dentist_id 
    AND public.has_role(auth.uid(), 'dentist'::app_role)
    AND day_of_week BETWEEN 0 AND 6
    AND slot_duration_minutes > 0
    AND start_time < end_time
  );

-- Policy: Dentists can delete their own availability
CREATE POLICY "Dentists can delete own availability"
  ON public.dentist_availability FOR DELETE
  TO authenticated
  USING (
    auth.uid() = dentist_id 
    AND public.has_role(auth.uid(), 'dentist'::app_role)
  );

-- Policy: Admins can manage all availability
CREATE POLICY "Admins can manage all availability"
  ON public.dentist_availability FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================================
-- ADDITIONAL SECURITY FUNCTIONS
-- ============================================================================

-- Function to validate reservation expiration time (5 minutes)
CREATE OR REPLACE FUNCTION public.validate_reservation_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  -- Ensure reservation expires in exactly 5 minutes
  IF NEW.status = 'reserved' AND NEW.reservation_expires_at IS NOT NULL THEN
    IF NEW.reservation_expires_at > now() + INTERVAL '6 minutes' THEN
      RAISE EXCEPTION 'Reservation expiration time cannot exceed 5 minutes';
    END IF;
    
    IF NEW.reservation_expires_at <= now() THEN
      RAISE EXCEPTION 'Reservation expiration time must be in the future';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$;

-- Create trigger for reservation expiration validation
DROP TRIGGER IF EXISTS validate_reservation_expiration_trigger ON public.time_slot_reservations;
CREATE TRIGGER validate_reservation_expiration_trigger
  BEFORE INSERT OR UPDATE ON public.time_slot_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_reservation_expiration();

-- Function to prevent overlapping availability slots
CREATE OR REPLACE FUNCTION public.prevent_overlapping_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  -- Check for overlapping time slots for the same dentist on the same day
  IF EXISTS (
    SELECT 1 FROM public.dentist_availability
    WHERE dentist_id = NEW.dentist_id
    AND day_of_week = NEW.day_of_week
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (NEW.start_time >= start_time AND NEW.start_time < end_time)
      OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
      OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
    )
  ) THEN
    RAISE EXCEPTION 'Availability slot overlaps with existing slot for this day';
  END IF;
  
  RETURN NEW;
END;
$;

-- Create trigger for overlapping availability prevention
DROP TRIGGER IF EXISTS prevent_overlapping_availability_trigger ON public.dentist_availability;
CREATE TRIGGER prevent_overlapping_availability_trigger
  BEFORE INSERT OR UPDATE ON public.dentist_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_overlapping_availability();

-- ============================================================================
-- AUDIT LOGGING
-- ============================================================================

-- Create audit log table for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.security_audit_log FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Create index on audit log for efficient queries
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_table_name ON public.security_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at);

-- Function to log sensitive operations
CREATE OR REPLACE FUNCTION public.log_sensitive_operation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$;

-- Create audit triggers for sensitive tables
DROP TRIGGER IF EXISTS audit_chatbot_conversations_trigger ON public.chatbot_conversations;
CREATE TRIGGER audit_chatbot_conversations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.chatbot_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_sensitive_operation();

DROP TRIGGER IF EXISTS audit_time_slot_reservations_trigger ON public.time_slot_reservations;
CREATE TRIGGER audit_time_slot_reservations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.time_slot_reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_sensitive_operation();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatbot_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_slot_reservations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dentist_availability TO authenticated;
GRANT SELECT ON public.dentist_availability TO anon;
GRANT SELECT ON public.security_audit_log TO authenticated;

-- Grant execute permissions on security functions
GRANT EXECUTE ON FUNCTION public.validate_reservation_expiration() TO authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_overlapping_availability() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_sensitive_operation() TO authenticated;

-- Add comments
COMMENT ON TABLE public.security_audit_log IS 
  'Audit log for sensitive operations on chatbot booking system tables. Only accessible by admins.';

COMMENT ON FUNCTION public.validate_reservation_expiration() IS 
  'Validates that time slot reservations expire within the allowed 5-minute window.';

COMMENT ON FUNCTION public.prevent_overlapping_availability() IS 
  'Prevents dentists from creating overlapping availability slots on the same day.';

COMMENT ON FUNCTION public.log_sensitive_operation() IS 
  'Logs all INSERT, UPDATE, and DELETE operations on sensitive tables for audit purposes.';
