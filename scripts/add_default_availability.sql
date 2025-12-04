-- Add default availability (9 AM - 5 PM, Monday-Friday) for all dentists
-- Run this in your Supabase SQL Editor

INSERT INTO dentist_availability (dentist_id, day_of_week, start_time, end_time, is_available, slot_duration_minutes)
SELECT 
    id as dentist_id,
    day_num as day_of_week,
    '09:00:00' as start_time,
    '17:00:00' as end_time,
    true as is_available,
    30 as slot_duration_minutes
FROM dentists
CROSS JOIN (
    SELECT 1 as day_num  -- Monday
    UNION SELECT 2       -- Tuesday
    UNION SELECT 3       -- Wednesday
    UNION SELECT 4       -- Thursday
    UNION SELECT 5       -- Friday
) days
ON CONFLICT DO NOTHING;

-- Verify the data was inserted
SELECT 
    d.name as dentist_name,
    COUNT(da.id) as availability_count
FROM dentists d
LEFT JOIN dentist_availability da ON d.id = da.dentist_id
GROUP BY d.id, d.name
ORDER BY d.name;
