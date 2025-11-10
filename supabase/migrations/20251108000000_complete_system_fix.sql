-- ============================================================================
-- COMPLETE SYSTEM FIX - All Missing Tables and Columns
-- This migration creates all missing database structures
-- ============================================================================

-- 1. CREATE TIME_SLOT_RESERVATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.time_slot_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dentist_id UUID NOT NULL REFERENCES public.dentists(id) ON DELETE CASCADE,
    slot_time TIMESTAMPTZ NOT NULL,
    reserved_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reservation_expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for time_slot_reservations
CREATE INDEX IF NOT EXISTS idx_time_slot_reservations_dentist_id ON public.time_slot_reservations(dentist_id);
CREATE INDEX IF NOT EXISTS idx_time_slot_reservations_slot_time ON public.time_slot_reservations(slot_time);
CREATE INDEX IF NOT EXISTS idx_time_slot_reservations_reserved_by ON public.time_slot_reservations(reserved_by);
CREATE INDEX IF NOT EXISTS idx_time_slot_reservations_expires_at ON public.time_slot_reservations(reservation_expires_at);
CREATE INDEX IF NOT EXISTS idx_time_slot_reservations_status ON public.time_slot_reservations(status);

-- Enable RLS for time_slot_reservations
ALTER TABLE public.time_slot_reservations ENABLE ROW LEVEL SECURITY;

-- RLS policies for time_slot_reservations
DROP POLICY IF EXISTS "Users can create reservations" ON public.time_slot_reservations;
CREATE POLICY "Users can create reservations"
  ON public.time_slot_reservations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reserved_by);

DROP POLICY IF EXISTS "Users can view own reservations" ON public.time_slot_reservations;
CREATE POLICY "Users can view own reservations"
  ON public.time_slot_reservations FOR SELECT
  TO authenticated
  USING (auth.uid() = reserved_by);

DROP POLICY IF EXISTS "Dentists can view their reservations" ON public.time_slot_reservations;
CREATE POLICY "Dentists can view their reservations"
  ON public.time_slot_reservations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dentists
      WHERE dentists.id = time_slot_reservations.dentist_id
      AND dentists.id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own reservations" ON public.time_slot_reservations;
CREATE POLICY "Users can update own reservations"
  ON public.time_slot_reservations FOR UPDATE
  TO authenticated
  USING (auth.uid() = reserved_by);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.time_slot_reservations TO authenticated;

-- 2. ADD MISSING COLUMNS TO APPOINTMENTS TABLE
-- ============================================================================

-- Add appointment_time if missing
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments'
        AND column_name = 'appointment_time'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN appointment_time TIME;
        RAISE NOTICE 'Added appointment_time column';
    END IF;
END $;

-- Add documents if missing
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments'
        AND column_name = 'documents'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN documents JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added documents column';
    END IF;
END $;

-- Add cancelled_at if missing
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments'
        AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN cancelled_at TIMESTAMPTZ;
        RAISE NOTICE 'Added cancelled_at column';
    END IF;
END $;

-- Add cancellation_reason if missing
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appointments'
        AND column_name = 'cancellation_reason'
    ) THEN
        ALTER TABLE public.appointments ADD COLUMN cancellation_reason TEXT;
        RAISE NOTICE 'Added cancellation_reason column';
    END IF;
END $;

-- 3. ADD MISSING COLUMNS TO DENTIST_AVAILABILITY TABLE
-- ============================================================================

-- Add slot_duration_minutes if missing
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'dentist_availability'
        AND column_name = 'slot_duration_minutes'
    ) THEN
        ALTER TABLE public.dentist_availability ADD COLUMN slot_duration_minutes INTEGER DEFAULT 30;
        RAISE NOTICE 'Added slot_duration_minutes column';
    END IF;
END $;

-- 4. CREATE CHATBOT_CONVERSATIONS TABLE IF MISSING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    dentist_id UUID REFERENCES public.dentists(id) ON DELETE SET NULL,
    messages JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    booking_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for chatbot_conversations
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_patient_id ON public.chatbot_conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_dentist_id ON public.chatbot_conversations(dentist_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_status ON public.chatbot_conversations(status);

-- Enable RLS for chatbot_conversations
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- RLS policies for chatbot_conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.chatbot_conversations;
CREATE POLICY "Users can view own conversations"
  ON public.chatbot_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can create conversations" ON public.chatbot_conversations;
CREATE POLICY "Users can create conversations"
  ON public.chatbot_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.chatbot_conversations;
CREATE POLICY "Users can update own conversations"
  ON public.chatbot_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.chatbot_conversations TO authenticated;

-- 5. CREATE FUNCTION TO AUTO-EXPIRE RESERVATIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION expire_old_reservations()
RETURNS void AS $
BEGIN
    UPDATE public.time_slot_reservations
    SET status = 'expired'
    WHERE status = 'reserved'
    AND reservation_expires_at < NOW();
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CREATE UPDATED_AT TRIGGER FOR NEW TABLES
-- ============================================================================
DROP TRIGGER IF EXISTS update_time_slot_reservations_updated_at ON public.time_slot_reservations;
CREATE TRIGGER update_time_slot_reservations_updated_at 
    BEFORE UPDATE ON public.time_slot_reservations
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chatbot_conversations_updated_at ON public.chatbot_conversations;
CREATE TRIGGER update_chatbot_conversations_updated_at 
    BEFORE UPDATE ON public.chatbot_conversations
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. VERIFY ALL TABLES AND COLUMNS EXIST
-- ============================================================================
DO $
DECLARE
    appointments_cols integer;
    reservations_exists boolean;
    conversations_exists boolean;
    availability_cols integer;
BEGIN
    -- Check appointments columns
    SELECT COUNT(*) INTO appointments_cols
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments'
    AND column_name IN ('appointment_time', 'documents', 'cancelled_at', 'cancellation_reason');
    
    -- Check time_slot_reservations exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'time_slot_reservations'
    ) INTO reservations_exists;
    
    -- Check chatbot_conversations exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'chatbot_conversations'
    ) INTO conversations_exists;
    
    -- Check dentist_availability columns
    SELECT COUNT(*) INTO availability_cols
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'dentist_availability'
    AND column_name = 'slot_duration_minutes';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ MIGRATION VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Appointments missing columns added: %', appointments_cols;
    RAISE NOTICE 'Time slot reservations table exists: %', reservations_exists;
    RAISE NOTICE 'Chatbot conversations table exists: %', conversations_exists;
    RAISE NOTICE 'Dentist availability columns added: %', availability_cols;
    RAISE NOTICE '========================================';
    
    IF appointments_cols >= 4 AND reservations_exists AND conversations_exists AND availability_cols >= 1 THEN
        RAISE NOTICE '🎉 ALL TABLES AND COLUMNS CREATED SUCCESSFULLY!';
        RAISE NOTICE '✅ TypeScript errors should now be resolved';
        RAISE NOTICE '✅ Booking system should now work';
        RAISE NOTICE '✅ Chatbot system ready';
    ELSE
        RAISE WARNING '⚠️  Some tables or columns may be missing';
    END IF;
END $;

-- 8. FINAL SUCCESS MESSAGE
-- ============================================================================
DO $
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 COMPLETE SYSTEM FIX APPLIED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next Steps:';
    RAISE NOTICE '   1. Restart your development servers';
    RAISE NOTICE '   2. TypeScript errors should be gone';
    RAISE NOTICE '   3. Test the booking flow';
    RAISE NOTICE '   4. Test the chatbot';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $;
