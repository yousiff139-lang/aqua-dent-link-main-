// Quick test script to run in browser console
// This will help diagnose the appointments loading issue

console.log('🔍 Testing Appointments Query...\n');

(async () => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await window.supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Not authenticated:', userError);
      console.log('\n💡 Solution: Please log in first');
      return;
    }
    
    console.log('✅ User authenticated');
    console.log('   User ID:', user.id);
    console.log('   Email:', user.email);
    console.log('');
    
    // Test 1: Query appointments by patient_id
    console.log('📋 Test 1: Query by patient_id...');
    const { data: appointments1, error: error1 } = await window.supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', user.id);
    
    if (error1) {
      console.error('❌ Error:', error1);
      console.log('   Code:', error1.code);
      console.log('   Message:', error1.message);
      console.log('   Details:', error1.details);
      console.log('   Hint:', error1.hint);
    } else {
      console.log('✅ Query successful');
      console.log('   Found:', appointments1?.length || 0, 'appointments');
      if (appointments1 && appointments1.length > 0) {
        console.log('   Sample:', appointments1[0]);
      }
    }
    console.log('');
    
    // Test 2: Query all appointments (to check if any exist)
    console.log('📋 Test 2: Query all appointments (admin check)...');
    const { data: appointments2, error: error2, count } = await window.supabase
      .from('appointments')
      .select('*', { count: 'exact' });
    
    if (error2) {
      console.error('❌ Error:', error2);
      console.log('   This is expected if you\'re not an admin');
    } else {
      console.log('✅ Query successful');
      console.log('   Total appointments in database:', count);
      if (appointments2 && appointments2.length > 0) {
        console.log('   Your appointments:', appointments2.filter(a => a.patient_id === user.id).length);
        console.log('   Sample:', appointments2[0]);
      }
    }
    console.log('');
    
    // Test 3: Check RLS policies
    console.log('📋 Test 3: Checking table access...');
    const { error: error3 } = await window.supabase
      .from('appointments')
      .select('id')
      .limit(1);
    
    if (error3) {
      if (error3.code === '42501') {
        console.error('❌ RLS Policy Error - Insufficient privileges');
        console.log('\n💡 Solution: Run the RLS fix migration:');
        console.log('   cd supabase && supabase db push');
      } else if (error3.code === 'PGRST116') {
        console.log('✅ Table accessible (no rows found)');
      } else {
        console.error('❌ Error:', error3);
      }
    } else {
      console.log('✅ Table accessible');
    }
    console.log('');
    
    // Test 4: Check user roles
    console.log('📋 Test 4: Checking user roles...');
    const { data: roles, error: rolesError } = await window.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    if (rolesError) {
      console.warn('⚠️  Could not fetch roles:', rolesError.message);
    } else {
      if (roles && roles.length > 0) {
        console.log('✅ User roles:', roles.map(r => r.role).join(', '));
      } else {
        console.warn('⚠️  No roles assigned to user');
        console.log('\n💡 Solution: Assign a role in Supabase Dashboard:');
        console.log('   INSERT INTO user_roles (user_id, role) VALUES (\'' + user.id + '\', \'patient\');');
      }
    }
    console.log('');
    
    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    
    if (error1) {
      console.log('\n❌ ISSUE FOUND: Cannot query appointments');
      console.log('\n🔧 SOLUTIONS:');
      
      if (error1.code === '42501') {
        console.log('   1. Run RLS fix migration:');
        console.log('      cd supabase && supabase db push');
      } else if (error1.code === 'PGRST116') {
        console.log('   1. No appointments found for your user');
        console.log('   2. Try booking an appointment');
      } else {
        console.log('   1. Check error details above');
        console.log('   2. Verify database migrations are applied');
        console.log('   3. Check Supabase Dashboard → Database → Policies');
      }
    } else if (!appointments1 || appointments1.length === 0) {
      console.log('\n✅ No errors, but no appointments found');
      console.log('\n💡 This is normal if you haven\'t booked any appointments yet');
      console.log('   Try booking an appointment to test the full flow');
    } else {
      console.log('\n✅ Everything looks good!');
      console.log('   Found', appointments1.length, 'appointment(s)');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
})();
