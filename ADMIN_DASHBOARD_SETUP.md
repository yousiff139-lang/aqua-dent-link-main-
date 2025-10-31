# Admin Dashboard Setup Guide

## Overview

The admin dashboard has been created! It allows designated admin users (karrarmayaly@gmail.com and bingo@gmail.com) to:
- View all dentists in the system
- See each dentist's patient bookings
- View appointment details including symptoms and documents
- Access all appointments across all dentists

## What Was Created

### 1. New Files

- `src/types/admin.ts` - TypeScript interfaces for admin features
- `src/lib/admin-queries.ts` - Database query functions for fetching dentists and appointments
- `src/components/admin/DentistCard.tsx` - Component to display dentist information
- `src/components/admin/AppointmentTable.tsx` - Component to display patient appointments
- `supabase/migrations/20251018120000_add_admin_rls_policies.sql` - Database security policies

### 2. Updated Files

- `src/pages/Admin.tsx` - Complete admin dashboard implementation
- `src/lib/auth.ts` - Added bingo@gmail.com to admin emails

## Setup Instructions

### Step 1: Apply Database Migration

You need to apply the new RLS policies to your Supabase database. You have two options:

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy and paste the contents of `supabase/migrations/20251018120000_add_admin_rls_policies.sql`
6. Click **Run** to execute the migration

#### Option B: Using Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

### Step 2: Test Admin Access

1. **Sign up or sign in** with one of the admin emails:
   - karrarmayaly@gmail.com
   - bingo@gmail.com

2. **Verify email** (if required by your Supabase settings)

3. **Access the admin dashboard** at `/admin`

4. You should see:
   - Statistics cards showing total dentists and appointments
   - Two tabs: "View by Dentist" and "All Appointments"
   - List of all dentists with their information
   - Ability to select a dentist and view their patients

### Step 3: Verify Everything Works

✅ **Admin Authentication**
- Admin emails can access `/admin`
- Non-admin users are redirected away from `/admin`

✅ **Dentist List**
- All dentists are displayed
- Search functionality works
- Dentist cards show name, email, specialization, rating, and appointment count

✅ **Appointment Viewing**
- Selecting a dentist shows their appointments
- "All Appointments" tab shows appointments across all dentists
- Appointment cards display patient info, date, time, status, and symptoms

## Features

### View by Dentist Tab

- **Dentist List** (left panel):
  - Search dentists by name, email, or specialization
  - Click to select a dentist
  - Shows appointment count for each dentist

- **Appointments** (right panel):
  - Displays all appointments for the selected dentist
  - Shows patient name, email, symptoms
  - Displays appointment date, time, and status
  - Indicates if documents are attached

### All Appointments Tab

- View all appointments across all dentists in one place
- Same detailed information as the dentist-specific view
- Useful for getting an overview of all bookings

### Statistics Dashboard

Four stat cards at the top show:
1. **Total Dentists** - Number of registered dentists
2. **Total Appointments** - All appointments in the system
3. **Upcoming** - Appointments with "upcoming" status
4. **Completed** - Appointments with "completed" status

## Troubleshooting

### Issue: "Failed to load dentists"

**Solution**: Make sure the RLS policies are applied correctly. Check that:
- The migration was run successfully
- Your admin email is spelled correctly in the policy
- You're signed in with an admin email

### Issue: "No dentists found"

**Possible causes**:
1. No dentists have been registered yet
2. RLS policies are blocking access

**Solution**: 
- Check if dentists exist in your database
- Verify the RLS policies were applied
- Make sure you're signed in as an admin

### Issue: Can't access /admin page

**Solution**:
- Verify you're signed in with karrarmayaly@gmail.com or bingo@gmail.com
- Check that your email is verified (if email confirmation is enabled)
- Clear browser cache and try again

### Issue: Appointments not showing

**Possible causes**:
1. The dentist has no appointments yet
2. RLS policies are blocking access
3. The `dentist_id` field in appointments table is not set

**Solution**:
- Check if appointments exist for that dentist in the database
- Verify appointments have the correct `dentist_id` value
- Ensure RLS policies allow admin access to appointments

## Database Schema Requirements

The admin dashboard expects the following tables and columns:

### dentists table
- `id` (UUID, primary key)
- `specialization` (text)
- `bio` (text, nullable)
- `years_of_experience` (integer, nullable)
- `rating` (decimal)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### appointments table
- `id` (UUID, primary key)
- `patient_id` (UUID, references auth.users)
- `dentist_id` (UUID, references dentists)
- `dentist_name` (text)
- `appointment_date` (timestamp)
- `appointment_type` (text)
- `status` (text: 'upcoming', 'completed', 'cancelled')
- `symptoms` (text, nullable)
- `documents` (jsonb, nullable)
- `notes` (text, nullable)
- `created_at` (timestamp)

### profiles table
- `id` (UUID, primary key, references auth.users)
- `full_name` (text)
- `email` (text)

## Adding More Admin Users

To add more admin emails:

1. Open `src/lib/auth.ts`
2. Add the email to the `ADMIN_EMAILS` array:
   ```typescript
   export const ADMIN_EMAILS: string[] = [
     "karrarmayaly@gmail.com",
     "bingo@gmail.com",
     "newemail@gmail.com", // Add here
   ];
   ```
3. Update the RLS policy in `supabase/migrations/20251018120000_add_admin_rls_policies.sql`
4. Re-run the migration

## Next Steps

Now that the admin dashboard is set up, you can:

1. **Test the authentication flow** - Sign up with admin emails and verify access
2. **Add more features** - Consider adding:
   - Ability to edit dentist information
   - Appointment status management
   - Export appointments to PDF/Excel
   - Real-time notifications for new bookings
3. **Integrate with chatbot** - Ensure the chatbot booking system sends PDF summaries to the appointments

## Support

If you encounter any issues:
1. Check the browser console for errors (F12)
2. Verify database migrations were applied
3. Check Supabase logs for RLS policy violations
4. Ensure you're using the correct admin email

---

**Admin Dashboard is ready to use!** 🎉

Sign in with karrarmayaly@gmail.com or bingo@gmail.com and navigate to `/admin` to start managing dentists and viewing patient bookings.
