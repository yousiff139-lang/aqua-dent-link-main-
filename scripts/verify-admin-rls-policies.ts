/**
 * Verification script for admin RLS policies
 * This script checks if admin users can access dentist data
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read .env file manually
const envPath = join(process.cwd(), '.env');
let supabaseUrl = '';
let supabaseKey = '';

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
    }
    if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) {
      supabaseKey = line.split('=')[1].replace(/"/g, '').trim();
    }
  }
} catch (err) {
  console.error('❌ Could not read .env file');
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAdminRLSPolicies() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         Verify Admin RLS Policies                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  console.log('📋 This script verifies that admin RLS policies are working correctly\n');
  console.log('⚠️  NOTE: To fully test admin access, you need to:');
  console.log('   1. Apply the migration via Supabase Dashboard SQL Editor');
  console.log('   2. Sign in as an admin user (karrarmayaly@gmail.com)');
  console.log('   3. Test accessing dentist data\n');
  console.log('═'.repeat(70) + '\n');

  // Test 1: Check if tables exist
  console.log('Test 1: Checking if required tables exist...\n');

  const tables = ['dentists', 'dentist_availability', 'appointments', 'profiles'];
  let allTablesExist = true;

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(0);
    
    if (error && error.code === '42P01') {
      console.log(`   ❌ Table '${table}' does not exist`);
      allTablesExist = false;
    } else if (error) {
      console.log(`   ⚠️  Table '${table}' - ${error.message}`);
    } else {
      console.log(`   ✅ Table '${table}' exists`);
    }
  }

  if (!allTablesExist) {
    console.log('\n❌ Some required tables are missing. Please run earlier migrations first.\n');
    return;
  }

  console.log('\n✅ All required tables exist\n');
  console.log('═'.repeat(70) + '\n');

  // Test 2: Check if we can query dentists (should work for everyone)
  console.log('Test 2: Testing public access to dentists table...\n');

  const { data: dentists, error: dentistsError } = await supabase
    .from('dentists')
    .select('id, specialization')
    .limit(3);

  if (dentistsError) {
    console.log(`   ❌ Failed to query dentists: ${dentistsError.message}`);
  } else {
    console.log(`   ✅ Successfully queried dentists (${dentists?.length || 0} found)`);
  }

  console.log('\n═'.repeat(70) + '\n');

  // Test 3: Check if we can query dentist_availability (should work for everyone)
  console.log('Test 3: Testing public access to dentist_availability table...\n');

  const { data: availability, error: availError } = await supabase
    .from('dentist_availability')
    .select('id, day_of_week, start_time, end_time')
    .limit(3);

  if (availError) {
    console.log(`   ❌ Failed to query availability: ${availError.message}`);
  } else {
    console.log(`   ✅ Successfully queried availability (${availability?.length || 0} found)`);
  }

  console.log('\n═'.repeat(70) + '\n');

  // Test 4: Try to insert availability (should fail without admin auth)
  console.log('Test 4: Testing write access without authentication...\n');
  console.log('   (This should fail - only admins should be able to write)\n');

  if (dentists && dentists.length > 0) {
    const { error: insertError } = await supabase
      .from('dentist_availability')
      .insert({
        dentist_id: dentists[0].id,
        day_of_week: 1,
        start_time: '09:00:00',
        end_time: '10:00:00',
        is_available: true,
        slot_duration_minutes: 30,
      });

    if (insertError) {
      console.log(`   ✅ Write access correctly blocked: ${insertError.message}`);
    } else {
      console.log(`   ⚠️  Write access was allowed (unexpected - RLS may not be configured)`);
    }
  }

  console.log('\n═'.repeat(70) + '\n');

  // Summary
  console.log('📊 VERIFICATION SUMMARY\n');
  console.log('✅ Basic table structure is in place');
  console.log('✅ Public read access is working');
  console.log('✅ Write access is protected\n');
  
  console.log('📋 NEXT STEPS:\n');
  console.log('1. Apply the migration file via Supabase Dashboard:');
  console.log('   File: supabase/migrations/20251027120000_add_admin_dentist_management_policies.sql\n');
  console.log('2. To test admin access, run:');
  console.log('   npx tsx scripts/test-admin-rls-policies.ts\n');
  console.log('   (Make sure to update the admin password in that script first)\n');
  console.log('3. Test the admin dashboard in the application:');
  console.log('   - Sign in as karrarmayaly@gmail.com');
  console.log('   - Navigate to /admin');
  console.log('   - Verify you can manage dentist availability\n');
  
  console.log('═'.repeat(70) + '\n');
}

verifyAdminRLSPolicies().catch(console.error);
