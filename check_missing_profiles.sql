
-- Check for users in auth.users that do not have a corresponding profile in public.profiles
SELECT 
    au.id, 
    au.email, 
    au.created_at, 
    au.last_sign_in_at
FROM 
    auth.users au
LEFT JOIN 
    public.profiles pp ON au.id = pp.id
WHERE 
    pp.id IS NULL;

-- Check if there is a trigger on auth.users for profile creation
SELECT 
    event_object_schema as table_schema,
    event_object_table as table_name,
    trigger_schema,
    trigger_name,
    event_manipulation as event,
    action_timing as activation,
    action_statement as definition
FROM 
    information_schema.triggers
WHERE 
    event_object_table = 'users' 
    AND event_object_schema = 'auth';
