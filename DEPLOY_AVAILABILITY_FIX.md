# 🚀 Deploy Dentist Availability Fix - Step by Step Guide

**Status:** ✅ Tests Passed - Ready for Database Migration  
**Date:** November 9, 2025

---

## ✅ COMPLETED STEPS

### 1. Tests Passed ✅
```
✓ src/services/availabilityService.test.ts (6 tests) 10ms
  ✓ getAvailableSlots - should fetch available slots from database function
  ✓ getAvailableSlots - should handle errors gracefully
  ✓ isSlotAvailable - should return true for available slot
  ✓ isSlotAvailable - should return false for booked slot
  ✓ getAvailableDates - should return unique dates with available slots
  ✓ getAvailableTimesForDate - should return time slots for a specific date

Test Files: 1 passed (1)
Tests: 6 passed (6)
```

---

## 📋 REMAINING STEPS

### Step 1: Apply Database Migration

**Option A: Using Supabase Dashboard (RECOMMENDED)**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ypbklvrerxikktkbswad
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/20251109000000_dentist_availability_complete_fix.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for success message

**Expected Output:**
```
✅ Dentist availability table created
✅ Slot generation function added
✅ Availability validation added
✅ Default Mon-Fri 9-5 schedule seeded
🎉 DENTIST AVAILABILITY FIX COMPLETE!
```

**Option B: Using Supabase CLI (if installed)**

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref ypbklvrerxikktkbswad

# Push migrations
supabase db push
```

---

### Step 2: Verify Migration

Run these queries in Supabase SQL Editor to verify:

```sql
-- 1. Check dentist_availability table exists
SELECT to_regclass('public.dentist_availability');
-- Expected: public.dentist_availability

-- 2. Check functions exist
SELECT proname FROM pg_proc 
WHERE proname IN ('get_available_slots', 'is_slot_available');
-- Expected: 2 rows

-- 3. Check default availability seeded
SELECT dentist_id, day_of_week, start_time, end_time, slot_duration_minutes
FROM public.dentist_availability
LIMIT 10;
-- Expected: Multiple rows with Mon-Fri 09:00-17:00 schedules

-- 4. Test slot generation function
SELECT * FROM get_available_slots(
  (SELECT id FROM public.dentists LIMIT 1),
  CURRENT_DATE,
  CURRENT_DATE + 7
) LIMIT 10;
-- Expected: Available time slots
```

---

### Step 3: Update Frontend Code

The frontend code needs to be updated to use the new availability service. Here's what needs to change:

#### File: `src/components/BookingForm.tsx`

**Current Implementation (Lines 160-180):**
```typescript
// Watch the selected date to fetch booked slots
const selectedDate = form.watch("date");

// Fetch dentist availability and booked slots
const { data: availability, isLoading: isLoadingAvailability } = useDentistAvailability(dentistId);
const { data: bookedSlots, refetch: refetchBookedSlots } = useBookedSlots(dentistId, selectedDate);

// Generate available time slots based on availability and bookings
const availableTimeSlots = selectedDate && availability && bookedSlots !== undefined
  ? generateTimeSlotsForDate(selectedDate, availability, bookedSlots)
  : [];
```

**New Implementation:**
```typescript
import { availabilityService } from '@/services/availabilityService';
import { useQuery } from '@tanstack/react-query';

// Watch the selected date
const selectedDate = form.watch("date");

// Fetch available slots using the new service
const { data: availableSlots, isLoading: isLoadingSlots, refetch: refetchSlots } = useQuery({
  queryKey: ['available-slots', dentistId, selectedDate],
  queryFn: async () => {
    if (!selectedDate) return [];
    return availabilityService.getAvailableTimesForDate(dentistId, selectedDate);
  },
  enabled: !!dentistId && !!selectedDate,
  staleTime: 30000, // Refresh every 30 seconds
});

// Transform to display format
const displayTimeSlots = (availableSlots || []).map(slot => ({
  value: slot.time,
  label: new Date(`2000-01-01T${slot.time}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }),
  disabled: slot.isBooked,
}));
```

**Update the date picker disabled logic (Lines 550-570):**
```typescript
// Add this query for available dates
const { data: availableDates } = useQuery({
  queryKey: ['available-dates', dentistId],
  queryFn: async () => {
    const today = new Date();
    const twoMonthsLater = new Date();
    twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);
    return availabilityService.getAvailableDates(dentistId, today, twoMonthsLater);
  },
  enabled: !!dentistId,
});

// Update the Calendar disabled prop
<Calendar
  mode="single"
  selected={field.value}
  onSelect={field.onChange}
  disabled={(date) => {
    // Disable past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;
    
    // Disable if submitting
    if (isSubmitting || isStripeProcessing) return true;
    
    // Disable if date not in available dates
    const dateStr = date.toISOString().split('T')[0];
    if (availableDates && !availableDates.includes(dateStr)) return true;
    
    return false;
  }}
  initialFocus
/>
```

**Update the booking submission to refresh slots (Line 380):**
```typescript
// After successful cash payment booking
refetchSlots(); // Instead of refetchBookedSlots()
```

---

### Step 4: Test the Changes

#### Manual Testing Checklist

1. **Test Available Dates**
   - [ ] Open booking form
   - [ ] Verify only Mon-Fri dates are selectable
   - [ ] Verify Sat-Sun are disabled/grayed out

2. **Test Time Slots**
   - [ ] Select a Monday date
   - [ ] Verify slots show from 09:00 to 16:30
   - [ ] Verify NO slots after 17:00
   - [ ] Verify each slot is 30 minutes

3. **Test Booking**
   - [ ] Book a slot (e.g., 09:00)
   - [ ] Refresh the page
   - [ ] Verify that slot now shows as "Booked"
   - [ ] Verify other slots still available

4. **Test Double-Booking Prevention**
   - [ ] Try to book the same slot again
   - [ ] Should show error: "Slot not available"

5. **Test Days Off**
   - [ ] Try to select Saturday
   - [ ] Should be disabled
   - [ ] Try to select Sunday
   - [ ] Should be disabled

---

### Step 5: Start Development Server

```bash
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

---

## 🧪 INTEGRATION TESTS

### Test A: Schema Verification ✅

Run in Supabase SQL Editor:
```sql
SELECT 
  (SELECT to_regclass('public.appointments')) as appointments_table,
  (SELECT to_regclass('public.dentist_availability')) as availability_table,
  (SELECT COUNT(*) FROM public.dentist_availability) as availability_records,
  (SELECT COUNT(*) FROM public.dentists) as dentist_count;
```

**Expected Result:**
```
appointments_table    | availability_table           | availability_records | dentist_count
----------------------|------------------------------|---------------------|---------------
public.appointments   | public.dentist_availability  | 30+                 | 6+
```

### Test B: Slot Generation ✅

Run in Supabase SQL Editor:
```sql
-- Get slots for next Monday
SELECT 
  slot_start::time as start_time,
  slot_end::time as end_time,
  is_booked
FROM get_available_slots(
  (SELECT id FROM public.dentists LIMIT 1),
  CURRENT_DATE + ((1 + 7 - EXTRACT(DOW FROM CURRENT_DATE)::int) % 7),
  CURRENT_DATE + ((1 + 7 - EXTRACT(DOW FROM CURRENT_DATE)::int) % 7)
)
ORDER BY slot_start;
```

**Expected Result:**
```
start_time | end_time | is_booked
-----------|----------|----------
09:00:00   | 09:30:00 | false
09:30:00   | 10:00:00 | false
10:00:00   | 10:30:00 | false
...
16:00:00   | 16:30:00 | false
16:30:00   | 17:00:00 | false
(17 rows) -- Should be exactly 17 slots for 9am-5pm with 30min intervals
```

### Test C: Days Off ✅

Run in Supabase SQL Editor:
```sql
-- Check Saturday (should return 0 rows)
SELECT COUNT(*) as saturday_slots
FROM get_available_slots(
  (SELECT id FROM public.dentists LIMIT 1),
  CURRENT_DATE + ((6 + 7 - EXTRACT(DOW FROM CURRENT_DATE)::int) % 7),
  CURRENT_DATE + ((6 + 7 - EXTRACT(DOW FROM CURRENT_DATE)::int) % 7)
);

-- Check Sunday (should return 0 rows)
SELECT COUNT(*) as sunday_slots
FROM get_available_slots(
  (SELECT id FROM public.dentists LIMIT 1),
  CURRENT_DATE + ((7 - EXTRACT(DOW FROM CURRENT_DATE)::int) % 7),
  CURRENT_DATE + ((7 - EXTRACT(DOW FROM CURRENT_DATE)::int) % 7)
);
```

**Expected Result:**
```
saturday_slots | sunday_slots
---------------|-------------
0              | 0
```

---

## 📊 SUCCESS CRITERIA

Before marking as complete, verify:

- [ ] Migration applied successfully (no errors in SQL Editor)
- [ ] All verification queries return expected results
- [ ] Frontend code updated in BookingForm.tsx
- [ ] Development server starts without errors
- [ ] Manual tests pass (dates, times, booking, days off)
- [ ] No TypeScript errors
- [ ] No console errors in browser

---

## 🔄 ROLLBACK PROCEDURE

If something goes wrong:

### 1. Revert Database Changes

Run in Supabase SQL Editor:
```sql
-- Drop trigger
DROP TRIGGER IF EXISTS validate_appointment_slot_trigger ON public.appointments;

-- Drop functions
DROP FUNCTION IF EXISTS validate_appointment_slot();
DROP FUNCTION IF EXISTS is_slot_available(UUID, DATE, TIME, INTEGER);
DROP FUNCTION IF EXISTS get_available_slots(UUID, DATE, DATE);

-- Drop table (WARNING: Deletes availability data)
DROP TABLE IF EXISTS public.dentist_availability CASCADE;

-- Remove column from dentists
ALTER TABLE public.dentists DROP COLUMN IF EXISTS available_schedule;
```

### 2. Revert Frontend Changes

```bash
git checkout src/components/BookingForm.tsx
npm run dev
```

---

## 📞 SUPPORT

### Common Issues

**Issue:** "Function does not exist"  
**Solution:** Migration not applied. Go to Step 1.

**Issue:** "No slots showing"  
**Solution:** Check dentist_availability table has records.

**Issue:** "Slots showing on weekend"  
**Solution:** Verify day_of_week values in dentist_availability.

### Debug Queries

```sql
-- Check specific dentist availability
SELECT * FROM public.dentist_availability 
WHERE dentist_id = 'your-dentist-id'
ORDER BY day_of_week, start_time;

-- Check existing appointments
SELECT appointment_date, appointment_time, status 
FROM public.appointments 
WHERE dentist_id = 'your-dentist-id'
AND appointment_date >= CURRENT_DATE
ORDER BY appointment_date, appointment_time;
```

---

## ✅ COMPLETION CHECKLIST

- [x] Tests passed (6/6)
- [ ] Migration applied
- [ ] Migration verified
- [ ] Frontend updated
- [ ] Manual tests passed
- [ ] Development server running
- [ ] No errors in console
- [ ] Documentation updated

---

**Next Action:** Apply the database migration using Supabase Dashboard SQL Editor

**Migration File:** `supabase/migrations/20251109000000_dentist_availability_complete_fix.sql`

**Dashboard URL:** https://supabase.com/dashboard/project/ypbklvrerxikktkbswad/sql
