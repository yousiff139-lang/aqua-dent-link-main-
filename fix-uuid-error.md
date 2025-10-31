# 🔧 Fix UUID Error - Quick Solution

## Problem
The error "invalid input syntax for type uuid: 'david-kim'" occurs because the system is trying to use a string as a UUID.

## Solution

### Step 1: Run This SQL in Supabase SQL Editor

```sql
-- First, let's check what user you're logged in as
SELECT id, email, user_metadata FROM auth.users WHERE email = 'your-email@example.com';

-- Replace 'your-email@example.com' with your actual email
```

### Step 2: Create Proper User Roles

```sql
-- Get your user ID from the query above, then run this:
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID

INSERT INTO user_roles (user_id, role, dentist_id)
VALUES ('YOUR_USER_ID_HERE', 'admin', NULL)
ON CONFLICT (user_id, role) DO NOTHING;

-- Also create a dentist role
INSERT INTO user_roles (user_id, role, dentist_id)
VALUES ('YOUR_USER_ID_HERE', 'dentist', 'YOUR_USER_ID_HERE')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Step 3: Create Dentist Profile

```sql
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID
-- Replace 'your-email@example.com' with your actual email

INSERT INTO dentists (id, name, email, specialization, rating, experience_years, phone, address, bio, education, expertise)
VALUES (
    'YOUR_USER_ID_HERE',
    'Dr. David Kim',  -- or whatever name you want
    'your-email@example.com',
    'General Dentistry',
    5.0,
    10,
    '+1-555-0123',
    '123 Main St, City, State',
    'Experienced dentist with focus on patient care',
    'DDS from University',
    ARRAY['General Dentistry', 'Preventive Care']
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;
```

### Step 4: Test the Fix

1. **Refresh your web app** (http://localhost:8081)
2. **Go to dentist dashboard** - Should work without UUID errors
3. **Check Available Times** - Should load properly
4. **Check Appointments** - Should not redirect to login

## 🎯 Expected Results

- ✅ **No more UUID errors**
- ✅ **Dentist dashboard loads properly**
- ✅ **Available Times section works**
- ✅ **Appointments section works**
- ✅ **Proper authentication**

## 🔍 If You Still Get Errors

1. **Check the browser console** for any remaining errors
2. **Verify your user ID** in Supabase Auth section
3. **Make sure the SQL ran successfully** in Supabase
4. **Clear browser cache** and try again

The enhanced dentist dashboard should now work perfectly! 🎉
