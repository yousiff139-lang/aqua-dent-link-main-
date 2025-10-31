-- Migration: Create chatbot_conversations table for chatbot booking system
-- This table stores the conversation history between patients and the chatbot during booking

-- Create chatbot_conversations table
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dentist_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  messages JSONB DEFAULT '[]'::jsonb NOT NULL,
  status TEXT CHECK (status IN ('active', 'completed', 'abandoned')) DEFAULT 'active',
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments to explain the table structure
COMMENT ON TABLE public.chatbot_conversations IS 
  'Stores conversation history between patients and the chatbot during the booking process';

COMMENT ON COLUMN public.chatbot_conversations.messages IS 
  'JSONB array of message objects with structure: [{role: "patient"|"bot", content: string, timestamp: string, metadata: object}]';

COMMENT ON COLUMN public.chatbot_conversations.status IS 
  'Conversation status: active (in progress), completed (booking confirmed), abandoned (user left without completing)';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_patient_id 
  ON public.chatbot_conversations(patient_id);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_dentist_id 
  ON public.chatbot_conversations(dentist_id) 
  WHERE dentist_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_status 
  ON public.chatbot_conversations(status);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_patient_status 
  ON public.chatbot_conversations(patient_id, status);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_appointment_id 
  ON public.chatbot_conversations(appointment_id) 
  WHERE appointment_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Patients can view their own conversations
CREATE POLICY "Patients can view own conversations"
  ON public.chatbot_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

-- RLS Policy: Patients can create their own conversations
CREATE POLICY "Patients can create own conversations"
  ON public.chatbot_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = patient_id);

-- RLS Policy: Patients can update their own conversations
CREATE POLICY "Patients can update own conversations"
  ON public.chatbot_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id);

-- RLS Policy: Dentists can view conversations for their appointments
CREATE POLICY "Dentists can view their conversations"
  ON public.chatbot_conversations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = dentist_id 
    AND public.has_role(auth.uid(), 'dentist'::public.app_role)
  );

-- RLS Policy: Admins can view all conversations
CREATE POLICY "Admins can view all conversations"
  ON public.chatbot_conversations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_chatbot_conversations_updated_at
  BEFORE UPDATE ON public.chatbot_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.chatbot_conversations TO authenticated;

