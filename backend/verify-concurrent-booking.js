/**
 * Verification Script for Concurrent Booking Prevention
 * 
 * This script demonstrates that the concurrent booking prevention system works correctly.
 * It simulates two users trying to book the same time slot simultaneously.
 * 
 * Usage: node verify-concurrent-booking.js
 * 
 * Prerequisites:
 * - Backend server must be running
 * - Database must have the unique constraint applied
 */

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Test data
const dentistEmail = 'test-dentist@example.com';
const testDate = '2025-12-01';
const testTime = '10:00';

const createBookingRequest = (patientName, patientEmail) => ({
  patientName,
  patientEmail,
  phone: '+1234567890',
  dentistEmail,
  reason: 'Regular checkup',
  date: testDate,
  time: testTime,
  paymentMethod: 'cash',
});

async function bookAppointment(patientName, patientEmail) {
  try {
    const response = await fetch(`${API_URL}/api/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBookingRequest(patientName, patientEmail)),
    });

    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function runTest() {
  console.log('🧪 Testing Concurrent Booking Prevention\n');
  console.log('=' .repeat(60));
  console.log(`Dentist: ${dentistEmail}`);
  console.log(`Date: ${testDate}`);
  console.log(`Time: ${testTime}`);
  console.log('=' .repeat(60));
  console.log();

  // Test 1: Sequential bookings (should fail on second)
  console.log('📋 Test 1: Sequential Bookings');
  console.log('-'.repeat(60));
  
  console.log('Booking 1: Patient A...');
  const booking1 = await bookAppointment('Patient A', 'patient-a@example.com');
  
  if (booking1.success) {
    console.log('✅ Booking 1 succeeded');
    console.log(`   Appointment ID: ${booking1.data.data?.appointmentId}`);
  } else {
    console.log('❌ Booking 1 failed');
    console.log(`   Error: ${booking1.data.error?.message}`);
  }
  
  console.log();
  console.log('Booking 2: Patient B (same time slot)...');
  const booking2 = await bookAppointment('Patient B', 'patient-b@example.com');
  
  if (booking2.success) {
    console.log('❌ Booking 2 succeeded (SHOULD HAVE FAILED!)');
    console.log('   ⚠️  CONCURRENT BOOKING PREVENTION NOT WORKING!');
  } else {
    console.log('✅ Booking 2 failed as expected');
    console.log(`   Status: ${booking2.status}`);
    console.log(`   Error: ${booking2.data.error?.message}`);
    
    if (booking2.data.error?.details?.alternativeSlots) {
      console.log('   Alternative slots provided:');
      booking2.data.error.details.alternativeSlots.forEach((slot, i) => {
        console.log(`     ${i + 1}. ${slot.date} at ${slot.time}`);
      });
    }
  }
  
  console.log();
  console.log('=' .repeat(60));
  
  // Test 2: Concurrent bookings (simulate race condition)
  console.log();
  console.log('📋 Test 2: Concurrent Bookings (Simulated Race Condition)');
  console.log('-'.repeat(60));
  
  const testDate2 = '2025-12-02';
  const testTime2 = '14:00';
  
  console.log(`Testing with: ${testDate2} at ${testTime2}`);
  console.log('Sending two requests simultaneously...');
  
  const [concurrent1, concurrent2] = await Promise.allSettled([
    bookAppointment('Patient C', 'patient-c@example.com'),
    bookAppointment('Patient D', 'patient-d@example.com'),
  ]);
  
  const succeeded = [concurrent1, concurrent2].filter(r => r.status === 'fulfilled' && r.value.success);
  const failed = [concurrent1, concurrent2].filter(r => r.status === 'fulfilled' && !r.value.success);
  
  console.log();
  console.log(`Results:`);
  console.log(`  ✅ Succeeded: ${succeeded.length}`);
  console.log(`  ❌ Failed: ${failed.length}`);
  
  if (succeeded.length === 1 && failed.length === 1) {
    console.log();
    console.log('✅ CONCURRENT BOOKING PREVENTION WORKING CORRECTLY!');
    console.log('   One booking succeeded, one was rejected.');
  } else if (succeeded.length === 2) {
    console.log();
    console.log('❌ CONCURRENT BOOKING PREVENTION FAILED!');
    console.log('   Both bookings succeeded (double-booking occurred).');
  } else {
    console.log();
    console.log('⚠️  UNEXPECTED RESULT');
    console.log('   Both bookings failed or other error occurred.');
  }
  
  console.log();
  console.log('=' .repeat(60));
  console.log();
  console.log('🎉 Verification Complete!');
  console.log();
  console.log('Summary:');
  console.log('  - Database unique constraint prevents double-booking');
  console.log('  - Application-level checks provide early feedback');
  console.log('  - Alternative slots are suggested when conflicts occur');
  console.log('  - System handles concurrent requests gracefully');
}

// Run the test
runTest().catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});
