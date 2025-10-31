# Patient Booking Guide

## How to Book an Appointment

### Step 1: Browse Available Dentists

1. Navigate to the **Dentists** page from the main navigation menu
2. Browse through the list of available dentists
3. Each dentist card displays:
   - Name and specialization
   - Star rating and experience
   - Profile photo
   - "View Profile" and "Book Now" buttons

### Step 2: View Dentist Profile (Optional)

Before booking, you can view detailed information about a dentist:

1. Click **"View Profile"** on any dentist card
2. The profile page shows:
   - Complete bio and background
   - Education and qualifications
   - Areas of expertise
   - Patient ratings and reviews
   - Available time slots (if configured)
   - Contact information

### Step 3: Start Booking Process

You can start booking in two ways:

**Option A: From Dentist List**
- Click **"Book Now"** on any dentist card

**Option B: From Dentist Profile**
- Click **"Book Appointment"** button on the profile page

### Step 4: Sign In (If Required)

If you're not already signed in:

1. You'll be redirected to the sign-in page
2. Sign in with your existing account, or
3. Create a new account by clicking **"Sign Up"**
4. After signing in, you'll return to the booking form

### Step 5: Fill Out Booking Form

Complete all required fields:

**Personal Information:**
- Full Name (auto-filled if available)
- Email Address (auto-filled if available)
- Phone Number

**Appointment Details:**
- Preferred Date (must be a future date)
- Preferred Time (select from available slots)
- Chief Complaint / Reason for Visit

**Payment Method:**
- **Credit/Debit Card (Stripe)**: Pay online securely
- **Cash**: Pay at the clinic during your appointment

### Step 6: Review and Submit

1. Review all entered information carefully
2. Ensure the date, time, and dentist are correct
3. Click **"Book Appointment"** to submit

### Step 7: Payment (If Paying Online)

If you selected Stripe payment:

1. You'll be redirected to a secure Stripe checkout page
2. Enter your card details
3. Complete the payment
4. You'll be redirected back to the confirmation page

### Step 8: Confirmation

After successful booking:

1. You'll see a confirmation page with:
   - Booking reference number (save this!)
   - Appointment date and time
   - Dentist name and contact
   - Payment status
2. You'll receive a confirmation email with:
   - Appointment details PDF attachment
   - Calendar invite (.ics file)
   - Cancellation policy information

### Step 9: Manage Your Appointment

Access your appointment from:

1. **Patient Dashboard**: View all your appointments
2. **Email**: Click the link in your confirmation email
3. Use your booking reference number for inquiries

## Viewing Dentist Profiles

### Accessing Profiles

**From Dentists List:**
1. Go to the Dentists page
2. Click "View Profile" on any dentist card

**Direct Link:**
- If you have a dentist's profile URL, navigate directly to it

### Profile Information

Each dentist profile includes:

**Header Section:**
- Profile photo
- Name and specialization
- Star rating (out of 5)
- Years of experience
- "Book Appointment" button

**About Section:**
- Professional biography
- Practice philosophy
- Special interests

**Education & Qualifications:**
- Dental school and degree
- Additional certifications
- Continuing education

**Expertise:**
- Areas of specialization
- Procedures offered
- Special skills

**Availability:**
- Available days and times (if configured)
- Booking calendar
- Next available appointment

**Contact Information:**
- Office phone number
- Office address
- Email (if public)

### Profile Features

**Loading States:**
- While loading, you'll see a spinner
- This typically takes 1-2 seconds

**Error Handling:**
- If a dentist is not found, you'll be redirected to the dentists list
- Error messages will guide you to the correct page

**Real-Time Data:**
- All profile information is loaded from the database
- Information is always current and accurate
- Availability is updated in real-time

## Tips for Successful Booking

### Before You Book

- **Create an account** in advance to speed up the booking process
- **Review dentist profiles** to find the best match for your needs
- **Check availability** on the dentist's profile before booking
- **Prepare your information**: Have your phone number and reason for visit ready

### Choosing a Date and Time

- **Book in advance**: Popular time slots fill up quickly
- **Consider your schedule**: Allow time for travel and the appointment
- **Morning appointments**: Often have shorter wait times
- **Avoid peak hours**: Mid-morning and early afternoon are usually less busy

### Payment Options

**Stripe (Online Payment):**
- ✅ Immediate confirmation
- ✅ Secure payment processing
- ✅ Digital receipt
- ✅ Easier cancellation refunds
- ⚠️ Requires credit/debit card

**Cash (Pay at Clinic):**
- ✅ No card required
- ✅ Pay after service
- ✅ Flexible payment
- ⚠️ Must bring exact amount or change
- ⚠️ Payment status shows "pending" until paid

### After Booking

- **Save your booking reference**: You'll need it for inquiries
- **Add to calendar**: Use the .ics file sent via email
- **Set a reminder**: Set an alarm 24 hours before your appointment
- **Prepare questions**: Write down any questions for your dentist
- **Arrive early**: Plan to arrive 10-15 minutes before your appointment

## Cancellation Policy

### How to Cancel

1. Go to your Patient Dashboard
2. Find the appointment you want to cancel
3. Click "Cancel Appointment"
4. Confirm the cancellation

### Cancellation Terms

- **More than 24 hours before**: Full refund (if paid online)
- **Less than 24 hours before**: 50% cancellation fee
- **No-show**: Full charge, no refund

### Refund Processing

- **Stripe payments**: Refunds processed within 5-7 business days
- **Cash payments**: No refund needed (payment not yet made)

## Need Help?

If you encounter any issues:

1. Check the [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md)
2. Review the [FAQ](./FAQ.md)
3. Contact support via the contact form
4. Email: support@dentalcareconnect.com
5. Phone: [Your support number]
