-- ============================================================================
-- CREATE CHATBOT_LOGS TABLE
-- Stores chatbot conversation logs with intent, symptoms, and suggested dentists
-- ============================================================================

-- Create chatbot_logs table
CREATE TABLE IF NOT EXISTS public.chatbot_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    intent TEXT NOT NULL, -- e.g., 'book_appointment', 'ask_question', 'view_dentists'
    extracted_symptoms TEXT, -- User's described symptoms
    suggested_dentist_id UUID REFERENCES public.dentists(id) ON DELETE SET NULL,
    conversation_state TEXT, -- Current state in conversation flow
    message_count INTEGER DEFAULT 0, -- Number of messages in conversation
    completed BOOLEAN DEFAULT FALSE, -- Whether conversation led to booking
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL, -- If booking completed
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional conversation data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_user_id ON public.chatbot_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_intent ON public.chatbot_logs(intent);
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_suggested_dentist_id ON public.chatbot_logs(suggested_dentist_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_appointment_id ON public.chatbot_logs(appointment_id) WHERE appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_created_at ON public.chatbot_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chatbot_logs_completed ON public.chatbot_logs(completed);

-- Enable RLS
ALTER TABLE public.chatbot_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own chatbot logs
CREATE POLICY "Users can view own chatbot logs"
    ON public.chatbot_logs FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own chatbot logs
CREATE POLICY "Users can insert own chatbot logs"
    ON public.chatbot_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own chatbot logs
CREATE POLICY "Users can update own chatbot logs"
    ON public.chatbot_logs FOR UPDATE
    USING (auth.uid() = user_id);

-- Admins can view all chatbot logs
CREATE POLICY "Admins can view all chatbot logs"
    ON public.chatbot_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Dentists can view logs related to their suggested appointments
CREATE POLICY "Dentists can view related chatbot logs"
    ON public.chatbot_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.dentists
            WHERE dentists.id = chatbot_logs.suggested_dentist_id
            AND dentists.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.chatbot_logs TO authenticated;
GRANT SELECT ON public.chatbot_logs TO anon; -- For guest sessions

-- Add comments
COMMENT ON TABLE public.chatbot_logs IS 'Stores chatbot conversation logs with intent, extracted symptoms, and suggested dentists';
COMMENT ON COLUMN public.chatbot_logs.intent IS 'User intent detected: book_appointment, ask_question, view_dentists, etc.';
COMMENT ON COLUMN public.chatbot_logs.extracted_symptoms IS 'Symptoms extracted from user input during conversation';
COMMENT ON COLUMN public.chatbot_logs.suggested_dentist_id IS 'ID of dentist suggested by chatbot based on symptoms';
COMMENT ON COLUMN public.chatbot_logs.metadata IS 'Additional conversation data: payment_method, selected_time, etc.';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chatbot_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_chatbot_logs_updated_at_trigger ON public.chatbot_logs;
CREATE TRIGGER update_chatbot_logs_updated_at_trigger
    BEFORE UPDATE ON public.chatbot_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_chatbot_logs_updated_at();

