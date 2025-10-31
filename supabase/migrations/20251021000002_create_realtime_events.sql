-- Create realtime_events table for monitoring and debugging real-time broadcasts
CREATE TABLE IF NOT EXISTS public.realtime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  payload JSONB NOT NULL,
  broadcast_latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add comment to explain the table purpose
COMMENT ON TABLE public.realtime_events IS 'Logs all real-time broadcast events for monitoring and debugging purposes.';

-- Create index on created_at for efficient time-based queries
CREATE INDEX IF NOT EXISTS idx_realtime_events_created_at 
  ON public.realtime_events(created_at DESC);

-- Create index on table_name for filtering by table
CREATE INDEX IF NOT EXISTS idx_realtime_events_table_name 
  ON public.realtime_events(table_name);

-- Create index on event_type for filtering by event type
CREATE INDEX IF NOT EXISTS idx_realtime_events_event_type 
  ON public.realtime_events(event_type);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_realtime_events_table_event_time 
  ON public.realtime_events(table_name, event_type, created_at DESC);

-- Enable RLS on realtime_events (admin-only access)
ALTER TABLE public.realtime_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view realtime events
CREATE POLICY "Admins can view realtime events"
  ON public.realtime_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to log realtime events
CREATE OR REPLACE FUNCTION public.log_realtime_event(
  p_event_type TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_payload JSONB,
  p_latency_ms INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.realtime_events (
    event_type,
    table_name,
    record_id,
    payload,
    broadcast_latency_ms
  ) VALUES (
    p_event_type,
    p_table_name,
    p_record_id,
    p_payload,
    p_latency_ms
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$;

COMMENT ON FUNCTION public.log_realtime_event IS 'Logs a real-time broadcast event for monitoring purposes.';

-- Function to clean up old realtime events (keep last 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_realtime_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.realtime_events
  WHERE created_at < now() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$;

COMMENT ON FUNCTION public.cleanup_old_realtime_events() IS 'Removes realtime events older than 7 days. Returns count of deleted records.';
