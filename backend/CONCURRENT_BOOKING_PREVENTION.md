# Concurrent Booking Prevention Implementation

## Overview

This document describes the implementation of concurrent booking prevention in the appointment booking system. The system prevents double-booking of dentist time slots through multiple layers of protection.

## Implementation Strategy

### 1. Database-Level Protection (Primary Defense)

**Unique Constraint**
- A unique index on `(dentist_email, appointment_date, appointment_time)` in the appointments table
- This is the ultimate safeguard against concurrent bookings
- PostgreSQL enforces this constraint atomically, preventing race conditions

**Migration File**: `supabase/migrations/20251024150000_create_booking_payment_tables.sql`

```sql
CREATE UNIQUE INDEX IF NOT EXISTS unique_dentist_datetime 
  ON public.appointments(dentist_email, appointment_date, appointment_time)
  WHERE dentist_email IS NOT NULL AND appointment_time IS NOT NULL;
```

**Error Code**: PostgreSQL returns error code `23505` when a unique constraint is violated.

### 2. Application-Level Validation (Secondary Defense)

**Slot Availability Check**
- Before creating an appointment, the service checks if the slot is available
- This provides early feedback to users without attempting a database insert
- Located in `AppointmentsService.checkSlotAvailability()`

**Repository Method**: `appointmentsRepository.checkSlotAvailability()`

```typescript
async checkSlotAvailability(
  dentistEmail: string,
  appointmentDate: string,
  appointmentTime: string,
  excludeAppointmentId?: string
): Promise<boolean>
```

### 3. Alternative Slot Suggestions

When a slot is unavailable, the system automatically suggests alternative available time slots:

**Service Method**: `appointmentsService.getAlternativeSlots()`

```typescript
async getAlternativeSlots(
  dentistEmail: string,
  requestedDate: string,
  requestedTime: string,
  maxSlots: number = 5
): Promise<string[]>
```

**Features**:
- Generates time slots from 9 AM to 5 PM in 30-minute intervals
- Filters out already booked slots
- Returns up to 5 alternative slots
- Excludes the originally requested time

### 4. Error Handling and User Feedback

**Backend Error Response**

When a slot is unavailable, the backend returns a 409 Conflict status with:

```json
{
  "success": false,
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "This time slot was just booked by another patient. Please select a different time.",
    "details": {
      "alternativeSlots": [
        { "date": "2025-12-01", "time": "10:30" },
        { "date": "2025-12-01", "time": "11:00" },
        { "date": "2025-12-01", "time": "11:30" }
      ]
    },
    "timestamp": "2025-10-25T12:00:00.000Z"
  }
}
```

**Frontend Error Handling**

The booking form displays user-friendly error messages with alternative times:

```typescript
// Example error message shown to user:
"This time slot was just booked by another patient. Available times: 10:30 AM, 11:00 AM, 11:30 AM and more. Please select a different time."
```

## Flow Diagram

```
User submits booking
       ↓
Service validates input
       ↓
Service checks slot availability ← Early feedback
       ↓
   Available?
       ↓ No
   Get alternative slots
       ↓
   Throw SlotUnavailable error with alternatives
       ↓
   Frontend displays error + alternatives
       
   ↓ Yes
Repository attempts insert
       ↓
Database checks unique constraint ← Ultimate safeguard
       ↓
   Constraint violated? (23505)
       ↓ Yes
   Get alternative slots
       ↓
   Throw SlotUnavailable error with alternatives
       ↓
   Frontend displays error + alternatives
       
   ↓ No
Appointment created successfully
       ↓
Return appointment to user
```

## Race Condition Handling

### Scenario: Two Users Book Same Slot Simultaneously

1. **User A** and **User B** both request the same time slot at nearly the same time
2. Both requests pass the application-level availability check (race condition window)
3. Both requests attempt to insert into the database
4. PostgreSQL processes inserts sequentially due to the unique constraint
5. **First insert succeeds** - User A gets the appointment
6. **Second insert fails** - PostgreSQL returns error code 23505
7. Backend catches the error, fetches alternative slots, and returns 409 with alternatives
8. **User B** sees: "This time slot was just booked. Available times: ..."

### Why This Works

- **Atomicity**: Database constraints are enforced atomically at the transaction level
- **Serialization**: PostgreSQL serializes conflicting inserts automatically
- **No Lost Updates**: The unique constraint prevents any possibility of double-booking
- **Graceful Degradation**: Even if the application-level check fails, the database constraint catches it

## Testing

### Unit Tests

Located in `backend/src/tests/concurrent-booking.test.ts`

Tests cover:
1. Basic double-booking prevention
2. Alternative slot suggestions
3. Different time slots allowed
4. Concurrent request handling

### Manual Testing

To test concurrent booking prevention:

1. Open two browser windows
2. Navigate to the same dentist's profile in both
3. Select the same date and time in both booking forms
4. Submit both forms simultaneously
5. One should succeed, the other should show the slot unavailable error with alternatives

## Performance Considerations

### Index Performance

The unique index on `(dentist_email, appointment_date, appointment_time)` is highly efficient:
- Uses B-tree index structure
- Partial index (only non-null values)
- Covers the most common query patterns

### Query Optimization

Slot availability checks use indexed columns:
```sql
SELECT id FROM appointments 
WHERE dentist_email = ? 
  AND appointment_date = ? 
  AND appointment_time = ?
  AND status != 'cancelled'
```

This query uses the unique index and is very fast (typically < 1ms).

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `SLOT_UNAVAILABLE` | 409 | The requested time slot is already booked |
| `VALIDATION_ERROR` | 400 | Invalid input data (e.g., past date) |
| `NOT_FOUND` | 404 | Appointment or dentist not found |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Configuration

No configuration is required. The system uses:
- **Time slots**: 9 AM to 5 PM, 30-minute intervals (hardcoded)
- **Alternative slots**: Up to 5 suggestions (configurable via `maxSlots` parameter)
- **Timezone**: Server timezone (should be configured in deployment)

## Monitoring and Logging

### Logged Events

1. **Concurrent booking detected** (WARN level)
   ```
   Concurrent booking attempt detected
   { dentistEmail, date, time }
   ```

2. **Appointment created** (INFO level)
   ```
   Appointment created successfully
   { appointmentId, patientEmail, dentistEmail, date, time }
   ```

3. **Slot availability check failed** (INFO level)
   ```
   Slot unavailable
   { dentistEmail, date, time, alternativeSlots }
   ```

### Metrics to Monitor

- Number of 409 errors (slot unavailable)
- Ratio of concurrent booking attempts to total bookings
- Average time to resolve booking conflicts
- User retry behavior after slot unavailable errors

## Future Enhancements

1. **Slot Reservation System**: Reserve slots for a short time (e.g., 5 minutes) while user completes payment
2. **Real-time Availability Updates**: Use WebSockets to update available slots in real-time
3. **Optimistic Locking**: Add version numbers to appointments for additional conflict detection
4. **Booking Queue**: Allow users to join a waitlist for fully booked slots
5. **Smart Suggestions**: Use ML to suggest slots based on user preferences and historical data

## Troubleshooting

### Issue: Users frequently see "slot unavailable" errors

**Possible Causes**:
- High booking volume during peak hours
- Slow application-level availability check
- Users holding booking forms open for long periods

**Solutions**:
- Implement slot reservation system
- Add real-time availability updates
- Show slot availability status before form submission

### Issue: Database constraint violations not caught

**Possible Causes**:
- Migration not applied
- Constraint disabled or dropped

**Solutions**:
- Verify migration status: Check Supabase dashboard
- Re-apply migration if needed
- Check database logs for constraint errors

### Issue: Alternative slots not showing

**Possible Causes**:
- All slots booked for the day
- Error in `getAlternativeSlots()` method
- Frontend not parsing error response correctly

**Solutions**:
- Check backend logs for errors
- Verify error response format
- Test with a day that has available slots

## Related Files

- `backend/src/services/appointments.service.ts` - Business logic
- `backend/src/repositories/appointments.repository.ts` - Database operations
- `backend/src/utils/errors.ts` - Error definitions
- `src/components/BookingForm.tsx` - User website booking form
- `dentist-portal/src/components/AppointmentsTab.tsx` - Dentist portal
- `dentist-portal/src/components/RescheduleDialog.tsx` - Reschedule functionality
- `supabase/migrations/20251024150000_create_booking_payment_tables.sql` - Database schema

## Conclusion

The concurrent booking prevention system uses a defense-in-depth approach with multiple layers:

1. **Database unique constraint** - Ultimate safeguard (cannot be bypassed)
2. **Application-level validation** - Early feedback to users
3. **Alternative slot suggestions** - Improved user experience
4. **Graceful error handling** - Clear communication to users

This ensures that double-booking is impossible while providing a smooth user experience even when conflicts occur.
