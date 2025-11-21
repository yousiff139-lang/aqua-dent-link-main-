# 🚀 RUN THIS SQL - 30 SECONDS

## COPY THIS FILE: `FIX_PERMISSION_SIMPLE.sql`

1. Open: https://supabase.com/dashboard/project/ypbklvrerxikktkbswad/sql

2. Copy ALL the SQL from `FIX_PERMISSION_SIMPLE.sql`

3. Paste into Supabase SQL Editor

4. Click "Run" (or press Ctrl+Enter)

5. Should complete without errors

6. Restart your app:
   ```bash
   npm run dev
   ```

7. Try booking - should work! ✅

---

## WHAT THIS DOES

- Makes `patient_id` optional (allows guest bookings)
- Updates security policies (allows anonymous users)
- Ensures we have email/name/phone for all bookings

## IF YOU GET AN ERROR

**Error: "constraint already exists"**
- That's OK, it means it's already there
- The booking should still work

**Error: "policy already exists"**
- Run this first to clean up:
```sql
DROP POLICY IF EXISTS "Allow public appointment creation" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can create appointments" ON public.appointments;
```
- Then run the full SQL again

---

**THAT'S IT! 30 seconds to fix!** 🔥
