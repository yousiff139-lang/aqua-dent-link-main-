-- Fix realtime_events trigger issue
-- The trigger is trying to insert into a column "payload" that doesn't exist
-- The actual column is "data"

-- Option 1: Fix the trigger function
CREATE OR REPLACE FUNCTION log_realtime_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.realtime_events (table_name, event_type, record_id, data)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(NEW)::jsonb);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Option 2: If you don't need realtime events, drop the triggers
-- Uncomment the following lines if you want to disable the trigger instead:
-- DROP TRIGGER IF EXISTS log_dentists_changes ON public.dentists;
-- DROP FUNCTION IF EXISTS log_realtime_event();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed realtime_events trigger function';
  RAISE NOTICE '✅ Changed payload → data to match schema';
  RAISE NOTICE '';
  RAISE NOTICE 'Now try running INSERT_DENTISTS.sql again';
END $$;
