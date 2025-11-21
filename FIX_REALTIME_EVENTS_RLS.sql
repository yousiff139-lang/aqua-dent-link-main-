-- ============================================================================
-- FIX REALTIME_EVENTS RLS ERROR
-- The realtime_events table needs a policy to allow system inserts
-- ============================================================================

-- Add policy to allow system to insert realtime events
DROP POLICY IF EXISTS "realtime_events_insert" ON public.realtime_events;
CREATE POLICY "realtime_events_insert" 
  ON public.realtime_events FOR INSERT 
  WITH CHECK (true);

-- Allow anyone to read realtime events (for debugging)
DROP POLICY IF EXISTS "realtime_events_select" ON public.realtime_events;
CREATE POLICY "realtime_events_select" 
  ON public.realtime_events FOR SELECT 
  USING (true);

-- Verification
SELECT 'Realtime events RLS fixed!' as status;
