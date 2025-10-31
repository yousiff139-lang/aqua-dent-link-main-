# Quick Fix: "Failed to Load Appointments" Error

## 🚨 The Problem

After booking an appointment, you see "Failed to load appointments" error on the Dashboard.

**Root Cause:** Database constraint conflict - the code uses `status = 'upcoming'` but the database constraint was changed to only allow `'pending', 'confirmed', 'completed', 'cancelled'`.

## ✅ The Solution

### Option 1: Automated Fix (Recommended)

**Windows:**
```cmd
scripts\fix-appointments-complete.bat
```

**Linux/Mac:**
```bash
chmod +x scripts/fix-appointments-complete.sh
./scripts/fix-appointments-complete.sh
```

### Option 2: Manual Fix

1. **Apply migrations:**
   ```bash
   cd supabase
   supabase db push
   ```

2. **Refresh your browser**

3. **Test by booking an appointment**

### Option 3: Direct SQL Fix (If CLI doesn't work)

1. Go to **Supabase Dashboard** → **SQL Editor**

2. Run this SQL:
   ```sql
   -- Fix status constraint
   ALTER TABLE public.appointments 
     DROP CONSTRAINT IF EXISTS appointments_status_check;

   ALTER TABLE public.appointments 
     ADD CONSTRAINT appointments_status_check 
     CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled'));

   -- Update existing appointments
   UPDATE public.appointments 
   SET status = 'upcoming' 
   WHERE status IN ('pending', 'confirmed');

   -- Fix RLS policies
   DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;

   CREATE POLICY "Patients can view own appointments"
     ON public.appointments FOR SELECT
     TO authenticated
     USING (auth.uid() = patient_id);

   GRANT SELECT ON public.appointments TO authenticated;
   ```

3. **Refresh your browser**

## 🧪 Testing the Fix

### Step 1: Run Diagnostic

1. Open browser console (F12)
2. Copy and paste contents of `scripts/test-appointments-query.js`
3. Press Enter
4. Check the output

### Step 2: Test Booking Flow

1. Log in to your application
2. Go to Dashboard
3. Click "Book New" or "Book Appointment"
4. Select a dentist
5. Complete the booking
6. Return to Dashboard
7. **Verify appointments load without error**

## 📊 What Was Fixed

### 1. Status Constraint
**Before:**
```sql
CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'))
```

**After:**
```sql
CHECK (status IN ('pending', 'confirmed', 'upcoming', 'completed', 'cancelled'))
```

### 2. RLS Policies
- Consolidated duplicate policies
- Fixed patient access policy
- Added proper dentist and admin policies

### 3. Database Indexes
- Added index on `status` column
- Added composite indexes for better query performance

## 🔍 Verification

After applying the fix, verify:

✅ **Dashboard loads without errors**
✅ **Can book new appointments**
✅ **Booked appointments appear in dashboard**
✅ **Can view appointment details**
✅ **Can cancel appointments (if > 1 hour away)**

## ❌ Still Having Issues?

### Check 1: User Authentication

```javascript
// Run in browser console
const { data: { user } } = await window.supabase.auth.getUser();
console.log('User:', user);
```

If `user` is null, log in again.

### Check 2: Database Connection

```javascript
// Run in browser console
const { data, error } = await window.supabase
  .from('appointments')
  .select('count');
console.log('Data:', data, 'Error:', error);
```

If error, check `.env` file has correct Supabase credentials.

### Check 3: RLS Policies

1. Go to **Supabase Dashboard** → **Database** → **Policies**
2. Find `appointments` table
3. Verify policy exists: "Patients can view own appointments"
4. Check policy definition includes: `auth.uid() = patient_id`

### Check 4: Appointment Status

```javascript
// Run in browser console
const { data } = await window.supabase
  .from('appointments')
  .select('id, status, patient_id')
  .limit(5);
console.log('Appointments:', data);
```

Check if `status` values are valid.

## 📝 Files Created/Modified

### New Migrations
- `supabase/migrations/20251025160000_fix_appointments_rls.sql`
- `supabase/migrations/20251025170000_fix_appointment_status_constraint.sql`

### New Scripts
- `scripts/fix-appointments-complete.bat` (Windows)
- `scripts/fix-appointments-complete.sh` (Linux/Mac)
- `scripts/test-appointments-query.js` (Diagnostic)

### Documentation
- `TROUBLESHOOTING_APPOINTMENTS.md` (Detailed guide)
- `QUICK_FIX_APPOINTMENTS.md` (This file)

## 💡 Prevention

To prevent this issue in the future:

1. **Always test migrations** before deploying
2. **Keep status values consistent** across code and database
3. **Document status values** in a central location
4. **Use TypeScript enums** for status values
5. **Add database tests** to catch constraint violations

## 🆘 Get Help

If the fix doesn't work:

1. **Run the diagnostic script** and share output
2. **Check browser console** for errors
3. **Check Supabase logs** in Dashboard
4. **Share error messages** with full details

### Collect This Information:

```javascript
// Run in browser console
const debugInfo = {
  user: (await window.supabase.auth.getUser()).data.user,
  appointments: (await window.supabase.from('appointments').select('*').limit(1)).data,
  error: (await window.supabase.from('appointments').select('*').limit(1)).error
};
console.log(JSON.stringify(debugInfo, null, 2));
```

Copy the output and share it.

## ✨ Summary

**Problem:** Status constraint didn't allow 'upcoming' value
**Solution:** Updated constraint to include 'upcoming'
**Time to fix:** ~2 minutes
**Downtime:** None

---

**Last Updated:** October 25, 2025
**Version:** 1.0.0
