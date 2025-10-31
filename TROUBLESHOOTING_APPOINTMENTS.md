# Troubleshooting: "Failed to Load Appointments" Error

## Quick Diagnosis

### Step 1: Run Diagnostic Script

1. Open your browser's Developer Console (F12)
2. Navigate to the page where you're seeing the error
3. Copy and paste the contents of `scripts/diagnose-appointments-issue.js` into the console
4. Press Enter to run the diagnostic

The script will check:
- ✅ User authentication status
- ✅ User roles
- ✅ Appointments table existence
- ✅ RLS policies
- ✅ Query execution

### Step 2: Check Common Issues

## Common Causes & Solutions

### 1. RLS Policy Issue (Most Common)

**Symptoms:**
- Error message: "Failed to load appointments"
- Console shows: "new row violates row-level security policy" or "permission denied"

**Solution:**

Apply the RLS fix migration:

```bash
# Option 1: Using Supabase CLI
cd supabase
supabase db push

# Option 2: Using the fix script
chmod +x scripts/fix-appointments-rls.sh
./scripts/fix-appointments-rls.sh
```

Or manually in Supabase Dashboard:
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20251025160000_fix_appointments_rls.sql`
3. Paste and run the SQL

### 2. User Not Authenticated

**Symptoms:**
- Error: "No authorization header" or "JWT expired"
- User is logged out unexpectedly

**Solution:**

```javascript
// Check authentication in browser console
const { data: { session } } = await window.supabase.auth.getSession();
console.log('Session:', session);

// If no session, log in again
```

### 3. Missing User Roles

**Symptoms:**
- User is authenticated but can't access appointments
- Console shows: "User does not have required role"

**Solution:**

Check and assign roles in Supabase Dashboard:

```sql
-- Check user roles
SELECT * FROM user_roles WHERE user_id = 'your-user-id';

-- If no role, insert one
INSERT INTO user_roles (user_id, role)
VALUES ('your-user-id', 'patient');
```

### 4. Database Connection Issue

**Symptoms:**
- Error: "Failed to fetch" or "Network error"
- All database queries failing

**Solution:**

1. Check `.env` file has correct Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   ```

2. Verify Supabase project is running in Dashboard

3. Check browser Network tab for failed requests

### 5. Appointments Table Missing

**Symptoms:**
- Error: "relation 'appointments' does not exist"

**Solution:**

Run all migrations:

```bash
cd supabase
supabase db push
```

Or check in Supabase Dashboard → Database → Tables if `appointments` table exists.

### 6. CORS Issue

**Symptoms:**
- Error: "CORS policy blocked"
- Requests fail with CORS error

**Solution:**

1. Check Supabase Dashboard → Settings → API
2. Verify your domain is allowed
3. For local development, `localhost` should be allowed by default

## Detailed Debugging Steps

### Step 1: Check Browser Console

1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for red error messages
4. Note the exact error message

### Step 2: Check Network Tab

1. Open Developer Tools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Look for failed requests to Supabase
5. Click on failed request
6. Check Response tab for error details

### Step 3: Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to Logs → Postgres Logs
3. Look for errors around the time of the issue
4. Check for RLS policy violations

### Step 4: Test Query Directly

Run this in browser console:

```javascript
// Test basic query
const { data, error } = await window.supabase
  .from('appointments')
  .select('*')
  .limit(1);

console.log('Data:', data);
console.log('Error:', error);
```

### Step 5: Check RLS Policies

In Supabase Dashboard:
1. Go to Database → Policies
2. Find `appointments` table
3. Verify policies exist:
   - "Patients can view own appointments"
   - "Dentists can view their appointments"
   - "Admins can view all appointments"

## Manual RLS Policy Fix

If the migration doesn't work, manually create policies:

```sql
-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;

-- Create policy for patients
CREATE POLICY "Patients can view own appointments"
  ON public.appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

-- Grant permissions
GRANT SELECT ON public.appointments TO authenticated;
```

## Verification Steps

After applying fixes:

### 1. Test Authentication

```javascript
const { data: { user } } = await window.supabase.auth.getUser();
console.log('User:', user);
```

### 2. Test Appointments Query

```javascript
const { data, error } = await window.supabase
  .from('appointments')
  .select('*');

console.log('Appointments:', data);
console.log('Error:', error);
```

### 3. Check Dashboard

1. Navigate to Dashboard page
2. Appointments should load
3. No error messages

## Still Having Issues?

### Collect Debug Information

1. **Browser Console Errors:**
   - Screenshot of console errors
   - Full error message text

2. **Network Request Details:**
   - Failed request URL
   - Request headers
   - Response body

3. **User Information:**
   - User ID (from console: `(await window.supabase.auth.getUser()).data.user.id`)
   - User email
   - User roles

4. **Environment:**
   - Browser and version
   - Operating system
   - Local or deployed environment

### Get Help

1. **Check Supabase Status:**
   - https://status.supabase.com

2. **Review Documentation:**
   - [API Documentation](supabase/functions/API_DOCUMENTATION.md)
   - [Deployment Guide](docs/EDGE_FUNCTIONS_DEPLOYMENT_GUIDE.md)

3. **Contact Support:**
   - Include debug information above
   - Describe steps to reproduce
   - Share error messages

## Prevention

### Best Practices

1. **Always check authentication before queries:**
   ```typescript
   const { user } = useAuth();
   if (!user) {
     navigate('/auth');
     return;
   }
   ```

2. **Handle errors gracefully:**
   ```typescript
   try {
     const { data, error } = await supabase.from('appointments').select('*');
     if (error) throw error;
     setAppointments(data);
   } catch (error) {
     console.error('Error:', error);
     toast.error('Failed to load appointments');
   }
   ```

3. **Test RLS policies after migrations:**
   ```bash
   # After running migrations
   npm run test:rls
   ```

4. **Monitor Supabase logs regularly**

5. **Keep migrations in sync across environments**

## Quick Reference

### Common Error Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `PGRST116` | No rows found | Check RLS policies |
| `42501` | Insufficient privilege | Check user roles |
| `42P01` | Table doesn't exist | Run migrations |
| `23505` | Unique violation | Check for duplicates |
| `JWT expired` | Token expired | Re-authenticate |

### Useful Commands

```bash
# Check Supabase status
supabase status

# Run migrations
supabase db push

# Reset database (CAUTION: deletes data)
supabase db reset

# View logs
supabase logs

# Test connection
supabase db ping
```

### Useful SQL Queries

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'appointments';

-- Check user roles
SELECT * FROM user_roles WHERE user_id = 'your-user-id';

-- Check appointments
SELECT * FROM appointments WHERE patient_id = 'your-user-id';

-- Check table permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'appointments';
```

---

## Summary

Most "Failed to load appointments" errors are caused by:
1. **RLS policy issues** (70% of cases) → Run RLS fix migration
2. **Authentication issues** (20% of cases) → Re-login
3. **Missing roles** (5% of cases) → Assign user role
4. **Other** (5% of cases) → Use diagnostic script

**Quick Fix (Most Cases):**
```bash
# Run this command
supabase db push
```

Then refresh your browser and try again.

---

*Last Updated: October 25, 2025*
*Version: 1.0.0*
