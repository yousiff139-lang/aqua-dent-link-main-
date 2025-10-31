# Notification System Implementation

## Overview

The notification system has been successfully implemented for the chatbot booking system. It provides both in-app notifications and email notification capabilities for patients and dentists.

## Components Implemented

### 1. Database Schema

**Tables Created:**
- `notifications` - Stores in-app notifications for users
- `user_notification_preferences` - Stores user preferences for notification settings

**Migration File:** `supabase/migrations/20251025130000_create_notifications_table.sql`

**Features:**
- Row-level security (RLS) policies for data protection
- Automatic timestamp updates
- Default preferences creation for new users
- Indexes for optimized queries

### 2. Backend - Edge Function

**File:** `supabase/functions/send-notification/index.ts`

**Functions:**
- `sendBookingConfirmation()` - Sends confirmation to patients after booking
- `sendNewBookingAlert()` - Alerts dentists about new bookings
- `sendCancellationNotification()` - Notifies both parties when appointments are cancelled

**Features:**
- JWT authentication verification
- Fetches appointment, dentist, and patient data
- Creates in-app notifications
- Supports email templates (ready for email service integration)
- Error handling and logging

### 3. Frontend - Notification Service

**File:** `src/services/notificationService.ts`

**Functions:**
- `sendBookingConfirmation(appointmentId)` - Trigger booking confirmation
- `sendNewBookingAlert(appointmentId)` - Trigger new booking alert
- `sendCancellationNotification(appointmentId)` - Trigger cancellation notification
- `getUserNotifications(limit)` - Fetch user notifications
- `getUnreadNotificationCount()` - Get count of unread notifications
- `markNotificationAsRead(notificationId)` - Mark single notification as read
- `markAllNotificationsAsRead()` - Mark all notifications as read
- `deleteNotification(notificationId)` - Delete a notification
- `getUserNotificationPreferences()` - Get user preferences
- `updateNotificationPreferences(preferences)` - Update user preferences
- `subscribeToNotifications(userId, callback)` - Real-time notification subscription

### 4. UI Components

#### NotificationBell Component
**File:** `src/components/Notifications/NotificationBell.tsx`

**Features:**
- Bell icon with unread count badge
- Popover dropdown for notification list
- Real-time updates via Supabase subscriptions
- Auto-refresh unread count

#### NotificationList Component
**File:** `src/components/Notifications/NotificationList.tsx`

**Features:**
- Scrollable list of notifications
- Visual distinction for unread notifications
- Mark as read functionality
- Mark all as read button
- Delete notifications
- Relative timestamps (e.g., "2 hours ago")
- Type-specific icons (✅ for confirmations, 📅 for bookings, etc.)

#### NotificationPreferences Component
**File:** `src/components/Notifications/NotificationPreferences.tsx`

**Features:**
- Toggle in-app notifications
- Master email notification switch
- Individual email notification preferences:
  - Booking confirmations
  - New booking alerts (for dentists)
  - Cancellation notifications
  - Appointment reminders
- Save preferences functionality
- Loading and error states

### 5. Integration with Booking Service

**File:** `src/services/bookingService.ts`

**Integrated Notifications:**
- Booking confirmation sent after `confirmBooking()` completes
- New booking alert sent to dentist after booking
- Cancellation notification sent after `cancelAppointment()` completes

**Error Handling:**
- Notifications are sent asynchronously
- Errors don't fail the booking/cancellation process
- Errors are logged for debugging

### 6. Profile Settings Integration

**File:** `src/pages/ProfileSettings.tsx`

**Added:**
- Notification preferences section at the bottom of the profile settings page
- Users can manage their notification preferences alongside profile information

## Notification Types

1. **booking_confirmation** - Sent to patients when appointment is confirmed
2. **new_booking** - Sent to dentists when they receive a new appointment
3. **appointment_cancelled** - Sent to both patient and dentist when appointment is cancelled
4. **appointment_reminder** - (Ready for future implementation)
5. **system** - (Ready for system-wide announcements)

## Usage

### Sending Notifications

```typescript
import { 
  sendBookingConfirmation, 
  sendNewBookingAlert, 
  sendCancellationNotification 
} from '@/services/notificationService';

// After booking confirmation
await sendBookingConfirmation(appointmentId);

// After new booking
await sendNewBookingAlert(appointmentId);

// After cancellation
await sendCancellationNotification(appointmentId);
```

### Displaying Notifications

```tsx
import { NotificationBell } from '@/components/Notifications';

// In your navbar or header
<NotificationBell />
```

### Managing Preferences

```tsx
import { NotificationPreferences } from '@/components/Notifications';

// In settings page
<NotificationPreferences />
```

### Real-time Subscriptions

```typescript
import { subscribeToNotifications } from '@/services/notificationService';

// Subscribe to notifications
const unsubscribe = subscribeToNotifications(userId, (notification) => {
  console.log('New notification:', notification);
  // Handle new notification (e.g., show toast, update UI)
});

// Cleanup
unsubscribe();
```

## Database Schema Details

### notifications Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| type | TEXT | Notification type (enum) |
| title | TEXT | Notification title |
| message | TEXT | Notification message |
| data | JSONB | Additional data (appointment details, etc.) |
| read | BOOLEAN | Read status |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### user_notification_preferences Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users (unique) |
| email_notifications | BOOLEAN | Master email switch |
| booking_confirmation_email | BOOLEAN | Booking confirmation emails |
| new_booking_email | BOOLEAN | New booking alert emails |
| cancellation_email | BOOLEAN | Cancellation notification emails |
| reminder_email | BOOLEAN | Reminder emails |
| in_app_notifications | BOOLEAN | In-app notifications |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

## Security

### Row-Level Security (RLS)

- Users can only view their own notifications
- Users can only update/delete their own notifications
- Service role can insert notifications (for system-generated notifications)
- Users can only view/update their own preferences

### Authentication

- All edge function calls require JWT authentication
- Service role key used for database operations in edge functions
- User authentication verified before any notification operations

## Future Enhancements

1. **Email Integration**
   - Integrate with email service (SendGrid, AWS SES, etc.)
   - Use email templates for professional formatting
   - Track email delivery status

2. **SMS Notifications**
   - Add SMS notification option
   - Integrate with Twilio or similar service
   - Add phone number verification

3. **Push Notifications**
   - Implement web push notifications
   - Add mobile app push notifications
   - Request notification permissions

4. **Notification Scheduling**
   - Schedule appointment reminders (24 hours before, 1 hour before)
   - Implement background job queue
   - Add cron jobs for scheduled notifications

5. **Notification History**
   - Add pagination for notification list
   - Implement notification archive
   - Add search and filter capabilities

6. **Analytics**
   - Track notification delivery rates
   - Monitor user engagement with notifications
   - A/B test notification content

## Testing

### Manual Testing Steps

1. **Booking Confirmation:**
   - Book an appointment through the chatbot
   - Check for notification in NotificationBell
   - Verify notification appears in database

2. **New Booking Alert:**
   - Book appointment as patient
   - Login as dentist
   - Check for new booking notification

3. **Cancellation Notification:**
   - Cancel an appointment
   - Check both patient and dentist receive notifications

4. **Preferences:**
   - Go to Profile Settings
   - Toggle notification preferences
   - Verify preferences are saved
   - Test that notifications respect preferences

5. **Real-time Updates:**
   - Open app in two browser windows
   - Trigger notification in one window
   - Verify notification appears in real-time in other window

## Troubleshooting

### Notifications Not Appearing

1. Check if user is authenticated
2. Verify RLS policies are enabled
3. Check browser console for errors
4. Verify Supabase real-time is enabled for the project

### Edge Function Errors

1. Check edge function logs in Supabase dashboard
2. Verify environment variables are set (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
3. Test edge function directly using Supabase dashboard

### Preferences Not Saving

1. Check if user_notification_preferences table exists
2. Verify RLS policies allow user to insert/update
3. Check for unique constraint violations

## Requirements Satisfied

✅ **Requirement 3.4** - Cancellation notifications implemented
✅ **Requirement 8.1** - Booking confirmation notifications implemented
✅ **Requirement 8.2** - Notification preferences with opt-in/opt-out functionality
✅ **Requirement 8.3** - New booking alerts for dentists implemented

## Files Created/Modified

### Created:
- `supabase/functions/send-notification/index.ts`
- `supabase/migrations/20251025130000_create_notifications_table.sql`
- `src/services/notificationService.ts`
- `src/components/Notifications/NotificationBell.tsx`
- `src/components/Notifications/NotificationList.tsx`
- `src/components/Notifications/NotificationPreferences.tsx`
- `src/components/Notifications/index.ts`
- `NOTIFICATION_SYSTEM_IMPLEMENTATION.md`

### Modified:
- `src/services/bookingService.ts` - Added notification calls
- `src/pages/ProfileSettings.tsx` - Added notification preferences section

## Conclusion

The notification system is fully implemented and ready for use. It provides a solid foundation for keeping users informed about their appointments and can be easily extended with additional notification types and delivery methods in the future.
