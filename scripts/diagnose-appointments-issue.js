// Diagnostic script to identify appointments loading issues
// Run this in your browser console while logged in

console.log('🔍 Diagnosing Appointments Loading Issue...\n');

// Check if user is authenticated
const checkAuth = async () => {
  console.log('1️⃣ Checking Authentication...');
  const { data: { session }, error } = await window.supabase.auth.getSession();
  
  if (error) {
    console.error('❌ Auth Error:', error);
    return null;
  }
  
  if (!session) {
    console.error('❌ No active session - User not logged in');
    return null;
  }
  
  console.log('✅ User authenticated');
  console.log('   User ID:', session.user.id);
  console.log('   Email:', session.user.email);
  return session.user;
};

// Check user roles
const checkRoles = async (userId) => {
  console.log('\n2️⃣ Checking User Roles...');
  const { data, error } = await window.supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  
  if (error) {
    console.error('❌ Error fetching roles:', error);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.warn('⚠️  No roles found for user');
    return [];
  }
  
  console.log('✅ User roles:', data.map(r => r.role).join(', '));
  return data.map(r => r.role);
};

// Test appointments query
const testAppointmentsQuery = async (userId) => {
  console.log('\n3️⃣ Testing Appointments Query...');
  
  try {
    const { data, error, count } = await window.supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .eq('patient_id', userId);
    
    if (error) {
      console.error('❌ Query Error:', error);
      console.error('   Error Code:', error.code);
      console.error('   Error Message:', error.message);
      console.error('   Error Details:', error.details);
      console.error('   Error Hint:', error.hint);
      return;
    }
    
    console.log('✅ Query successful');
    console.log('   Total appointments:', count);
    console.log('   Appointments data:', data);
    
    if (data && data.length > 0) {
      console.log('\n📋 Sample appointment:');
      console.log(data[0]);
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
};

// Check RLS policies
const checkRLSPolicies = async () => {
  console.log('\n4️⃣ Checking RLS Policies...');
  
  try {
    const { data, error } = await window.supabase.rpc('get_policies', {
      table_name: 'appointments'
    });
    
    if (error) {
      console.warn('⚠️  Could not fetch RLS policies (this is normal if function doesn\'t exist)');
      console.log('   You can check policies in Supabase Dashboard → Database → Policies');
    } else {
      console.log('✅ RLS Policies:', data);
    }
  } catch (err) {
    console.warn('⚠️  Could not check RLS policies');
  }
};

// Check if appointments table exists
const checkTableExists = async () => {
  console.log('\n5️⃣ Checking if appointments table exists...');
  
  try {
    const { error } = await window.supabase
      .from('appointments')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.error('❌ Appointments table does not exist!');
      return false;
    }
    
    if (error && error.code === 'PGRST116') {
      console.error('❌ No rows found, but table exists');
      console.log('   This might be an RLS policy issue');
      return true;
    }
    
    if (error) {
      console.error('❌ Error:', error);
      return false;
    }
    
    console.log('✅ Appointments table exists');
    return true;
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return false;
  }
};

// Run all diagnostics
const runDiagnostics = async () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  APPOINTMENTS LOADING DIAGNOSTIC TOOL');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Check if supabase client is available
  if (typeof window.supabase === 'undefined') {
    console.error('❌ Supabase client not found!');
    console.log('   Make sure you\'re running this on a page with Supabase initialized');
    return;
  }
  
  const user = await checkAuth();
  if (!user) {
    console.log('\n❌ DIAGNOSIS: User is not authenticated');
    console.log('   SOLUTION: Log in to the application');
    return;
  }
  
  const roles = await checkRoles(user.id);
  
  const tableExists = await checkTableExists();
  if (!tableExists) {
    console.log('\n❌ DIAGNOSIS: Appointments table does not exist');
    console.log('   SOLUTION: Run database migrations');
    return;
  }
  
  await testAppointmentsQuery(user.id);
  await checkRLSPolicies();
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  DIAGNOSTIC COMPLETE');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📊 Summary:');
  console.log('   - User authenticated: ✅');
  console.log('   - User roles:', roles.length > 0 ? roles.join(', ') : 'None');
  console.log('   - Table exists: ✅');
  console.log('\n💡 Next Steps:');
  console.log('   1. Check the error messages above');
  console.log('   2. If RLS policy error, run: npm run fix-rls');
  console.log('   3. If no appointments found, try creating one');
  console.log('   4. Check Supabase Dashboard → Database → Policies');
  console.log('   5. Check browser Network tab for failed requests');
};

// Run diagnostics
runDiagnostics().catch(err => {
  console.error('❌ Diagnostic script failed:', err);
});
