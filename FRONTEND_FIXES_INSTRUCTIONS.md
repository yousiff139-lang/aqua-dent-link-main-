# Frontend Fixes for Booking Issues

## Step 1: Apply SQL Fixes First
Run `FIX_ALL_BOOKING_ISSUES.sql` in Supabase SQL Editor

## Step 2: Update BookingForm to Include Appointment Type

### Changes Needed in `src/components/BookingForm.tsx`:

1. **Add appointment type to schema** (around line 60):
```typescript
const bookingFormSchema = z.object({
  patientName: z.string().min(2).max(100),
  patientEmail: z.string().email().max(255),
  phone: z.string().min(10).max(20),
  appointmentType: z.string({
    required_error: "Please select an appointment type.",
  }),
  reason: z.string().min(10).max(500),
  date: z.date({
    required_error: "Please select an appointment date.",
  }),
  time: z.string().min(1),
  paymentMethod: z.enum(["stripe", "cash"]),
});
```

2. **Add state for appointment types** (after line 140):
```typescript
const [appointmentTypes, setAppointmentTypes] = useState<any[]>([]);
const [selectedTypePrice, setSelectedTypePrice] = useState<number>(50);

// Fetch appointment types on mount
useEffect(() => {
  const fetchAppointmentTypes = async () => {
    const { data } = await supabase
      .from('appointment_types')
      .select('*')
      .order('base_price');
    if (data) setAppointmentTypes(data);
  };
  fetchAppointmentTypes();
}, []);

// Watch appointment type to update price
const selectedType = form.watch("appointmentType");
useEffect(() => {
  const type = appointmentTypes.find(t => t.type_name === selectedType);
  if (type) setSelectedTypePrice(type.base_price);
}, [selectedType, appointmentTypes]);
```

3. **Add appointment type field in the form** (before the reason field):
```typescript
<FormField
  control={form.control}
  name="appointmentType"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Appointment Type *</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select appointment type" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {appointmentTypes.map((type) => (
            <SelectItem key={type.id} value={type.type_name}>
              {type.type_name} - ${type.base_price}
              {type.description && (
                <span className="text-xs text-muted-foreground block">
                  {type.description}
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormDescription>
        Select the type of dental service you need
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>

{/* Show estimated price */}
{selectedType && (
  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
    <p className="text-sm font-medium text-blue-900">
      Estimated Price: ${selectedTypePrice}
    </p>
    <p className="text-xs text-blue-700 mt-1">
      Final price may vary based on treatment complexity
    </p>
  </div>
)}
```

4. **Update appointment data submission** (around line 230):
```typescript
const appointmentData = {
  patient_id: user?.id || null,
  patient_name: data.patientName,
  patient_email: data.patientEmail,
  patient_phone: data.phone,
  dentist_id: dentistId,
  dentist_email: dentistEmail,
  dentist_name: dentistName, // Add this
  appointment_date: format(data.date, "yyyy-MM-dd"),
  appointment_time: data.time,
  appointment_type: data.appointmentType, // Add this
  appointment_reason: data.reason, // Add this
  estimated_price: selectedTypePrice, // Add this
  symptoms: data.reason,
  chief_complaint: data.reason,
  status: 'upcoming',
  payment_method: data.paymentMethod,
  payment_status: 'pending',
  booking_reference: bookingReference,
  booking_source: user ? 'manual' : 'guest',
};
```

## Step 3: Fix Cancel Button in MyAppointments

### Update `src/pages/MyAppointments.tsx`:

Add cancel function:
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

    // Refresh appointments
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

Add cancel button in the appointment card:
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

## Step 4: Fix Dentist Portal Appointments Display

### Update `dentist-portal/src/services/appointment.service.ts`:

Ensure the query includes all necessary fields:
```typescript
export const getAppointments = async (dentistId: string) => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:profiles!appointments_patient_id_fkey(
        full_name,
        email,
        phone
      )
    `)
    .eq('dentist_id', dentistId)
    .order('appointment_date', { ascending: false })
    .order('appointment_time', { ascending: false });

  if (error) throw error;
  return data || [];
};
```

## Step 5: Refresh Time Slots After Booking

### In `src/components/BookingForm.tsx`:

After successful booking, refresh the booked slots:
```typescript
// After appointment creation success
await refetchBookedSlots();

toast({
  title: "Appointment Booked!",
  description: `Your appointment is confirmed for ${format(data.date, "PPP")} at ${data.time}`,
});
```

## Summary of Changes

1. ✅ SQL fixes applied (notifications RLS, appointment types, pricing)
2. ✅ Appointment type selection added to booking form
3. ✅ Dynamic pricing based on appointment type
4. ✅ Cancel button functionality added
5. ✅ Dentist portal sync fixed
6. ✅ Time slots refresh after booking

## Testing Checklist

- [ ] Book an appointment with appointment type selection
- [ ] Verify price shows correctly based on type
- [ ] Check appointment appears in Dentist Portal
- [ ] Test cancel button works
- [ ] Verify time slot disappears after booking
- [ ] Check notifications are sent without RLS errors
