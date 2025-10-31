/**
 * End-to-End Booking Flow Test Script
 * 
 * This script tests the complete booking flow:
 * 1. Fetch dentists list
 * 2. Fetch individual dentist profile
 * 3. Create a test appointment
 * 4. Verify appointment was created
 * 5. Check for schema cache errors
 * 
 * Requirements tested: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
function loadEnvFile() {
  try {
    const envPath = resolve(__dirname, '../.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const envVars: Record<string, string> = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=').trim();
          // Remove surrounding quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          envVars[key.trim()] = value;
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('Warning: Could not load .env file');
    return {};
  }
}

const envVars = loadEnvFile();
const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
  error?: any;
}

const results: TestResult[] = [];

function logResult(result: TestResult) {
  results.push(result);
  const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${icon} ${result.step}: ${result.message}`);
  if (result.details) {
    console.log('   Details:', JSON.stringify(result.details, null, 2));
  }
  if (result.error) {
    console.error('   Error:', result.error);
  }
  console.log('');
}

async function testFetchDentistsList() {
  console.log('📋 Step 1: Fetch Dentists List');
  console.log('─'.repeat(60));
  
  try {
    const { data: dentists, error } = await supabase
      .from('dentists')
      .select('*')
      .order('rating', { ascending: false });

    if (error) {
      // Check for schema cache error
      if (error.code === '42P01' || error.message.includes('schema cache')) {
        logResult({
          step: 'Fetch Dentists List',
          status: 'FAIL',
          message: 'Schema cache error detected - table not found',
          error: error.message,
          details: { code: error.code, hint: error.hint }
        });
        return null;
      }
      
      throw error;
    }

    if (!dentists || dentists.length === 0) {
      logResult({
        step: 'Fetch Dentists List',
        status: 'FAIL',
        message: 'No dentists found in database',
        details: { count: 0 }
      });
      return null;
    }

    logResult({
      step: 'Fetch Dentists List',
      status: 'PASS',
      message: `Successfully fetched ${dentists.length} dentists`,
      details: {
        count: dentists.length,
        sample: dentists.slice(0, 2).map(d => ({
          id: d.id,
          name: d.name,
          specialization: d.specialization,
          rating: d.rating
        }))
      }
    });

    return dentists;
  } catch (error: any) {
    logResult({
      step: 'Fetch Dentists List',
      status: 'FAIL',
      message: 'Failed to fetch dentists',
      error: error.message,
      details: { code: error.code }
    });
    return null;
  }
}

async function testFetchDentistProfile(dentistId: string) {
  console.log('👤 Step 2: Fetch Dentist Profile');
  console.log('─'.repeat(60));
  
  try {
    const { data: dentist, error } = await supabase
      .from('dentists')
      .select('*')
      .eq('id', dentistId)
      .single();

    if (error) {
      // Check for schema cache error
      if (error.code === '42P01' || error.message.includes('schema cache')) {
        logResult({
          step: 'Fetch Dentist Profile',
          status: 'FAIL',
          message: 'Schema cache error detected - table not found',
          error: error.message,
          details: { code: error.code, dentistId }
        });
        return null;
      }
      
      throw error;
    }

    if (!dentist) {
      logResult({
        step: 'Fetch Dentist Profile',
        status: 'FAIL',
        message: 'Dentist not found',
        details: { dentistId }
      });
      return null;
    }

    // Verify all required fields are present
    const requiredFields = ['id', 'name', 'email', 'specialization'];
    const missingFields = requiredFields.filter(field => !dentist[field]);
    
    if (missingFields.length > 0) {
      logResult({
        step: 'Fetch Dentist Profile',
        status: 'FAIL',
        message: 'Dentist profile missing required fields',
        details: { missingFields, dentistId }
      });
      return null;
    }

    logResult({
      step: 'Fetch Dentist Profile',
      status: 'PASS',
      message: `Successfully fetched profile for ${dentist.name}`,
      details: {
        id: dentist.id,
        name: dentist.name,
        email: dentist.email,
        specialization: dentist.specialization,
        rating: dentist.rating,
        hasImage: !!dentist.image_url,
        hasBio: !!dentist.bio,
        hasEducation: !!dentist.education,
        hasExpertise: !!dentist.expertise
      }
    });

    return dentist;
  } catch (error: any) {
    logResult({
      step: 'Fetch Dentist Profile',
      status: 'FAIL',
      message: 'Failed to fetch dentist profile',
      error: error.message,
      details: { code: error.code, dentistId }
    });
    return null;
  }
}

async function testCreateAppointment(dentist: any, testUserId: string) {
  console.log('📅 Step 3: Create Test Appointment');
  console.log('─'.repeat(60));
  
  try {
    // Generate test data
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const appointmentDate = tomorrow.toISOString().split('T')[0];
    const appointmentTime = '10:00';
    const bookingReference = `TEST-${Date.now()}`;
    
    const appointmentData = {
      patient_id: testUserId,
      patient_name: 'Test Patient',
      patient_email: 'test@example.com',
      patient_phone: '+1 555-123-4567',
      dentist_id: dentist.id,
      dentist_email: dentist.email,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      symptoms: 'Test booking flow - routine checkup',
      chief_complaint: 'Test booking flow - routine checkup',
      status: 'upcoming',
      payment_method: 'cash',
      payment_status: 'pending',
      booking_reference: bookingReference,
    };

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single();

    if (error) {
      // Check for schema cache error
      if (error.code === '42P01' || error.message.includes('schema cache')) {
        logResult({
          step: 'Create Test Appointment',
          status: 'FAIL',
          message: 'Schema cache error detected - appointments table not found',
          error: error.message,
          details: { code: error.code, hint: error.hint }
        });
        return null;
      }
      
      // Check for RLS policy error
      if (error.code === '42501') {
        logResult({
          step: 'Create Test Appointment',
          status: 'FAIL',
          message: 'Permission denied - RLS policy blocking insert',
          error: error.message,
          details: { code: error.code, hint: 'Check RLS policies on appointments table' }
        });
        return null;
      }
      
      throw error;
    }

    if (!appointment) {
      logResult({
        step: 'Create Test Appointment',
        status: 'FAIL',
        message: 'No appointment data returned from database',
        details: { appointmentData }
      });
      return null;
    }

    logResult({
      step: 'Create Test Appointment',
      status: 'PASS',
      message: 'Successfully created test appointment',
      details: {
        appointmentId: appointment.id,
        bookingReference: appointment.booking_reference,
        dentistName: dentist.name,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        status: appointment.status,
        paymentMethod: appointment.payment_method,
        paymentStatus: appointment.payment_status
      }
    });

    return appointment;
  } catch (error: any) {
    logResult({
      step: 'Create Test Appointment',
      status: 'FAIL',
      message: 'Failed to create appointment',
      error: error.message,
      details: { code: error.code, dentistId: dentist.id }
    });
    return null;
  }
}

async function testVerifyAppointment(appointmentId: string) {
  console.log('🔍 Step 4: Verify Appointment Created');
  console.log('─'.repeat(60));
  
  try {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (error) {
      throw error;
    }

    if (!appointment) {
      logResult({
        step: 'Verify Appointment',
        status: 'FAIL',
        message: 'Appointment not found in database',
        details: { appointmentId }
      });
      return false;
    }

    // Verify all required fields
    const requiredFields = [
      'id', 'patient_id', 'dentist_id', 'appointment_date', 
      'appointment_time', 'status', 'payment_method', 'booking_reference'
    ];
    const missingFields = requiredFields.filter(field => !appointment[field]);
    
    if (missingFields.length > 0) {
      logResult({
        step: 'Verify Appointment',
        status: 'FAIL',
        message: 'Appointment missing required fields',
        details: { missingFields, appointmentId }
      });
      return false;
    }

    logResult({
      step: 'Verify Appointment',
      status: 'PASS',
      message: 'Appointment verified successfully',
      details: {
        appointmentId: appointment.id,
        bookingReference: appointment.booking_reference,
        hasAllRequiredFields: true,
        status: appointment.status
      }
    });

    return true;
  } catch (error: any) {
    logResult({
      step: 'Verify Appointment',
      status: 'FAIL',
      message: 'Failed to verify appointment',
      error: error.message,
      details: { code: error.code, appointmentId }
    });
    return false;
  }
}

async function testCheckForSchemaErrors() {
  console.log('🔎 Step 5: Check for Schema Cache Errors');
  console.log('─'.repeat(60));
  
  try {
    // Test with incorrect table name (singular) - should fail
    const { error: wrongTableError } = await supabase
      .from('appointment') // Wrong - singular
      .select('id')
      .limit(1);

    if (wrongTableError) {
      if (wrongTableError.code === '42P01') {
        logResult({
          step: 'Schema Error Check',
          status: 'PASS',
          message: 'Correctly rejects invalid table name "appointment" (singular)',
          details: { 
            expectedBehavior: 'Should fail with 42P01 error',
            actualError: wrongTableError.message 
          }
        });
      } else {
        logResult({
          step: 'Schema Error Check',
          status: 'FAIL',
          message: 'Unexpected error when querying invalid table',
          error: wrongTableError.message,
          details: { code: wrongTableError.code }
        });
      }
    } else {
      logResult({
        step: 'Schema Error Check',
        status: 'FAIL',
        message: 'Query to invalid table "appointment" succeeded (should have failed)',
        details: { issue: 'Table name validation not working' }
      });
    }

    // Test with correct table name (plural) - should succeed
    const { error: correctTableError } = await supabase
      .from('appointments') // Correct - plural
      .select('id')
      .limit(1);

    if (correctTableError) {
      logResult({
        step: 'Schema Error Check',
        status: 'FAIL',
        message: 'Query to valid table "appointments" failed',
        error: correctTableError.message,
        details: { code: correctTableError.code }
      });
    } else {
      logResult({
        step: 'Schema Error Check',
        status: 'PASS',
        message: 'Correctly accepts valid table name "appointments" (plural)',
        details: { expectedBehavior: 'Should succeed' }
      });
    }

    return true;
  } catch (error: any) {
    logResult({
      step: 'Schema Error Check',
      status: 'FAIL',
      message: 'Failed to check schema errors',
      error: error.message
    });
    return false;
  }
}

async function cleanupTestAppointment(appointmentId: string) {
  console.log('🧹 Cleanup: Delete Test Appointment');
  console.log('─'.repeat(60));
  
  try {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId);

    if (error) {
      console.log(`⚠️  Warning: Could not delete test appointment ${appointmentId}`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Please manually delete this test appointment from the database`);
    } else {
      console.log(`✅ Test appointment ${appointmentId} deleted successfully`);
    }
  } catch (error: any) {
    console.log(`⚠️  Warning: Error during cleanup: ${error.message}`);
  }
  console.log('');
}

async function getTestUserId(): Promise<string | null> {
  console.log('🔑 Getting Test User ID');
  console.log('─'.repeat(60));
  
  try {
    // Try to get current authenticated user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.log('⚠️  No authenticated user found');
      console.log('   Using anonymous user ID for testing');
      console.log('   Note: This may fail if RLS policies require authentication');
      console.log('');
      
      // Use a test UUID for unauthenticated testing
      return '00000000-0000-0000-0000-000000000000';
    }
    
    console.log(`✅ Using authenticated user: ${user.email}`);
    console.log(`   User ID: ${user.id}`);
    console.log('');
    return user.id;
  } catch (error: any) {
    console.log(`⚠️  Error getting user: ${error.message}`);
    console.log('   Using test UUID');
    console.log('');
    return '00000000-0000-0000-0000-000000000000';
  }
}

async function runE2ETest() {
  console.log('');
  console.log('═'.repeat(60));
  console.log('🧪 BOOKING FLOW END-TO-END TEST');
  console.log('═'.repeat(60));
  console.log('');
  console.log('Testing Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 4.4, 4.5');
  console.log('');
  
  let createdAppointmentId: string | null = null;
  
  try {
    // Get test user ID
    const testUserId = await getTestUserId();
    if (!testUserId) {
      console.error('❌ Cannot proceed without user ID');
      return;
    }
    
    // Step 1: Fetch dentists list
    const dentists = await testFetchDentistsList();
    
    let dentist = null;
    let appointment = null;
    
    if (dentists && dentists.length > 0) {
      // Step 2: Fetch dentist profile
      dentist = await testFetchDentistProfile(dentists[0].id);
      
      if (dentist) {
        // Step 3: Create test appointment
        appointment = await testCreateAppointment(dentist, testUserId);
        
        if (appointment) {
          createdAppointmentId = appointment.id;
          
          // Step 4: Verify appointment
          await testVerifyAppointment(appointment.id);
        }
      }
    }
    
    // Step 5: Check for schema errors (always run this)
    await testCheckForSchemaErrors();
    
  } catch (error: any) {
    console.error('');
    console.error('❌ FATAL ERROR:', error.message);
    console.error('');
  } finally {
    // Cleanup
    if (createdAppointmentId) {
      await cleanupTestAppointment(createdAppointmentId);
    }
  }
  
  // Print summary
  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log('');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log('');
  
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('');
    console.log('The booking flow is working correctly:');
    console.log('  ✓ Dentists list loads from database');
    console.log('  ✓ Dentist profiles load with real data');
    console.log('  ✓ Appointments can be created successfully');
    console.log('  ✓ No schema cache errors detected');
    console.log('  ✓ All database queries use correct table names');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log('');
    console.log('Failed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.step}: ${r.message}`);
    });
    console.log('');
    console.log('🔧 RECOMMENDED ACTIONS:');
    console.log('');
    
    // Check if schema errors were detected
    const hasSchemaErrors = results.some(r => 
      r.status === 'FAIL' && 
      (r.message.includes('schema cache') || r.message.includes('table not found'))
    );
    
    if (hasSchemaErrors) {
      console.log('The database is missing required tables. To fix this:');
      console.log('');
      console.log('1. Run the schema verification script:');
      console.log('   npm run verify:schema');
      console.log('');
      console.log('2. Apply the necessary migrations:');
      console.log('   npm run migrate');
      console.log('');
      console.log('3. Or manually create the missing tables in Supabase dashboard');
      console.log('');
      console.log('Required tables:');
      console.log('  - appointments (with all required columns)');
      console.log('  - dentists (with all required columns)');
      console.log('');
      console.log('See .kiro/specs/booking-system-critical-fixes/design.md for schema details');
    }
  }
  
  console.log('');
  console.log('═'.repeat(60));
  console.log('');
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run the test
runE2ETest().catch(error => {
  console.error('');
  console.error('❌ UNHANDLED ERROR:', error);
  console.error('');
  process.exit(1);
});
