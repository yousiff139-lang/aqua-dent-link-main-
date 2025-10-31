# Booking System Test Guide

## Quick Test Checklist

After applying the migration, run through these tests to verify everything works.

## 🧪 Test 1: Database Connection

Open browser console (F12) on your site and run:

```javascript
// Test 1: Check Supabase connection
const testConnection = async () => {
  const { data, error } = await window.supabase
    .from('appointments')
    .select('count');
  
  if (error) {
    console.error('❌ Connection failed:', error);
  } else {
    console.log('✅ Connected to database');
  }
};

testConnection();
```

## 🧪 Test 2: Public Booking (No Auth Required)

```javascript
// Test 2: Create appointment without authentication
const testPublicBooking = async () => {
  const testData = {
    patient_id: '00000000-0000-0000-0000-000000000000',
    patient_name: 'Test Patient',
    patient_email: 'test@example.com',
    patient_phone: '+1234567890',
    dentist_email: 'dr.michaelchen@clinic.com',
    dentist_name: 'Dr. Michael Chen',
    appointment_date: '2025-11-15',
    appointment_time: '10:00',
    symptoms: 'Test booking - regular checkup',
    chief_complaint: 'Test booking',
    status: 'pending',
    payment_method: 'cash',
    payment_status: 'pending',
    booking_reference: 'TEST' + Date.now()
  };
  
  const { data, error } = await window.supabase
    .from('appointments')
    .insert(testData)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Public booking failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
  } else {
    console.log('✅ Public booking successful!');
    console.log('Appointment ID:', data.id);
    console.log('Booking Reference:', data.booking_reference);
    
    // Clean up test data
    await window.supabase
      .from('appointments')
      .delete()
      .eq('id', data.id);
    console.log('🧹 Test data cleaned up');
  }
};

testPublicBooking();
```

## 🧪 Test 3: Authenticated Booking

```javascript
// Test 3: Create appointment as authenticated user
const testAuthenticatedBooking = async () => {
  // Check if user is signed in
  const { data: { user } } = await window.supabase.auth.getUser();
  
  if (!user) {
    console.error('❌ Not signed in. Please sign in first.');
    return;
  }
  
  console.log('✅ Signed in as:', user.email);
  
  const testData = {
    patient_id: user.id,
    patient_name: 'Test Patient',
    patient_email: user.email,
    patient_phone: '+1234567890',
    dentist_email: 'dr.michaelchen@clinic.com',
    dentist_name: 'Dr. Michael Chen',
    appointment_date: '2025-11-20',
    appointment_time: '14:00',
    symptoms: 'Test authenticated booking',
    chief_complaint: 'Test',
    status: 'upcoming',
    payment_method: 'cash',
    payment_status: 'pending',
    booking_reference: 'AUTH' + Date.now()
  };
  
  const { data, error } = await window.supabase
    .from('appointments')
    .insert(testData)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Authenticated booking failed:', error);
  } else {
    console.log('✅ Authenticated booking successful!');
    console.log('Appointment:', data);
    
    // Test: Can user view their own appointment?
    const { data: viewData, error: viewError } = await window.supabase
      .from('appointments')
      .select('*')
      .eq('id', data.id)
      .single();
    
    if (viewError) {
      console.error('❌ Cannot view own appointment:', viewError);
    } else {
      console.log('✅ Can view own appointment');
    }
    
    // Clean up
    const { error: deleteError } = await window.supabase
      .from('appointments')
      .delete()
      .eq('id', data.id);
    
    if (deleteError) {
      console.error('❌ Cannot delete appointment:', deleteError);
    } else {
      console.log('🧹 Test data cleaned up');
    }
  }
};

testAuthenticatedBooking();
```

## 🧪 Test 4: View Own Appointments

```javascript
// Test 4: Fetch user's appointments
const testViewAppointments = async () => {
  const { data: { user } } = await window.supabase.auth.getUser();
  
  if (!user) {
    console.error('❌ Not signed in');
    return;
  }
  
  const { data, error } = await window.supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', user.id)
    .order('appointment_date', { ascending: true });
  
  if (error) {
    console.error('❌ Failed to fetch appointments:', error);
  } else {
    console.log('✅ Fetched appointments:', data.length);
    console.table(data.map(apt => ({
      id: apt.id.substring(0, 8),
      date: apt.appointment_date,
      time: apt.appointment_time,
      dentist: apt.dentist_name,
      status: apt.status
    })));
  }
};

testViewAppointments();
```

## 🧪 Test 5: Booking Form Integration

### Manual Test Steps:

1. **Navigate to Dentists Page**
   - Go to `/dentists`
   - Verify dentists load from database
   - Check for any console errors

2. **Select a Dentist**
   - Click "View Profile" on any dentist
   - Verify profile loads correctly
   - Check dentist image, name, specialization display

3. **Fill Booking Form**
   - Scroll to booking form
   - Fill in all required fields:
     - Full Name
     - Email
     - Phone Number
     - Reason for Visit (min 10 characters)
     - Select future date
     - Select time slot
     - Choose payment method

4. **Submit Booking**
   - Click "Book Appointment" or "Continue to Payment"
   - Watch browser console for errors
   - Verify no "relation does not exist" errors
   - Verify no "permission denied" errors

5. **Check Confirmation**
   - Verify booking confirmation displays
   - Check booking reference is shown
   - Verify appointment details are correct

6. **Check Dashboard**
   - Navigate to `/dashboard`
   - Verify appointment appears in list
   - Check appointment details are correct

## 🧪 Test 6: Dentist Dashboard

If you have dentist access:

```javascript
// Test 6: Dentist viewing their appointments
const testDentistView = async () => {
  const { data: { user } } = await window.supabase.auth.getUser();
  
  if (!user) {
    console.error('❌ Not signed in');
    return;
  }
  
  // Check if user is a dentist
  const { data: roleData } = await window.supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'dentist')
    .single();
  
  if (!roleData) {
    console.log('ℹ️  User is not a dentist');
    return;
  }
  
  console.log('✅ User is a dentist');
  
  // Fetch dentist's appointments
  const { data, error } = await window.supabase
    .from('appointments')
    .select('*')
    .eq('dentist_email', user.email)
    .order('appointment_date', { ascending: true });
  
  if (error) {
    console.error('❌ Failed to fetch dentist appointments:', error);
  } else {
    console.log('✅ Fetched dentist appointments:', data.length);
    console.table(data.map(apt => ({
      id: apt.id.substring(0, 8),
      patient: apt.patient_name,
      date: apt.appointment_date,
      time: apt.appointment_time,
      status: apt.status,
      payment: apt.payment_status
    })));
  }
};

testDentistView();
```

## 🧪 Test 7: RLS Policy Verification

```javascript
// Test 7: Verify RLS policies work correctly
const testRLSPolicies = async () => {
  console.log('Testing RLS Policies...');
  
  // Test 1: Can create appointment as anon
  const { error: anonError } = await window.supabase
    .from('appointments')
    .insert({
      patient_id: '00000000-0000-0000-0000-000000000000',
      patient_name: 'RLS Test',
      patient_email: 'rls@test.com',
      patient_phone: '+1234567890',
      dentist_email: 'test@test.com',
      appointment_date: '2025-12-01',
      appointment_time: '10:00',
      symptoms: 'RLS test',
      status: 'pending',
      payment_method: 'cash',
      payment_status: 'pending',
      booking_reference: 'RLS' + Date.now()
    });
  
  if (anonError) {
    console.error('❌ Anonymous insert failed:', anonError.message);
  } else {
    console.log('✅ Anonymous insert works');
  }
  
  // Test 2: Can view only own appointments
  const { data: { user } } = await window.supabase.auth.getUser();
  
  if (user) {
    const { data: allData } = await window.supabase
      .from('appointments')
      .select('count');
    
    const { data: ownData } = await window.supabase
      .from('appointments')
      .select('count')
      .eq('patient_id', user.id);
    
    console.log('✅ RLS filtering works (can only see own appointments)');
  }
};

testRLSPolicies();
```

## 🧪 Test 8: Error Handling

```javascript
// Test 8: Verify error handling
const testErrorHandling = async () => {
  console.log('Testing error handling...');
  
  // Test 1: Missing required fields
  const { error: error1 } = await window.supabase
    .from('appointments')
    .insert({
      patient_name: 'Test'
      // Missing required fields
    });
  
  if (error1) {
    console.log('✅ Validation works (missing fields rejected)');
  }
  
  // Test 2: Invalid date format
  const { error: error2 } = await window.supabase
    .from('appointments')
    .insert({
      patient_id: '00000000-0000-0000-0000-000000000000',
      patient_name: 'Test',
      patient_email: 'test@test.com',
      patient_phone: '+1234567890',
      dentist_email: 'test@test.com',
      appointment_date: 'invalid-date',
      appointment_time: '10:00',
      symptoms: 'Test',
      status: 'pending',
      payment_method: 'cash',
      payment_status: 'pending'
    });
  
  if (error2) {
    console.log('✅ Date validation works');
  }
  
  // Test 3: Invalid status
  const { error: error3 } = await window.supabase
    .from('appointments')
    .insert({
      patient_id: '00000000-0000-0000-0000-000000000000',
      patient_name: 'Test',
      patient_email: 'test@test.com',
      patient_phone: '+1234567890',
      dentist_email: 'test@test.com',
      appointment_date: '2025-12-01',
      appointment_time: '10:00',
      symptoms: 'Test',
      status: 'invalid_status', // Invalid
      payment_method: 'cash',
      payment_status: 'pending'
    });
  
  if (error3) {
    console.log('✅ Status constraint works');
  }
};

testErrorHandling();
```

## 📊 Expected Results

### All Tests Passing:
```
✅ Connected to database
✅ Public booking successful!
✅ Authenticated booking successful!
✅ Can view own appointment
✅ Fetched appointments: X
✅ Anonymous insert works
✅ RLS filtering works
✅ Validation works
✅ Date validation works
✅ Status constraint works
```

### If Tests Fail:

1. **"relation does not exist"**
   - Migration not applied
   - Apply migration in Supabase SQL Editor

2. **"permission denied"**
   - RLS policies not set up
   - Check policies with verification script

3. **"violates check constraint"**
   - Invalid status or payment_method value
   - Check allowed values in migration

4. **"null value in column"**
   - Missing required field
   - Check all required fields are provided

## 🔧 Debugging Commands

```javascript
// Check current user
const { data: { user } } = await window.supabase.auth.getUser();
console.log('Current user:', user);

// Check Supabase connection
console.log('Supabase URL:', window.supabase.supabaseUrl);
console.log('Supabase Key:', window.supabase.supabaseKey.substring(0, 20) + '...');

// List all tables (requires admin access)
const { data: tables } = await window.supabase
  .from('information_schema.tables')
  .select('table_name')
  .eq('table_schema', 'public');
console.log('Tables:', tables);
```

## ✅ Success Criteria

Your booking system is working when:

- ✅ All 8 tests pass without errors
- ✅ Booking form submits successfully
- ✅ Appointments appear in dashboard
- ✅ No console errors during booking
- ✅ Confirmation page displays correctly
- ✅ RLS policies allow appropriate access
- ✅ Validation prevents invalid data

---

**Run these tests after applying the migration to verify everything works!**
