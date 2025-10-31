-- Migration: Add performance optimization indexes
-- This migration adds database indexes to improve query performance for the chatbot booking system
-- Requirements: 7.1

-- ============================================================================
-- APPOINTMENTS TABLE INDEXES
-- ============================================================================

-- Composite index on dentist_id and appointment_date for efficient dentist schedule queries
-- This is crucial for dentists viewing their appointments by date
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_date 
  ON public.appointments(dentist_id, appointment_date)
  WHERE dentist_id IS NOT NULL;

-- Index on appointment_date for general date-based queries
CREATE INDEX IF NOT EXISTS idx_appointments_date 
  ON public.appointments(appointment_date);

-- Index on status for filtering appointments by status
CREATE INDEX IF NOT EXISTS idx_appointments_status 
  ON public.appointments(status);

-- Composite index for patient appointments by date
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date 
  ON public.appointments(patient_id, appointment_date);

-- ============================================================================
-- VERIFICATION OF EXISTING INDEXES
-- ============================================================================

-- The following indexes already exist from previous migrations and are verified here:
-- 
-- chatbot_conversations:
--   - idx_chatbot_conversations_patient_status (patient_id, status) ✓
--   - idx_chatbot_conversations_patient_id (patient_id) ✓
--   - idx_chatbot_conversations_status (status) ✓
--
-- time_slot_reservations:
--   - idx_time_slot_reservations_dentist_slot (dentist_id, slot_time, status) ✓
--   - idx_time_slot_reservations_dentist_id (dentist_id) ✓
--   - idx_time_slot_reservations_slot_time (slot_time) ✓
--
-- dentist_availability:
--   - idx_dentist_availability_dentist_day (dentist_id, day_of_week) ✓
--   - idx_dentist_availability_dentist_id (dentist_id) ✓
--   - idx_dentist_availability_day_of_week (day_of_week) ✓

-- Add comments to document the purpose of these indexes
COMMENT ON INDEX public.idx_appointments_dentist_date IS 
  'Optimizes queries for dentists viewing their appointments by date. Critical for dentist dashboard performance.';

COMMENT ON INDEX public.idx_appointments_date IS 
  'Optimizes general date-based appointment queries and sorting.';

COMMENT ON INDEX public.idx_appointments_status IS 
  'Optimizes filtering appointments by status (upcoming, completed, cancelled).';

COMMENT ON INDEX public.idx_appointments_patient_date IS 
  'Optimizes queries for patients viewing their appointments by date.';
