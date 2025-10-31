# BookingForm Component

## Overview

The `BookingForm` component is a comprehensive appointment booking form designed for the dental care platform. It allows patients to book appointments with dentists by providing their information, selecting a date and time, and choosing a payment method.

## Features

✅ **Form Validation** - Uses React Hook Form with Zod schema validation
✅ **Date Picker** - Calendar component with past date restrictions
✅ **Time Slot Selection** - Dropdown with 30-minute intervals (9 AM - 5 PM)
✅ **Payment Methods** - Radio buttons for Cash or Stripe payment
✅ **Loading States** - Visual feedback during form submission
✅ **Error Handling** - Displays validation and API errors
✅ **Auto-fill** - Dentist information automatically populated
✅ **Responsive Design** - Works on all screen sizes
✅ **Accessible** - Follows WCAG accessibility guidelines

## Installation

The component is already set up with all required dependencies:

- `react-hook-form` - Form state management
- `@hookform/resolvers` - Zod resolver for validation
- `zod` - Schema validation
- `date-fns` - Date formatting
- `lucide-react` - Icons
- All shadcn/ui components (Button, Input, Calendar, etc.)

## Usage

### Basic Example

```tsx
import { BookingForm } from "@/components/BookingForm";

function MyPage() {
  return (
    <BookingForm
      dentistId="1"
      dentistName="Dr. Sarah Johnson"
      dentistEmail="dr.sarah.johnson@dental.com"
    />
  );
}
```

### With Success Callback

```tsx
import { BookingForm } from "@/components/BookingForm";
import { useNavigate } from "react-router-dom";

function MyPage() {
  const navigate = useNavigate();

  const handleSuccess = (appointmentId: string) => {
    console.log("Appointment booked:", appointmentId);
    navigate(`/confirmation/${appointmentId}`);
  };

  return (
    <BookingForm
      dentistId="1"
      dentistName="Dr. Sarah Johnson"
      dentistEmail="dr.sarah.johnson@dental.com"
      onSuccess={handleSuccess}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `dentistId` | `string` | Yes | Unique identifier for the dentist |
| `dentistName` | `string` | Yes | Full name of the dentist |
| `dentistEmail` | `string` | Yes | Email address of the dentist |
| `onSuccess` | `(appointmentId: string) => void` | No | Callback function called on successful booking |

## Form Fields

### 1. Patient Name
- **Type**: Text input
- **Validation**: Minimum 2 characters
- **Required**: Yes

### 2. Email
- **Type**: Email input
- **Validation**: Valid email format
- **Required**: Yes

### 3. Phone Number
- **Type**: Tel input
- **Validation**: Minimum 10 characters, valid phone format
- **Required**: Yes
- **Example**: +1 (555) 123-4567

### 4. Reason for Visit
- **Type**: Textarea
- **Validation**: Minimum 10 characters
- **Required**: Yes
- **Description**: Patient describes their dental concerns

### 5. Appointment Date
- **Type**: Date picker (Calendar)
- **Validation**: Cannot be in the past
- **Required**: Yes
- **Features**: 
  - Past dates are disabled
  - Calendar popup interface
  - Formatted display (e.g., "January 15, 2025")

### 6. Appointment Time
- **Type**: Select dropdown
- **Validation**: Must select a time slot
- **Required**: Yes
- **Options**: 9:00 AM - 5:00 PM (30-minute intervals)
- **Example slots**: 9:00 AM, 9:30 AM, 10:00 AM, etc.

### 7. Payment Method
- **Type**: Radio group
- **Validation**: Must select one option
- **Required**: Yes
- **Options**:
  - **Cash** - Pay at appointment
  - **Stripe** - Pay online with credit/debit card

## Validation Rules

The form uses Zod schema validation with the following rules:

```typescript
{
  patientName: min 2 characters
  patientEmail: valid email format
  phone: min 10 characters + valid phone regex
  reason: min 10 characters
  date: valid date, not in the past
  time: required selection
  paymentMethod: "stripe" or "cash"
}
```

## Time Slots

The component generates time slots from 9:00 AM to 5:00 PM with 30-minute intervals:

- 9:00 AM, 9:30 AM, 10:00 AM, 10:30 AM, ...
- ... 4:00 PM, 4:30 PM, 5:00 PM

## States

### Loading State
When the form is being submitted, the component shows:
- Disabled submit button
- Loading spinner
- "Booking Appointment..." text

### Error State
When validation or API errors occur:
- Field-level error messages below inputs
- General error message at the bottom of the form
- Red border on invalid fields

### Success State
When booking succeeds:
- Calls the `onSuccess` callback with appointment ID
- Resets the form to initial state

## Styling

The component uses:
- **Tailwind CSS** for styling
- **shadcn/ui** components for consistent design
- **Card** wrapper for clean presentation
- **Responsive** layout that adapts to screen size

## API Integration

Currently, the component includes a mock API call. To integrate with your backend:

1. Replace the mock API call in the `onSubmit` function
2. Import your API service
3. Handle the response appropriately

```tsx
// Example API integration
const onSubmit = async (data: BookingFormValues) => {
  setIsSubmitting(true);
  setError(null);

  try {
    const response = await appointmentsAPI.create({
      ...data,
      dentistId,
      dentistName,
      dentistEmail,
      date: format(data.date, "yyyy-MM-dd"),
    });

    if (onSuccess) {
      onSuccess(response.appointmentId);
    }

    form.reset();
  } catch (err) {
    setError(err.message);
  } finally {
    setIsSubmitting(false);
  }
};
```

## Accessibility

The component follows accessibility best practices:
- Proper label associations
- ARIA attributes
- Keyboard navigation support
- Focus management
- Screen reader friendly
- Error announcements

## Requirements Satisfied

This component satisfies the following requirements from the specification:

- ✅ 1.1 - Display booking form on dentist profile
- ✅ 1.2 - Form fields for patient information
- ✅ 1.3 - Auto-fill dentist information
- ✅ 1.4 - Validate required fields
- ✅ 1.5 - Email format validation
- ✅ 1.6 - Phone number validation
- ✅ 1.7 - Past date restrictions
- ✅ 1.8 - Display error messages
- ✅ 2.1 - Payment method radio buttons
- ✅ 2.2 - Cash payment option
- ✅ 2.3 - Stripe payment option
- ✅ 2.4 - Disable submit during processing
- ✅ 2.5 - Indicate selected payment method
- ✅ 11.1 - Calendar date picker
- ✅ 11.2 - Disable past dates
- ✅ 11.3 - Time picker/dropdown
- ✅ 11.4 - Show available time slots
- ✅ 11.5 - Display selected date/time clearly
- ✅ 14.1 - Loading indicator during submission
- ✅ 14.4 - Disable buttons during processing

## Next Steps

To complete the booking flow:

1. **Task 11**: Implement Stripe payment integration
2. **Task 12**: Create booking confirmation component
3. **Task 13**: Integrate into dentist profile page
4. **Backend**: Connect to appointments API endpoints

## Testing

To test the component:

1. Import and render the component
2. Fill out all required fields
3. Try submitting with invalid data (should show errors)
4. Try submitting with valid data (should call onSuccess)
5. Test date picker (past dates should be disabled)
6. Test time slot selection
7. Test payment method selection

## Support

For issues or questions about this component, refer to:
- Design document: `.kiro/specs/appointment-booking-payment/design.md`
- Requirements: `.kiro/specs/appointment-booking-payment/requirements.md`
- Usage examples: `src/components/BookingForm.example.tsx`
