-- ============================================================================
-- ADD ALL MISSING TABLES - Complete Schema
-- Run this to add all tables required by the system
-- ============================================================================

-- 1. Fix dentist_availability - add missing column
ALTER TABLE public.dentist_availability
  ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER DEFAULT 30;

-- 2. Create time_slot_reservations table (for 5-minute holds)
CREATE TABLE IF NOT EXISTS public.time_slot_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dentist_id UUID NOT NULL REFERENCES public.dentists(id) ON DELETE CASCADE,
    slot_time TIMESTAMPTZ NOT NULL,
    reserved_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reservation_expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_slot_reservations_dentist ON public.time_slot_reservations(dentist_id);
CREATE INDEX IF NOT EXISTS idx_time_slot_reservations_expires ON public.time_slot_reservations(reservation_expires_at);
CREATE INDEX IF NOT EXISTS idx_time_slot_reservations_status ON public.time_slot_reservations(status);

-- 3. Create chatbot_conversations table
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    messages JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    booking_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_patient ON public.chatbot_conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_status ON public.chatbot_conversations(status);

-- 4. Create chatbot_logs table
CREATE TABLE IF NOT EXISTS public.chatbot_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    response TEXT,
    intent TEXT,
    confidence DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_logs_user ON public.chatbot_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_created ON public.chatbot_logs(created_at);

-- 5. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('appointment_confirmation', 'appointment_reminder', 'appointment_cancelled', 'payment_confirmation')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at);

-- 6. Create payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    payment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_appointment ON public.payment_transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_stripe_session ON public.payment_transactions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);

-- 7. Create xray_uploads table
CREATE TABLE IF NOT EXISTS public.xray_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    analysis TEXT,
    analyzed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xray_uploads_user ON public.xray_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_xray_uploads_analyzed ON public.xray_uploads(analyzed);

-- 8. Create realtime_events table (for sync tracking)
CREATE TABLE IF NOT EXISTS public.realtime_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_realtime_events_type ON public.realtime_events(event_type);
CREATE INDEX IF NOT EXISTS idx_realtime_events_table ON public.realtime_events(table_name);
CREATE INDEX IF NOT EXISTS idx_realtime_events_created ON public.realtime_events(created_at);

-- 9. Enable RLS on all new tables
ALTER TABLE public.time_slot_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xray_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_events ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for new tables

-- time_slot_reservations policies
CREATE POLICY "Users can view their reservations" ON public.time_slot_reservations
  FOR SELECT TO authenticated USING (auth.uid() = reserved_by);

CREATE POLICY "Users can create reservations" ON public.time_slot_reservations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reserved_by);

-- chatbot_conversations policies
CREATE POLICY "Users can view their conversations" ON public.chatbot_conversations
  FOR SELECT TO authenticated USING (auth.uid() = patient_id);

CREATE POLICY "Users can create conversations" ON public.chatbot_conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Users can update their conversations" ON public.chatbot_conversations
  FOR UPDATE TO authenticated USING (auth.uid() = patient_id);

-- notifications policies
CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- payment_transactions policies
CREATE POLICY "Users can view their payment transactions" ON public.payment_transactions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = payment_transactions.appointment_id
      AND appointments.patient_id = auth.uid()
    )
  );

-- xray_uploads policies
CREATE POLICY "Users can view their xrays" ON public.xray_uploads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can upload xrays" ON public.xray_uploads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 11. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_slot_reservations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chatbot_conversations TO authenticated;
GRANT SELECT, INSERT ON public.chatbot_logs TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT SELECT, INSERT ON public.xray_uploads TO authenticated;
GRANT SELECT ON public.realtime_events TO authenticated;

-- 12. Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_time_slot_reservations_updated_at ON public.time_slot_reservations;
CREATE TRIGGER update_time_slot_reservations_updated_at
    BEFORE UPDATE ON public.time_slot_reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chatbot_conversations_updated_at ON public.chatbot_conversations;
CREATE TRIGGER update_chatbot_conversations_updated_at
    BEFORE UPDATE ON public.chatbot_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON public.payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at
    BEFORE UPDATE ON public.payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Done!
SELECT 'All missing tables added successfully!' AS status;
