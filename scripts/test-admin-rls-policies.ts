/**
 * Test script to verify admin RLS policies
 * This script tests that admin users can access and manage dentist data
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAdminRLSPolicies() {
  console.log('🔍 Testing Admin RLS Policies...\n');

  // Test 1: Sign in as admin user
  console.log('Test 1: Signing in as admin user (karrarmayaly@gmail.com)...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'karrarmayaly@gmail.com',
    password: 'test-password-123', // Note: Replace with actual password for testing
  });

  if (authError) {
    console.error('❌ Failed to sign in as admin:', authError.message);
    console.log('⚠️  Please ensure the admin user exists and the password is correct\n');
    return;
  }

  console.log('✅ Successfully signed in as admin\n');

  // Test 2: Fetch all dentists
  console.log('Test 2: Fetching all dentists...');
  const { data: dentists, error: dentistsError } = await supabase
    .from('dentists')
    .select(`
      *,
      profiles!inner(full_name, email)
    `);

  if (dentistsError) {
    console.error('❌ Failed to fetch dentists:', dentistsError.message);
  } else {
    console.log(`✅ Successfully fetched ${dentists?.length || 0} dentists`);
    if (dentists && dentists.length > 0) {
      console.log(`   First dentist: ${dentists[0].profiles?.full_name || 'N/A'}\n`);
    }
  }

  // Test 3: Fetch dentist availability
  if (dentists && dentists.length > 0) {
    const firstDentistId = dentists[0].id;
    console.log(`Test 3: Fetching availability for dentist ${firstDentistId}...`);
    
    const { data: availability, error: availError } = await supabase
      .from('dentist_availability')
      .select('*')
      .eq('dentist_id', firstDentistId);

    if (availError) {
      console.error('❌ Failed to fetch availability:', availError.message);
    } else {
      console.log(`✅ Successfully fetched ${availability?.length || 0} availability slots\n`);
    }

    // Test 4: Try to add a new availability slot
    console.log('Test 4: Adding a new availability slot...');
    const { data: newSlot, error: insertError } = await supabase
      .from('dentist_availability')
      .insert({
        dentist_id: firstDentistId,
        day_of_week: 1, // Monday
        start_time: '09:00:00',
        end_time: '10:00:00',
        is_available: true,
        slot_duration_minutes: 30,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to add availability slot:', insertError.message);
    } else {
      console.log('✅ Successfully added availability slot');
      console.log(`   Slot ID: ${newSlot?.id}\n`);

      // Test 5: Update the slot
      console.log('Test 5: Updating the availability slot...');
      const { error: updateError } = await supabase
        .from('dentist_availability')
        .update({ end_time: '11:00:00' })
        .eq('id', newSlot.id);

      if (updateError) {
        console.error('❌ Failed to update availability slot:', updateError.message);
      } else {
        console.log('✅ Successfully updated availability slot\n');
      }

      // Test 6: Delete the slot
      console.log('Test 6: Deleting the availability slot...');
      const { error: deleteError } = await supabase
        .from('dentist_availability')
        .delete()
        .eq('id', newSlot.id);

      if (deleteError) {
        console.error('❌ Failed to delete availability slot:', deleteError.message);
      } else {
        console.log('✅ Successfully deleted availability slot\n');
      }
    }
  }

  // Test 7: Fetch all appointments
  console.log('Test 7: Fetching all appointments...');
  const { data: appointments, error: appointmentsError } = await supabase
    .from('appointments')
    .select(`
      *,
      profiles!appointments_patient_id_fkey(full_name, email)
    `)
    .limit(5);

  if (appointmentsError) {
    console.error('❌ Failed to fetch appointments:', appointmentsError.message);
  } else {
    console.log(`✅ Successfully fetched ${appointments?.length || 0} appointments\n`);
  }

  // Test 8: Fetch all profiles
  console.log('Test 8: Fetching all profiles...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .limit(5);

  if (profilesError) {
    console.error('❌ Failed to fetch profiles:', profilesError.message);
  } else {
    console.log(`✅ Successfully fetched ${profiles?.length || 0} profiles\n`);
  }

  // Sign out
  await supabase.auth.signOut();
  console.log('✅ Signed out\n');

  console.log('🎉 Admin RLS policy tests completed!');
}

// Run the tests
testAdminRLSPolicies().catch(console.error);
