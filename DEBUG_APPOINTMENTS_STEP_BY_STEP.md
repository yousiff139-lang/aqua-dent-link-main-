# Debug Appointments - Step by Step

## I've Added Console Logging

Now when you open the dentist portal or admin page, you'll see detailed logs in the browser console showing EXACTLY what's happening.

## Step 1: Restart Everything

```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Start main app
npm run dev

# In NEW terminal - Start dentist portal
cd dentist-portal
npm run dev
```

## Step 2: Test Dentist Portal

1. Open: http://localhost:5174
2. **Open Browser Console (F12)** - IMPORTANT!
3. Login with dentist email (e.g., michael.chen@dentalcare.com)
4. Go to "Appointments" section

### What to Look For in Console:

```
👨‍⚕️ AppointmentsTab - Dentist: {id: "...", email: "...", ...}
📧 AppointmentsTab - Dentist Email: michael.chen@dentalcare.com
🔍 Fetching appointments for dentist: michael.chen@dentalcare.com
Fetching appointments for dentist email: michael.chen@dentalcare.com
Found X appointments for michael.chen@dentalcare.com
✅ Fetched appointments: X appointments
📋 Appointments data: [...]
```

### If You See:
- **"❌ No dentist email provided"** → Login didn't work properly
- **"Found 0 appointments"** → No appointments in database for this email
- **"Error fetching appointments"** → Database query failed

## Step 3: Test Admin Page

1. Open: http://localhost:5173
2. **Open Browser Console (F12)** - IMPORTANT!
3. Login as admin
4. Go to Admin Dashboard

### What to Look For in Console:

```
🔍 Admin: Loading appointments...
✅ Admin: Loaded X appointments
📋 Admin: First appointment: {...}
```

### If You See:
- **"Loaded 0 appointments"** → No appointments in database at all
- **"Error loading appointments"** → Database query failed

## Step 4: Check Database

Run this SQL in Supabase to see what's actually there:

```sql
-- See all appointments
SELECT 
  id,
  patient_name,
  dentist_name,
  dentist_email,
  appointment_date,
  status
FROM public.appointments
ORDER BY created_at DESC
LIMIT 10;

-- Count by dentist email
SELECT 
  dentist_email,
  COUNT(*) as count
FROM public.appointments
GROUP BY dentist_email;
```

## Step 5: Match Emails

The dentist email you login with MUST match the `dentist_email` in the appointments table.

Example:
- Login email: `michael.chen@dentalcare.com`
- Appointment dentist_email: `michael.chen@dentalcare.com` ✅
- Appointment dentist_email: `Michael.Chen@DentalCare.com` ✅ (case insensitive)
- Appointment dentist_email: `dr.chen@example.com` ❌ (different email)

## Step 6: Report Back

After following these steps, tell me:

1. What do you see in the browser console?
2. How many appointments does the SQL query show?
3. What is the dentist_email in those appointments?
4. What email are you logging in with?

Then I can fix the exact issue.

## Common Issues

### Issue 1: No Appointments in Database
**Solution:** Create a test appointment through the main app

### Issue 2: Email Mismatch
**Solution:** Update appointments to use correct dentist email:
```sql
UPDATE public.appointments
SET dentist_email = 'correct@email.com'
WHERE dentist_name = 'Dr. Name';
```

### Issue 3: Login Email Different
**Solution:** Login with the email that matches appointments

### Issue 4: Supabase Connection Error
**Solution:** Check .env files have correct credentials

## Files with Logging

1. `dentist-portal/src/hooks/useAppointments.ts` - Shows fetch process
2. `dentist-portal/src/components/AppointmentsTab.tsx` - Shows dentist info
3. `dentist-portal/src/services/dentist.service.ts` - Shows query details
4. `src/pages/EnhancedAdmin.tsx` - Shows admin query

All have emoji icons (🔍 ✅ ❌ 📋) so they're easy to spot in console.
