# Concurrent Booking Prevention - Verification Guide

## Overview

This guide explains how to verify that the concurrent booking prevention system is working correctly.

## Prerequisites

1. Backend server must be running
2. Database must have the unique constraint applied (migration `20251024150000_create_booking_payment_tables.sql`)
3. Node.js installed

## Quick Verification

### Option 1: Automated Script

Run the verification script:

```bash
cd backend
node verify-concurrent-booking.js
```

This script will:
1. Attempt to book the same time slot twice sequentially
2. Simulate concurrent booking attempts
3. Verify that only one booking succeeds
4. Check that alternative slots are provided

Expected output:
```
🧪 Testing Concurrent Booking Prevention

============================================================
Dentist: test-dentist@example.com
Date: 2025-12-01
Time: 10:00
============================================================

📋 Test 1: Sequential Bookings
------------------------------------------------------------
Booking 1: Patient A...
✅ Booking 1 succeeded
   Appointment ID: abc-123-def

Booking 2: Patient B (same time slot)...
✅ Booking 2 failed as expected
   Status: 409
   Error: This time slot was just booked by another patient...
   Alternative slots provided:
     1. 2025-12-01 at 10:30
     2. 2025-12-01 at 11:00
     3. 2025-12-01 at 11:30

============================================================

📋 Test 2: Concurrent Bookings (Simulated Race Condition)
------------------------------------------------------------
Testing with: 2025-12-02 at 14:00
Sending two requests simultaneously...

Results:
  ✅ Succeeded: 1
  ❌ Failed: 1

✅ CONCURRENT BOOKING PREVENTION WORKING CORRECTLY!
   One booking succeeded, one was rejected.

============================================================

🎉 Verification Complete!
```

### Option 2: Manual Testing with Browser

1. **Open two browser windows side by side**

2. **Navigate to the same dentist profile in both windows**
   - Example: `http://localhost:5174/dentist/123`

3. **Fill out the booking form in both windows**
   - Use different patient names/emails
   - Select the SAME date and time in both

4. **Submit both forms simultaneously**
   - Click submit in both windows at nearly the same time
   - Or use browser dev tools to submit via console

5. **Verify the results**
   - One window should show success
   - Other window should show error with alternative times
   - Example error: "This time slot was just booked by another patient. Available times: 10:30 AM, 11:00 AM, 11:30 AM and more. Please select a different time."

### Option 3: API Testing with cURL

**Terminal 1: First booking (should succeed)**
```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patientName": "John Doe",
    "patientEmail": "john@example.com",
    "phone": "+1234567890",
    "dentistEmail": "dr.smith@dental.com",
    "reason": "Regular checkup",
    "date": "2025-12-01",
    "time": "10:00",
    "paymentMethod": "cash"
  }'
```

**Terminal 2: Second booking (should fail with 409)**
```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patientName": "Jane Smith",
    "patientEmail": "jane@example.com",
    "phone": "+1234567890",
    "dentistEmail": "dr.smith@dental.com",
    "reason": "Cleaning",
    "date": "2025-12-01",
    "time": "10:00",
    "paymentMethod": "cash"
  }'
```

Expected response from second request:
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
        { "date": "2025-12-01", "time": "11:30" },
        { "date": "2025-12-01", "time": "12:00" },
        { "date": "2025-12-01", "time": "12:30" }
      ]
    },
    "timestamp": "2025-10-25T12:00:00.000Z"
  }
}
```

## Verification Checklist

Use this checklist to verify all aspects of the concurrent booking prevention:

### Database Level
- [ ] Unique constraint exists on `(dentist_email, appointment_date, appointment_time)`
- [ ] Constraint is enforced (duplicate inserts fail with error 23505)
- [ ] Constraint allows different dentists to have same time slots
- [ ] Constraint allows same dentist to have different time slots

### Application Level
- [ ] Slot availability check runs before booking attempt
- [ ] Availability check excludes cancelled appointments
- [ ] Availability check supports excluding specific appointment (for updates)
- [ ] Alternative slots are generated when slot is unavailable

### Error Handling
- [ ] 409 status code returned for slot conflicts
- [ ] Error message is user-friendly
- [ ] Alternative slots are included in error response
- [ ] Alternative slots are actually available (not already booked)
- [ ] Frontend displays error message clearly
- [ ] Frontend displays alternative times in readable format

### User Experience
- [ ] Booking form shows clear error when slot is taken
- [ ] Error message suggests alternative times
- [ ] User can easily select an alternative time
- [ ] Reschedule dialog handles conflicts gracefully
- [ ] Dentist portal shows appropriate error messages

### Concurrent Requests
- [ ] Two simultaneous requests for same slot: one succeeds, one fails
- [ ] Failed request receives alternative slots
- [ ] No data corruption occurs
- [ ] No appointments are lost
- [ ] System remains responsive under concurrent load

## Troubleshooting

### Issue: Both bookings succeed (double-booking)

**Diagnosis:**
```sql
-- Check if unique constraint exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'appointments' 
AND indexname = 'unique_dentist_datetime';
```

**Solution:**
- Verify migration was applied
- Re-apply migration if needed
- Check Supabase dashboard for constraint status

### Issue: No alternative slots shown

**Diagnosis:**
- Check backend logs for errors in `getAlternativeSlots()`
- Verify the requested date has available slots
- Check if all slots are booked for that day

**Solution:**
- Test with a date that has fewer bookings
- Verify time slot generation logic (9 AM - 5 PM)
- Check database for existing appointments

### Issue: Frontend not showing error

**Diagnosis:**
- Check browser console for JavaScript errors
- Verify API response format
- Check error handling in BookingForm component

**Solution:**
- Verify error response structure matches expected format
- Check that error.response.data.error.details exists
- Ensure frontend is parsing alternative slots correctly

## Performance Testing

### Load Test: Concurrent Bookings

Test with multiple concurrent requests:

```bash
# Install Apache Bench (if not installed)
# apt-get install apache2-utils  # Ubuntu/Debian
# brew install httpd              # macOS

# Run load test (100 requests, 10 concurrent)
ab -n 100 -c 10 -p booking.json -T application/json \
  http://localhost:3000/api/appointments
```

Create `booking.json`:
```json
{
  "patientName": "Load Test Patient",
  "patientEmail": "loadtest@example.com",
  "phone": "+1234567890",
  "dentistEmail": "dr.smith@dental.com",
  "reason": "Load test",
  "date": "2025-12-01",
  "time": "10:00",
  "paymentMethod": "cash"
}
```

Expected results:
- Only 1 request should succeed (201 status)
- 99 requests should fail (409 status)
- All responses should be fast (< 100ms)
- No 500 errors should occur

## Monitoring

### Key Metrics to Track

1. **Conflict Rate**
   ```sql
   -- Count 409 errors in logs
   SELECT COUNT(*) 
   FROM logs 
   WHERE status_code = 409 
   AND endpoint = '/api/appointments'
   AND timestamp > NOW() - INTERVAL '1 day';
   ```

2. **Concurrent Booking Attempts**
   ```sql
   -- Count concurrent booking warnings
   SELECT COUNT(*) 
   FROM logs 
   WHERE message LIKE '%Concurrent booking attempt detected%'
   AND timestamp > NOW() - INTERVAL '1 day';
   ```

3. **Alternative Slot Usage**
   - Track how often users select suggested alternative slots
   - Monitor user retry behavior after seeing conflicts

### Alerts to Set Up

1. **High Conflict Rate**: Alert if > 10% of bookings result in 409 errors
2. **Database Constraint Failures**: Alert on any 23505 errors not caught
3. **Slow Availability Checks**: Alert if slot checks take > 100ms
4. **No Alternative Slots**: Alert if alternative slots array is empty

## Success Criteria

The concurrent booking prevention is working correctly if:

✅ **Zero double-bookings**: No two appointments for same dentist at same time
✅ **Graceful failures**: Conflicts result in 409 errors, not 500 errors
✅ **User-friendly errors**: Clear messages with alternative suggestions
✅ **Fast responses**: Availability checks complete in < 100ms
✅ **No data loss**: All booking attempts are logged and tracked
✅ **Consistent behavior**: Same results whether sequential or concurrent

## Additional Resources

- [CONCURRENT_BOOKING_PREVENTION.md](./CONCURRENT_BOOKING_PREVENTION.md) - Detailed implementation guide
- [TASK_19_IMPLEMENTATION_SUMMARY.md](../TASK_19_IMPLEMENTATION_SUMMARY.md) - Implementation summary
- [Supabase Documentation](https://supabase.com/docs) - Database and real-time features
- [PostgreSQL Unique Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) - Database constraint documentation

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review backend logs for detailed error messages
3. Verify database migration status
4. Test with the verification script
5. Check the implementation documentation

For additional help, refer to the comprehensive documentation in `CONCURRENT_BOOKING_PREVENTION.md`.
