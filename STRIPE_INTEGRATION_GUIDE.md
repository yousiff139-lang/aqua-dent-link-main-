# Stripe Payment Integration Guide

## Overview

This guide explains the Stripe payment integration for the appointment booking system. The integration allows patients to pay for appointments online using credit/debit cards through Stripe Checkout.

## Features Implemented

✅ **Stripe.js Integration**: Secure client-side Stripe library
✅ **Custom Hook**: `useStripeCheckout` for payment flow management
✅ **Appointment Service**: API communication layer for appointments and payments
✅ **Payment Flow**: Complete booking → payment → confirmation flow
✅ **Success/Cancel Pages**: Dedicated pages for payment outcomes
✅ **Error Handling**: User-friendly error messages and retry mechanisms
✅ **Loading States**: Visual feedback during payment processing
✅ **Toast Notifications**: Real-time feedback for user actions

## Architecture

### Components

1. **BookingForm** (`src/components/BookingForm.tsx`)
   - Main booking form with payment method selection
   - Integrates with Stripe checkout flow
   - Handles both cash and Stripe payments

2. **useStripeCheckout Hook** (`src/hooks/useStripeCheckout.ts`)
   - Manages Stripe checkout session creation
   - Handles redirect to Stripe Checkout
   - Provides loading and error states

3. **Appointment Service** (`src/services/appointmentService.ts`)
   - API communication for appointments
   - Creates checkout sessions
   - Error handling and response parsing

4. **Payment Pages**
   - `PaymentSuccess.tsx`: Shown after successful payment
   - `PaymentCancel.tsx`: Shown when payment is cancelled

## Environment Variables

Add these to your `.env` file:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# Backend API URL
VITE_API_URL=http://localhost:3000
```

### Getting Stripe Keys

1. Sign up at [stripe.com](https://stripe.com)
2. Go to Developers → API Keys
3. Copy your **Publishable key** (starts with `pk_test_` for test mode)
4. Add it to your `.env` file

## Payment Flow

### 1. User Selects Payment Method

```typescript
// In BookingForm
<RadioGroup>
  <RadioGroupItem value="cash" />  // Pay at appointment
  <RadioGroupItem value="stripe" /> // Pay online
</RadioGroup>
```

### 2. Form Submission

When user submits the form:

```typescript
// Create appointment first
const response = await appointmentService.createAppointment(appointmentData);
const appointmentId = response.data.appointmentId;

// If Stripe payment selected
if (paymentMethod === "stripe") {
  await initiateCheckout({
    appointmentId,
    amount: 5000, // $50.00 in cents
    currency: "usd",
    dentistName,
    patientEmail,
    appointmentDate,
    appointmentTime,
  });
}
```

### 3. Stripe Checkout Session

The `useStripeCheckout` hook:

1. Loads Stripe.js library
2. Calls backend API to create checkout session
3. Redirects user to Stripe Checkout page

```typescript
// Backend creates session with success/cancel URLs
const session = await stripe.checkout.sessions.create({
  success_url: 'http://localhost:5174/payment/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'http://localhost:5174/payment/cancel',
  // ... other parameters
});
```

### 4. Payment Processing

- User enters payment details on Stripe's secure page
- Stripe processes the payment
- Stripe redirects back to your app

### 5. Return Handling

**Success**: User redirected to `/payment/success`
- Shows confirmation message
- Displays transaction details
- Links to view appointments or go home

**Cancel**: User redirected to `/payment/cancel`
- Shows cancellation message
- Provides option to try again
- Explains what happened

## Backend Requirements

The frontend expects these backend endpoints:

### POST /api/appointments

Create a new appointment.

**Request:**
```json
{
  "patientName": "John Doe",
  "patientEmail": "john@example.com",
  "phone": "+1234567890",
  "dentistEmail": "dr.smith@dental.com",
  "dentistName": "Dr. Smith",
  "reason": "Regular checkup",
  "date": "2025-11-01",
  "time": "10:00",
  "paymentMethod": "stripe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "appointmentId": "apt_123456",
    "status": "pending",
    "paymentStatus": "pending"
  }
}
```

### POST /api/payments/create-checkout-session

Create a Stripe checkout session.

**Request:**
```json
{
  "appointmentId": "apt_123456",
  "amount": 5000,
  "currency": "usd",
  "dentistName": "Dr. Smith",
  "patientEmail": "john@example.com",
  "appointmentDate": "2025-11-01",
  "appointmentTime": "10:00"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_123456",
    "url": "https://checkout.stripe.com/pay/cs_test_123456"
  }
}
```

## Error Handling

### Frontend Error Handling

1. **Validation Errors**: Shown inline on form fields
2. **API Errors**: Displayed in error banner and toast notifications
3. **Stripe Errors**: Caught and displayed with user-friendly messages
4. **Network Errors**: Retry mechanisms and clear error messages

### Error Types

```typescript
// Validation error
"Please enter a valid email address."

// API error
"Failed to create appointment. Please try again."

// Stripe error
"Stripe failed to load. Please check your internet connection."

// Payment error
"Payment failed. Please check your card details and try again."
```

## Testing

### Test Mode

Use Stripe test cards in test mode:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Auth**: `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any postal code.

### Testing Flow

1. Fill out booking form
2. Select "Credit/Debit Card" payment method
3. Click "Continue to Payment"
4. Use test card on Stripe Checkout
5. Verify redirect to success page
6. Check appointment was created with "paid" status

### Testing Cancellation

1. Start booking process
2. Select Stripe payment
3. Click "Continue to Payment"
4. Close Stripe Checkout window or click back
5. Verify redirect to cancel page

## Configuration

### Payment Amount

Currently hardcoded to $50.00. To make it configurable:

```typescript
// In BookingForm.tsx
const APPOINTMENT_FEE = 5000; // $50.00 in cents

// Or from environment
const APPOINTMENT_FEE = parseInt(import.meta.env.VITE_APPOINTMENT_FEE || '5000');
```

### Success/Cancel URLs

URLs are configured in the backend when creating checkout session:

```typescript
// Backend configuration
const session = await stripe.checkout.sessions.create({
  success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
});
```

## Security Considerations

1. **Never expose secret keys**: Only use publishable key in frontend
2. **Validate on backend**: Always verify payment status on backend
3. **Use HTTPS**: Required for production Stripe integration
4. **Webhook verification**: Backend must verify Stripe webhook signatures
5. **Idempotency**: Handle duplicate webhook events properly

## Troubleshooting

### Stripe Not Loading

**Problem**: "Stripe failed to load" error

**Solutions**:
- Check internet connection
- Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set correctly
- Check browser console for errors
- Ensure Stripe.js is not blocked by ad blockers

### Payment Not Processing

**Problem**: Stuck on "Redirecting to payment..."

**Solutions**:
- Check backend API is running
- Verify API URL in `.env` is correct
- Check browser console for API errors
- Verify Stripe keys are valid

### Redirect Not Working

**Problem**: Not redirected after payment

**Solutions**:
- Check success/cancel URLs in backend
- Verify routes are registered in `App.tsx`
- Check for JavaScript errors in console

## Production Checklist

Before going live:

- [ ] Replace test Stripe keys with live keys
- [ ] Update success/cancel URLs to production domain
- [ ] Enable HTTPS on all domains
- [ ] Set up Stripe webhook endpoint
- [ ] Test with real payment methods
- [ ] Configure proper error logging
- [ ] Set up payment monitoring
- [ ] Add payment receipt emails
- [ ] Implement refund handling
- [ ] Add terms and conditions

## Next Steps

1. **Email Notifications**: Send confirmation emails after payment
2. **Receipt Generation**: Provide downloadable receipts
3. **Refund Support**: Allow cancellations with refunds
4. **Multiple Currencies**: Support international payments
5. **Saved Cards**: Allow users to save payment methods
6. **Subscription Plans**: Support recurring payments
7. **Payment History**: Show transaction history to users

## Support

For issues or questions:
- Check Stripe documentation: https://stripe.com/docs
- Review Stripe.js reference: https://stripe.com/docs/js
- Contact support: support@yourdomain.com
