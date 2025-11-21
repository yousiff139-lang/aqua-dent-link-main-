# 🔄 Dentist Portal Appointments Sync Guide

## Problem:
Appointments booked by patients don't appear in the dentist's portal dashboard.

## Root Cause:
The `dentist_id` in the appointments table doesn't match the dentist's auth user ID, so the RLS policy blocks them from seeing the appointments.

## Solution (3 Steps):

### Step 1: Diagnose the Issue
Run `VERIFY_DENTIST_APPOINTMENTS.sql` in Supabase SQL Editor

This will show you:
- ✅ How many appointments exist
- ✅ Which dentists have auth accounts
- ✅ Which appointments have valid/invalid dentist_id
- ✅ What the specific issues are

### Step 2: Fix Dentist IDs
Run `FIX_DENTIST_IDS.sql` in Supabase SQL Editor

This will:
- ✅ Match appointments to dentists by email
- ✅ Update dentist_id to the correct auth user ID
- ✅ Show you the results

### Step 3: Verify RLS Policies
The `COMPLETE_FIX_RUN_THIS.sql` already includes the correct RLS policies:

```sql
CREATE POLICY "appointments_dentist_select" 
  ON public.appointments FOR SELECT 
  USING (
    dentist_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND dentist_id = appointments.dentist_id 
      AND role = 'dentist'
    )
  );
```

This allows dentists to see appointments where:
- The `dentist_id` matches their auth user ID, OR
- They have a `user_roles` entry linking them to that dentist

## How It Works:

### When a Patient Books:
1. Patient selects "Dr. Michael Chen"
2. Appointment is created with:
   - `dentist_id` = Dr. Chen's UUID from dentists table
   - `dentist_name` = "Dr. Michael Chen"
   - `dentist_email` = "michael.chen@example.com"

### When Dentist Logs In:
1. Dr. Chen logs in with his email
2. His auth user ID is checked
3. RLS policy allows him to see appointments where:
   - `dentist_id` = his auth user ID

### The Issue:
If the `dentist_id` in appointments doesn't match the auth user ID, the dentist can't see the appointments!

## Common Scenarios:

### Scenario 1: Dentist ID Mismatch
**Problem:** Appointment has `dentist_id` = "abc-123" but dentist's auth ID = "xyz-789"
**Solution:** Run `FIX_DENTIST_IDS.sql` to update the dentist_id

### Scenario 2: Dentist Has No Auth Account
**Problem:** Dentist exists in `dentists` table but not in `auth.users`
**Solution:** Create an auth account for the dentist in Supabase Auth

### Scenario 3: Email Mismatch
**Problem:** Appointment has `dentist_email` = "old@email.com" but dentist's auth email = "new@email.com"
**Solution:** Update the dentist's email in the `dentists` table to match their auth email

## Testing:

### Test 1: Book an Appointment
1. Login as a patient
2. Book appointment with "Dr. Michael Chen"
3. Note the booking reference

### Test 2: Check Dentist Portal
1. Login as Dr. Michael Chen (use his auth credentials)
2. Go to Appointments section
3. **Expected:** See the appointment you just booked

### Test 3: Verify Database
Run this query:
```sql
SELECT 
  a.id,
  a.dentist_name,
  a.dentist_id,
  a.patient_name,
  a.appointment_date,
  u.email as dentist_auth_email
FROM appointments a
LEFT JOIN auth.users u ON u.id = a.dentist_id
WHERE a.dentist_name = 'Dr. Michael Chen'
ORDER BY a.created_at DESC
LIMIT 5;
```

**Expected:** The `dentist_id` should match a valid auth user ID

## Troubleshooting:

### Appointments Still Not Showing?

**Check 1: Is the dentist logged in with the correct account?**
```sql
-- Get the current user's ID
SELECT auth.uid();

-- Check if this ID matches any appointments
SELECT COUNT(*) 
FROM appointments 
WHERE dentist_id = auth.uid();
```

**Check 2: Does the dentist have the correct role?**
```sql
SELECT * 
FROM user_roles 
WHERE user_id = auth.uid() 
AND role = 'dentist';
```

**Check 3: Are RLS policies enabled?**
```sql
SELECT * 
FROM pg_policies 
WHERE tablename = 'appointments' 
AND policyname LIKE '%dentist%';
```

## Quick Fix Commands:

### Fix All Dentist IDs:
```bash
# In Supabase SQL Editor
1. Run VERIFY_DENTIST_APPOINTMENTS.sql (diagnose)
2. Run FIX_DENTIST_IDS.sql (fix)
3. Refresh dentist portal
```

### Create Auth Account for Dentist:
```bash
# In Supabase Auth Dashboard
1. Go to Authentication > Users
2. Click "Add User"
3. Enter dentist's email
4. Set temporary password
5. Send invite email
```

### Update Dentist Email:
```sql
UPDATE dentists 
SET email = 'correct@email.com' 
WHERE name = 'Dr. Michael Chen';
```

## Summary:

The sync works through:
1. ✅ **Correct dentist_id** - Must match auth user ID
2. ✅ **RLS policies** - Allow dentists to see their appointments
3. ✅ **Real-time triggers** - Notify dentists of new appointments

Run the diagnostic and fix scripts to ensure everything is properly connected! 🎯
