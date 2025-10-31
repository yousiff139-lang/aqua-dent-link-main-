/**
 * Admin System Verification Script
 * 
 * This script verifies that all components of the admin dentist management system
 * are properly configured and working.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface VerificationResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

async function verifyDentistsTable() {
  console.log('\n🔍 Verifying dentists table...');
  
  try {
    const { data, error } = await supabase
      .from('dentists')
      .select('id, specialization, bio, years_of_experience, rating')
      .limit(1);
    
    if (error) {
      results.push({
        name: 'Dentists Table',
        passed: false,
        message: `Error accessing dentists table: ${error.message}`,
        details: error,
      });
      return false;
    }
    
    results.push({
      name: 'Dentists Table',
      passed: true,
      message: 'Dentists table exists and is accessible',
      details: { recordCount: data?.length || 0 },
    });
    return true;
  } catch (err: any) {
    results.push({
      name: 'Dentists Table',
      passed: false,
      message: `Exception: ${err.message}`,
    });
    return false;
  }
}

async function verifyDentistAvailabilityTable() {
  console.log('\n🔍 Verifying dentist_availability table...');
  
  try {
    const { data, error } = await supabase
      .from('dentist_availability')
      .select('id, dentist_id, day_of_week, start_time, end_time, is_available')
      .limit(1);
    
    if (error) {
      results.push({
        name: 'Dentist Availability Table',
        passed: false,
        message: `Error accessing dentist_availability table: ${error.message}`,
        details: error,
      });
      return false;
    }
    
    results.push({
      name: 'Dentist Availability Table',
      passed: true,
      message: 'Dentist availability table exists and is accessible',
      details: { recordCount: data?.length || 0 },
    });
    return true;
  } catch (err: any) {
    results.push({
      name: 'Dentist Availability Table',
      passed: false,
      message: `Exception: ${err.message}`,
    });
    return false;
  }
}

async function verifyAppointmentsTable() {
  console.log('\n🔍 Verifying appointments table...');
  
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, patient_id, dentist_id, appointment_date, appointment_time, status')
      .limit(1);
    
    if (error) {
      results.push({
        name: 'Appointments Table',
        passed: false,
        message: `Error accessing appointments table: ${error.message}`,
        details: error,
      });
      return false;
    }
    
    results.push({
      name: 'Appointments Table',
      passed: true,
      message: 'Appointments table exists and is accessible',
      details: { recordCount: data?.length || 0 },
    });
    return true;
  } catch (err: any) {
    results.push({
      name: 'Appointments Table',
      passed: false,
      message: `Exception: ${err.message}`,
    });
    return false;
  }
}

async function verifyUserRolesTable() {
  console.log('\n🔍 Verifying user_roles table...');
  
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .limit(1);
    
    if (error) {
      results.push({
        name: 'User Roles Table',
        passed: false,
        message: `Error accessing user_roles table: ${error.message}`,
        details: error,
      });
      return false;
    }
    
    results.push({
      name: 'User Roles Table',
      passed: true,
      message: 'User roles table exists and is accessible',
      details: { recordCount: data?.length || 0 },
    });
    return true;
  } catch (err: any) {
    results.push({
      name: 'User Roles Table',
      passed: false,
      message: `Exception: ${err.message}`,
    });
    return false;
  }
}

async function verifyProfilesTable() {
  console.log('\n🔍 Verifying profiles table...');
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .limit(1);
    
    if (error) {
      results.push({
        name: 'Profiles Table',
        passed: false,
        message: `Error accessing profiles table: ${error.message}`,
        details: error,
      });
      return false;
    }
    
    results.push({
      name: 'Profiles Table',
      passed: true,
      message: 'Profiles table exists and is accessible',
      details: { recordCount: data?.length || 0 },
    });
    return true;
  } catch (err: any) {
    results.push({
      name: 'Profiles Table',
      passed: false,
      message: `Exception: ${err.message}`,
    });
    return false;
  }
}

async function verifyDentistWithProfile() {
  console.log('\n🔍 Verifying dentist-profile join...');
  
  try {
    const { data, error } = await supabase
      .from('dentists')
      .select(`
        *,
        profiles!inner(full_name, email)
      `)
      .limit(1);
    
    if (error) {
      results.push({
        name: 'Dentist-Profile Join',
        passed: false,
        message: `Error joining dentists with profiles: ${error.message}`,
        details: error,
      });
      return false;
    }
    
    results.push({
      name: 'Dentist-Profile Join',
      passed: true,
      message: 'Successfully joined dentists with profiles',
      details: { recordCount: data?.length || 0 },
    });
    return true;
  } catch (err: any) {
    results.push({
      name: 'Dentist-Profile Join',
      passed: false,
      message: `Exception: ${err.message}`,
    });
    return false;
  }
}

async function verifyAppointmentWithPatient() {
  console.log('\n🔍 Verifying appointment-patient join...');
  
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles!appointments_patient_id_fkey(full_name, email)
      `)
      .limit(1);
    
    if (error) {
      results.push({
        name: 'Appointment-Patient Join',
        passed: false,
        message: `Error joining appointments with patient profiles: ${error.message}`,
        details: error,
      });
      return false;
    }
    
    results.push({
      name: 'Appointment-Patient Join',
      passed: true,
      message: 'Successfully joined appointments with patient profiles',
      details: { recordCount: data?.length || 0 },
    });
    return true;
  } catch (err: any) {
    results.push({
      name: 'Appointment-Patient Join',
      passed: false,
      message: `Exception: ${err.message}`,
    });
    return false;
  }
}

async function checkAdminUser() {
  console.log('\n🔍 Checking for admin user...');
  
  try {
    // Check if admin email exists in auth.users
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      results.push({
        name: 'Admin User Check',
        passed: false,
        message: `Cannot check admin users (requires service role key): ${error.message}`,
        details: error,
      });
      return false;
    }
    
    const adminEmails = ['karrarmayaly@gmail.com', 'bingo@gmail.com'];
    const adminUsers = users?.filter(u => adminEmails.includes(u.email || ''));
    
    if (adminUsers && adminUsers.length > 0) {
      results.push({
        name: 'Admin User Check',
        passed: true,
        message: `Found ${adminUsers.length} admin user(s)`,
        details: { adminEmails: adminUsers.map(u => u.email) },
      });
      return true;
    } else {
      results.push({
        name: 'Admin User Check',
        passed: false,
        message: 'No admin users found. Please sign up with karrarmayaly@gmail.com or bingo@gmail.com',
      });
      return false;
    }
  } catch (err: any) {
    results.push({
      name: 'Admin User Check',
      passed: false,
      message: `Exception (requires service role key): ${err.message}`,
    });
    return false;
  }
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 VERIFICATION RESULTS');
  console.log('='.repeat(80) + '\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log('');
  });
  
  console.log('='.repeat(80));
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(80) + '\n');
  
  if (failed > 0) {
    console.log('⚠️  Some checks failed. Please review the errors above.');
    console.log('💡 Common fixes:');
    console.log('   1. Run database migrations: cd supabase && supabase db push');
    console.log('   2. Check .env file has correct Supabase credentials');
    console.log('   3. Verify RLS policies are enabled');
    console.log('   4. Sign up with admin email: karrarmayaly@gmail.com\n');
  } else {
    console.log('🎉 All checks passed! Admin system is ready to use.');
    console.log('📝 Next steps:');
    console.log('   1. Sign in with admin email: karrarmayaly@gmail.com');
    console.log('   2. Navigate to /admin in your application');
    console.log('   3. Start managing dentists and appointments\n');
  }
}

async function main() {
  console.log('🚀 Starting Admin System Verification...\n');
  console.log('Environment:');
  console.log(`  Supabase URL: ${supabaseUrl}`);
  console.log(`  Supabase Key: ${supabaseKey?.substring(0, 20)}...`);
  
  await verifyProfilesTable();
  await verifyUserRolesTable();
  await verifyDentistsTable();
  await verifyDentistAvailabilityTable();
  await verifyAppointmentsTable();
  await verifyDentistWithProfile();
  await verifyAppointmentWithPatient();
  await checkAdminUser();
  
  printResults();
}

main().catch(console.error);
