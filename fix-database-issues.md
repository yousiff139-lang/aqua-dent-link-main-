# 🔧 Fix Database Issues - Quick Guide

## Problem
- `dentist_availability` table doesn't exist
- Authentication redirect issues in dentist dashboard

## Solution

### Step 1: Run the Database Migration

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Copy and paste the following SQL** (from the migration file):

```sql
-- Create dentist_availability table
CREATE TABLE IF NOT EXISTS dentist_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dentist_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('patient', 'dentist', 'admin')),
    dentist_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Create dentists table if it doesn't exist
CREATE TABLE IF NOT EXISTS dentists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    specialization TEXT,
    rating DECIMAL(3,2) DEFAULT 0.0,
    experience_years INTEGER DEFAULT 0,
    phone TEXT,
    address TEXT,
    bio TEXT,
    education TEXT,
    expertise TEXT[],
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and create policies
ALTER TABLE dentist_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dentists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dentist_availability
CREATE POLICY "Dentists can manage own availability" ON dentist_availability
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'dentist' 
            AND dentist_id = dentist_availability.dentist_id
        )
    );

CREATE POLICY "Admins can view all availability" ON dentist_availability
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- RLS Policies for dentists
CREATE POLICY "Anyone can view dentists" ON dentists
    FOR SELECT USING (true);

CREATE POLICY "Dentists can update own profile" ON dentists
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'dentist' 
            AND dentist_id = dentists.id
        )
    );
```

### Step 2: Add Sample Data

```sql
-- Insert sample dentist data
INSERT INTO dentists (id, name, email, specialization, rating, experience_years, phone, address, bio, education, expertise, image_url)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Dr. Sarah Johnson', 'sarah.johnson@example.com', 'General Dentistry', 4.8, 10, '+1-555-0101', '123 Main St, City, State', 'Experienced general dentist with focus on preventive care', 'DDS from Harvard University', ARRAY['Preventive Care', 'Restorative Dentistry'], '/dentist-1.jpg'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Dr. Michael Chen', 'michael.chen@example.com', 'Orthodontics', 4.9, 15, '+1-555-0102', '456 Oak Ave, City, State', 'Specialist in orthodontic treatments and braces', 'DDS from Stanford University, Orthodontics Residency', ARRAY['Braces', 'Invisalign', 'Jaw Surgery'], '/dentist-2.jpg')
ON CONFLICT (id) DO NOTHING;
```

### Step 3: Grant User Roles

```sql
-- Grant dentist role to a user (replace with actual user ID)
-- You can find user IDs in the Supabase Auth section
INSERT INTO user_roles (user_id, role, dentist_id)
VALUES 
    ('YOUR_USER_ID_HERE', 'dentist', '550e8400-e29b-41d4-a716-446655440001'),
    ('YOUR_ADMIN_USER_ID_HERE', 'admin', NULL)
ON CONFLICT (user_id, role) DO NOTHING;
```

## ✅ After Running the Migration

1. **Refresh your web app** (http://localhost:8081)
2. **Test the dentist dashboard** - The "Available Times" section should work
3. **Test the appointments section** - Should no longer redirect to login

## 🎯 Expected Results

- ✅ `dentist_availability` table error should be gone
- ✅ Dentist dashboard should load properly
- ✅ Appointments section should work without redirecting to login
- ✅ Available times section should work
- ✅ All authentication issues should be resolved

## 🔍 If Issues Persist

1. **Check Supabase logs** for any remaining errors
2. **Verify user roles** are properly assigned
3. **Clear browser cache** and try again
4. **Check the browser console** for any JavaScript errors

The enhanced dentist dashboard should now work perfectly! 🎉
