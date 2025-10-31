# 🚨 RUN THIS SQL NOW - Step by Step

## You're seeing the error because the database hasn't been fixed yet.

### Follow these EXACT steps:

## Step 1: Open Supabase Dashboard

1. Open your browser
2. Go to: https://supabase.com/dashboard
3. Log in with your Supabase account
4. Click on your project: **ypbklvrerxikktkbswad**

## Step 2: Open SQL Editor

1. Look at the LEFT sidebar
2. Find and click **"SQL Editor"** (it has a </> icon)
3. Click the **"New Query"** button (top right)

## Step 3: Copy the SQL

Open the file `FIX_APPOINTMENTS_NOW.sql` in your project and copy EVERYTHING from it.

**OR** copy this SQL directly:

```sql
-- Fix status constraint
ALTER TABLE public.appointments 
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments 
  ADD CONSTRAINT appointments_status_check 
  CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled'));

-- Fix RLS policies
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Patients can update own appointments" ON public.appointments;

CREATE POLICY "Patients can view own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create appointments"
  ON public.appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update own appointments"
  ON public.appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
```

## Step 4: Paste and Run

1. **Paste** the SQL into the SQL Editor
2. Click the **"Run"** button (or press Ctrl+Enter)
3. Wait for it to finish (should take 1-2 seconds)
4. You should see "Success" or "Completed" message

## Step 5: Refresh Your App

1. Go back to your application tab
2. Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
3. This does a hard refresh

## Step 6: Test

1. Log in to your app
2. Go to Dashboard
3. Click "Book New"
4. Select a dentist
5. Fill the form
6. Submit
7. Check Dashboard - appointment should appear!

---

## ⚠️ IMPORTANT

**You MUST run the SQL in Supabase Dashboard first!**

The code changes are already done, but the database needs to be fixed.

---

## Still Not Working?

If you still see the error after running the SQL:

1. Open browser console (F12)
2. Go to Console tab
3. Copy any red error messages
4. Share them with me

Or run this in the console:

```javascript
const { data, error } = await window.supabase
  .from('appointments')
  .select('*')
  .limit(1);
console.log('Error:', error);
```

Share what it says!
