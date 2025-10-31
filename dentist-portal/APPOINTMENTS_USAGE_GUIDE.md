# Appointments Tab - Usage Guide

## Accessing the Appointments Tab

1. Log in to the Dentist Portal
2. Click on "Appointments" in the sidebar navigation
3. The appointments table will load automatically

## Features

### Viewing Appointments

The appointments table displays the following information:
- **Patient**: Name, email, and phone number
- **Date**: Appointment date in readable format (e.g., "Oct 24, 2025")
- **Time**: Appointment time in 12-hour format (e.g., "2:30 PM")
- **Reason**: Patient's reason for visit
- **Payment Method**: Stripe or Cash
- **Payment Status**: Pending, Paid, or Failed (with color-coded badges)
- **Status**: Pending, Confirmed, Completed, or Cancelled (with color-coded badges)

### Filtering Appointments

Use the filter buttons at the top to view specific appointment types:
- **All**: Shows all appointments
- **Pending**: Shows appointments awaiting confirmation
- **Confirmed**: Shows confirmed appointments
- **Completed**: Shows past completed appointments
- **Cancelled**: Shows cancelled appointments

Each filter button shows the count of appointments in that category.

### Sorting

Appointments are automatically sorted by date and time, with upcoming appointments shown first.

### Real-time Updates

The appointments list updates automatically when:
- A new patient books an appointment
- An appointment status changes
- An appointment is cancelled

You'll see a toast notification when a new appointment is received.

### Empty States

- If you have no appointments yet, you'll see a helpful message
- If your filters return no results, you'll see a "No appointments match your filters" message

## Status Badge Colors

- **Pending**: Gray badge - Appointment awaiting confirmation
- **Confirmed**: Blue badge - Appointment confirmed
- **Completed**: Outlined badge - Appointment completed
- **Cancelled**: Red badge - Appointment cancelled

## Payment Status Badge Colors

- **Pending**: Gray badge - Payment not yet received
- **Paid**: Blue badge - Payment successfully processed
- **Failed**: Red badge - Payment failed

## Tips

1. **Check regularly**: The list updates in real-time, so you'll always see the latest appointments
2. **Use filters**: Filter by status to focus on specific appointment types
3. **Contact patients**: Click on email addresses to send emails, or phone numbers to call (on mobile)
4. **Upcoming first**: The most urgent appointments are always at the top

## Troubleshooting

### Appointments not loading
- Check your internet connection
- Refresh the page
- Ensure you're logged in with the correct dentist account

### Real-time updates not working
- Check that your browser supports WebSockets
- Ensure you're not blocking Supabase connections
- Try refreshing the page

### Error messages
- If you see an error, try refreshing the page
- Check the browser console for more details
- Contact support if the issue persists

## Next Features (Coming Soon)

- Mark appointments as completed
- Reschedule appointments
- View detailed appointment information
- Add notes to appointments
- Export appointments to Excel/PDF
