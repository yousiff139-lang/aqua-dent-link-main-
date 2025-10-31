-- Add context field to chatbot_conversations for advanced conversation tracking
-- This migration adds a JSONB context field to store conversation state and context

-- Add context field to chatbot_conversations if not exists
ALTER TABLE chatbot_conversations 
ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::jsonb;

-- Create index for context queries for better performance
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_context 
ON chatbot_conversations USING gin(context);

-- Add comment explaining the context field structure
COMMENT ON COLUMN chatbot_conversations.context IS 'Stores conversation context including phone_number_provided, concern_described, dentist_selected, appointment_time_selected, and other tracking fields for intelligent conversation flow';

-- Update existing records to have empty context object
UPDATE chatbot_conversations 
SET context = '{}'::jsonb 
WHERE context IS NULL;

-- Ensure context is not null
ALTER TABLE chatbot_conversations 
ALTER COLUMN context SET NOT NULL;
