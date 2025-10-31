# Apply Admin RLS Policies Migration

This guide explains how to apply the admin RLS policies migration to enable admin users to manage dentist data.

## Migration File

**Location:** `supabase/migrations/20251027120000_add_admin_dentist_management_policies.sql`

## What This Migration Does

This migration adds Row Level Security (RLS) policies that allow admin users (identified by email) to:

1. ✅ **Manage all dentist availability** - Add, update, and delete availability slots for any dentist
2. ✅ **View all appointments** - See appointments for all dentists and patients
3. ✅ **Update appointments** - Modify appointment details for management purposes
4. ✅ **View all dentists** - Access dentist profiles and information
5. ✅ **View all profiles** - See user profiles for dentists and patients

## Admin Users

The following email addresses are configured as admin users:
- `karrarmayaly@gmail.com`
- `bingo@gmail.com`

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/20251027120000_add_admin_dentist_management_policies.sql`
5. Paste it into the SQL editor
6. Click **Run** to execute the migration
7. Verify that all statements executed successfully

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Make sure you're in the project root directory
cd /path/to/your/project

# Push the migration to your database
supabase db push
```

### Option 3: Using the Apply Script

If you have the necessary permissions:

```bash
npm run tsx scripts/apply-admin-rls-migration.ts
```

**Note:** This requires the `exec_sql` function to be available in your Supabase project.

## Verification

After applying the migration, verify that the policies are in place:

### 1. Check Policies in Supabase Dashboard

1. Go to **Database** → **Tables** in your Supabase dashboard
2. Select the `dentist_availability` table
3. Click on the **Policies** tab
4. You should see: **"Admins can manage all availability"**

5. Select the `appointments` table
6. Click on the **Policies** tab
7. You should see:
   - **"Admins can view all appointments"**
   - **"Admins can update all appointments"**

8. Select the `dentists` table
9. Click on the **Policies** tab
10. You should see: **"Admins can view all dentists"**

11. Select the `profiles` table
12. Click on the **Policies** tab
13. You should see: **"Admins can view all profiles"**

### 2. Test Admin Access

Run the test script to verify admin users can access the data:

```bash
npm run tsx scripts/test-admin-rls-policies.ts
```

**Note:** You'll need to update the password in the test script before running it.

### 3. Manual Testing

1. Sign in to the application as an admin user (karrarmayaly@gmail.com)
2. Navigate to `/admin`
3. Verify you can:
   - See the list of all dentists
   - Select a dentist and view their details
   - View the dentist's availability schedule
   - View the dentist's appointments/patients
   - Add, update, or delete availability slots

## Troubleshooting

### Issue: "Policy already exists" errors

**Solution:** This is normal if you've run the migration before. The migration uses `DROP POLICY IF EXISTS` to handle this gracefully.

### Issue: "Permission denied" errors

**Solution:** Make sure you're using a service role key or have sufficient permissions to create policies.

### Issue: Admin user cannot access data

**Possible causes:**
1. The admin user's email doesn't match exactly (check for typos, case sensitivity)
2. The policies weren't applied successfully
3. The user isn't authenticated

**Solution:**
1. Verify the email in the `auth.users` table matches exactly
2. Re-run the migration
3. Check that the user is signed in and has a valid session

### Issue: "Table does not exist" errors

**Solution:** Make sure all required tables exist:
- `dentist_availability`
- `appointments`
- `dentists`
- `profiles`

If any are missing, run the earlier migrations first.

## Requirements Addressed

This migration addresses the following requirements from the spec:

- **Requirement 2.1:** Admin dashboard access control
- **Requirement 2.2:** Exclusive admin access verification
- **Requirement 2.4:** Admin status verification on page load
- **Requirement 4.2:** Admin can add availability time slots
- **Requirement 4.3:** Admin can remove availability time slots
- **Requirement 4.4:** Admin can save availability changes
- **Requirement 5.1:** Admin can view dentist's patients

## Next Steps

After applying this migration:

1. ✅ Test the admin authentication flow
2. ✅ Test the admin dashboard functionality
3. ✅ Test availability management
4. ✅ Test patient list viewing
5. ✅ Complete end-to-end testing of the admin workflow

## Related Files

- Migration: `supabase/migrations/20251027120000_add_admin_dentist_management_policies.sql`
- Test Script: `scripts/test-admin-rls-policies.ts`
- Apply Script: `scripts/apply-admin-rls-migration.ts`
- Requirements: `.kiro/specs/admin-dentist-management/requirements.md`
- Design: `.kiro/specs/admin-dentist-management/design.md`
- Tasks: `.kiro/specs/admin-dentist-management/tasks.md`
