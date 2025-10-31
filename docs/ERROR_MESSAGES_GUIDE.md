# Error Messages Guide

This guide explains all error messages you might encounter while using the Dental Care Connect booking system and how to resolve them.

## Authentication Errors

### "Please sign in to book an appointment"

**What it means:** You need to be logged in to book appointments.

**How to fix:**
1. Click the "Sign In" button in the navigation bar
2. Enter your email and password
3. If you don't have an account, click "Sign Up" to create one
4. After signing in, you'll be redirected back to the booking page

**Technical details:** The system requires authentication to associate appointments with your patient account.

---

### "Session expired. Please sign in again"

**What it means:** Your login session has timed out for security reasons.

**How to fix:**
1. Click "Sign In" in the navigation bar
2. Re-enter your credentials
3. Your session will be refreshed

**Prevention:** Sessions expire after 1 hour of inactivity. Stay active or sign in again when needed.

---

### "Invalid email or password"

**What it means:** The credentials you entered don't match our records.

**How to fix:**
1. Double-check your email address for typos
2. Verify your password (check Caps Lock)
3. Try the "Forgot Password" link if you can't remember your password
4. Ensure you're using the correct account (work vs. personal email)

---

## Booking Form Errors

### "Email must be valid"

**What it means:** The email address format is incorrect.

**How to fix:**
- Ensure your email follows the format: `name@example.com`
- Check for missing @ symbol or domain
- Remove any spaces before or after the email

**Valid examples:**
- ✅ `john.doe@email.com`
- ✅ `patient123@gmail.com`
- ❌ `john.doe@` (missing domain)
- ❌ `@email.com` (missing username)

---

### "Phone number must be valid"

**What it means:** The phone number format is incorrect.

**How to fix:**
- Use format: `(XXX) XXX-XXXX` or `XXX-XXX-XXXX`
- Include area code
- Use only numbers, spaces, hyphens, or parentheses

**Valid examples:**
- ✅ `(555) 123-4567`
- ✅ `555-123-4567`
- ✅ `5551234567`
- ❌ `123-4567` (missing area code)

---

### "Appointment date must be in the future"

**What it means:** You selected a date that has already passed or is today.

**How to fix:**
1. Select a date that is at least 1 day in the future
2. Check that your device's date/time is correct
3. Consider time zones if booking from a different location

**Note:** Same-day appointments are not available through online booking. Call the clinic for urgent appointments.

---

### "This time slot is no longer available. Please choose another time"

**What it means:** Another patient booked this time slot while you were filling out the form.

**How to fix:**
1. Select a different time slot
2. Try a different date if your preferred time is unavailable
3. Book earlier in the day when more slots are available

**Prevention:** Complete the booking form quickly to secure your preferred time.

---

### "All fields are required"

**What it means:** You left one or more required fields empty.

**How to fix:**
1. Scroll through the form to find empty fields (marked with red borders)
2. Fill in all required information:
   - Full Name
   - Email Address
   - Phone Number
   - Appointment Date
   - Appointment Time
   - Reason for Visit
   - Payment Method

---

## Dentist Profile Errors

### "Dentist not found. Please select another dentist"

**What it means:** The dentist profile you're trying to view doesn't exist or has been removed.

**How to fix:**
1. Return to the Dentists list page
2. Select a different dentist from the available options
3. Ensure you didn't manually edit the URL

**Common causes:**
- Outdated bookmark or saved link
- Dentist no longer with the practice
- Incorrect dentist ID in the URL

---

### "Unable to load dentist profile. Please try again"

**What it means:** There was a temporary issue loading the dentist's information.

**How to fix:**
1. Refresh the page (F5 or Ctrl+R)
2. Check your internet connection
3. Try again in a few moments
4. Clear your browser cache if the issue persists

---

### "No dentists available"

**What it means:** There are currently no dentists in the system or none match your search criteria.

**How to fix:**
1. Clear any active filters or search terms
2. Refresh the page
3. Contact support if the issue persists

---

## Payment Errors

### "Payment failed. Please try again"

**What it means:** Your payment could not be processed.

**How to fix:**
1. Verify your card details are correct
2. Ensure you have sufficient funds
3. Check that your card is not expired
4. Try a different payment method
5. Contact your bank if the issue persists

**Common causes:**
- Insufficient funds
- Card declined by bank
- Incorrect CVV or expiration date
- Card not enabled for online transactions

---

### "Payment processing error. Your appointment is pending"

**What it means:** Your appointment was created, but payment processing encountered an issue.

**How to fix:**
1. Check your email for appointment confirmation
2. Your appointment status will show as "pending"
3. You can complete payment later through your dashboard
4. Or choose to pay cash at the clinic

**Important:** Your appointment is still reserved. You won't lose your time slot.

---

## System Errors

### "System configuration error. Please contact support"

**What it means:** There's a technical issue with the system configuration.

**How to fix:**
1. This is not an error you can fix yourself
2. Contact support immediately with:
   - The exact error message
   - What you were trying to do
   - The time the error occurred
3. Try again later after support has been notified

**For developers:** This typically indicates a database schema mismatch or incorrect table name in queries.

---

### "You do not have permission to perform this action"

**What it means:** Your account doesn't have the required permissions.

**How to fix:**
1. Ensure you're signed in to the correct account
2. Verify you're using a patient account (not dentist or admin)
3. Contact support if you believe this is an error

**Common causes:**
- Trying to access another patient's appointments
- Account role mismatch
- RLS policy restriction

---

### "An unexpected error occurred. Please try again"

**What it means:** Something went wrong that the system didn't anticipate.

**How to fix:**
1. Refresh the page and try again
2. Clear your browser cache and cookies
3. Try a different browser
4. Check your internet connection
5. Contact support if the error persists

**What to report:**
- What you were doing when the error occurred
- Any error codes or reference numbers shown
- Your browser and device type

---

## Network Errors

### "Unable to connect to server. Please check your internet connection"

**What it means:** Your device can't reach our servers.

**How to fix:**
1. Check your internet connection
2. Try loading another website to verify connectivity
3. Restart your router if needed
4. Try again once connection is restored
5. Switch to mobile data if Wi-Fi isn't working

---

### "Request timeout. Please try again"

**What it means:** The server took too long to respond.

**How to fix:**
1. Check your internet speed
2. Try again in a few moments
3. Avoid peak usage times if possible
4. Contact support if timeouts persist

---

## Validation Errors

### "Name must be at least 2 characters"

**How to fix:** Enter your full name (first and last name).

---

### "Reason for visit is required"

**How to fix:** Provide a brief description of why you need the appointment (e.g., "Routine checkup", "Tooth pain", "Cleaning").

---

### "Please select a payment method"

**How to fix:** Choose either "Credit/Debit Card (Stripe)" or "Cash" before submitting.

---

## Loading Issues

### Page shows loading spinner indefinitely

**What it means:** The page is stuck loading data.

**How to fix:**
1. Wait 30 seconds to see if it resolves
2. Refresh the page
3. Check your internet connection
4. Clear browser cache
5. Try a different browser

---

### "Loading..." appears but no data shows

**What it means:** Data fetch completed but returned no results.

**How to fix:**
1. Refresh the page
2. Check if you're signed in
3. Verify you have appointments/data to display
4. Contact support if you expect to see data

---

## Error Codes Reference

### Database Error Codes

- **42P01**: Table not found (schema error) - Contact support
- **42501**: Permission denied (RLS policy) - Check account permissions
- **23505**: Duplicate entry (time slot already booked) - Choose different time
- **23503**: Foreign key violation - Contact support
- **PGRST116**: No rows returned - Item not found

### HTTP Error Codes

- **400**: Bad request - Check form inputs
- **401**: Unauthorized - Sign in required
- **403**: Forbidden - Insufficient permissions
- **404**: Not found - Resource doesn't exist
- **500**: Server error - Contact support
- **503**: Service unavailable - Try again later

---

## Getting Help

If you encounter an error not listed here:

1. **Take a screenshot** of the error message
2. **Note what you were doing** when the error occurred
3. **Check the browser console** (F12) for additional details
4. **Contact support** with all the above information

**Support Channels:**
- Email: support@dentalcareconnect.com
- Phone: [Your support number]
- Live chat: Available on the website
- Help Center: [Your help center URL]

**For urgent issues:**
- Call the clinic directly for same-day appointments
- Use emergency contact for after-hours dental emergencies
