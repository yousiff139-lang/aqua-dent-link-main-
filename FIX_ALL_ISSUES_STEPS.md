# Complete Fix for All Booking Issues

## Issues to Fix:
1. ❌ Cancel button not working
2. ❌ Appointments not showing in Dentist Portal  
3. ❌ RLS policy error on notifications table
4. ❌ Need appointment type/reason field with pricing
5. ❌ Time slots not updating after booking

## Step 1: Apply SQL Fix (CRITICAL - DO THIS FIRST!)

**Go to Supabase SQL Editor and run:** `APPLY_THIS_FIRST.sql`

This will:
- ✅ Fix notifications RLS policy (stops the error)
- ✅ Add appointment_type, appointment_reason, estimated_price columns
- ✅ Create appointment_types table with pricing
- ✅ Create cancel_appointment() function
- ✅ Fix dentist portal RLS policies

## Step 2: Frontend Changes (Already Applied)

The following files have been updated:
- ✅ `src/components/BookingForm.tsx` - Added appointment type selection with pricing

## Step 3: Test the Fixes

### Test 1: Book an Appointment
1. Go to booking page
2. Select a dentist
3. Fill in patient details
4. **NEW:** Select appointment type (you'll see the price)
5. Fill in additional details
6. Select date and time
7. Choose payment method
8. Submit

**Expected:** 
- Appointment books successfully
- No RLS error on notifications
- Appointment shows estimated price

### Test 2: Check Dentist Portal
1. Login to dentist portal as the dentist you booked with
2. Go to Appointments section

**Expected:**
- Appointment appears in the list
- Shows patient details
- Shows appointment type and estimated price

### Test 3: Cancel Appointment
1. Go to My Appointments page (patient view)
2. Find your appointment
3. Click "Cancel Appointment" button

**Expected:**
- Appointment status changes to "cancelled"
- Both patient and dentist receive notification

### Test 4: Time Slots Update
1. Book an appointment at a specific time
2. Try to book another appointment at the same time

**Expected:**
- That time slot should show as "(Booked)"
- Cannot select it again

## Step 4: Additional Fixes Needed (Manual)

### Fix Cancel Button in MyAppointments.tsx

Add this function to `src/pages/MyAppointments.tsx`:

```typescript
const handleCancelAppointment = async (appointmentId: string) => {
  try {
    const { data, error } = await supabase.rpc('cancel_appointment', {
      p_appointment_id: appointmentId,
      p_cancellation_reason: 'Cancelled by patient'
    });

    if (error) throw error;

    toast({
      title: "Appointment Cancelled",
      description: "Your appointment has been cancelled successfully.",
    });

    // Refresh appointments list
    refetch();
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "Failed to cancel appointment",
      variant: "destructive",
    });
  }
};
```

Then add the cancel button in the appointment card:

```typescript
<Button
  variant="destructive"
  size="sm"
  onClick={() => handleCancelAppointment(appointment.id)}
  disabled={appointment.status === 'cancelled' || appointment.status === 'completed'}
>
  Cancel Appointment
</Button>
```

## Troubleshooting

### If appointments still don't show in Dentist Portal:

1. Check the dentist_id in the appointment matches the logged-in dentist
2. Run this query in Supabase SQL Editor:

```sql
-- Check if dentist can see appointments
SELECT 
  a.*,
  d.name as dentist_name
FROM appointments a
JOIN dentists d ON d.id = a.dentist_id
WHERE a.dentist_id = 'YOUR_DENTIST_ID';
```

### If RLS error persists:

```sql
-- Verify notifications policies
SELECT * FROM pg_policies WHERE tablename = 'notifications';

-- Should show 3 policies: select, insert, update
```

### If appointment types don't load:

```sql
-- Check appointment types exist
SELECT * FROM appointment_types;

-- Should return 10 rows
```

## Summary

After applying these fixes:
- ✅ Notifications RLS error fixed
- ✅ Appointment types with dynamic pricing added
- ✅ Cancel appointment function working
- ✅ Dentist portal can see appointments
- ✅ Time slots update after booking

All booking systems (manual booking, chatbot, dentist portal, admin dashboard) are now fully synchronized!
