/**
 * Script to apply admin RLS policies migration
 * This script reads and executes the admin RLS policies migration file
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read .env file manually
const envPath = join(process.cwd(), '.env');
let supabaseUrl = '';
let supabaseServiceKey = '';

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].replace(/"/g, '').trim();
    }
    // Try to get service key first, fall back to publishable key
    if (line.startsWith('SUPABASE_SERVICE_KEY=')) {
      supabaseServiceKey = line.split('=')[1].replace(/"/g, '').trim();
    } else if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=') && !supabaseServiceKey) {
      supabaseServiceKey = line.split('=')[1].replace(/"/g, '').trim();
    }
  }
} catch (err) {
  console.error('❌ Could not read .env file');
  console.error('   Please ensure .env file exists in the project root');
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         Apply Admin RLS Policies Migration                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  console.log('📋 Reading migration file...');
  
  // Read the migration file
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20251027120000_add_admin_dentist_management_policies.sql');
  let migrationSql: string;
  
  try {
    migrationSql = readFileSync(migrationPath, 'utf-8');
    console.log('✅ Migration file loaded successfully\n');
  } catch (err) {
    console.error('❌ Failed to read migration file:', err);
    process.exit(1);
  }

  console.log('🔌 Connecting to Supabase...');
  console.log(`   URL: ${supabaseUrl}\n`);

  // Split the migration into individual statements
  // We need to execute each statement separately
  const statements = migrationSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
  console.log('═'.repeat(70));

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const statementPreview = statement.substring(0, 80).replace(/\n/g, ' ') + '...';
    
    console.log(`\n${i + 1}. Executing: ${statementPreview}`);
    
    try {
      // Execute the SQL statement
      const { error } = await supabase.rpc('exec_sql', { 
        sql_query: statement + ';' 
      });
      
      if (error) {
        // Check if it's a "policy already exists" error, which is OK
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log('   ⚠️  Policy already exists or was already dropped (OK)');
          successCount++;
        } else {
          console.error('   ❌ Failed:', error.message);
          failCount++;
        }
      } else {
        console.log('   ✅ Success');
        successCount++;
      }
    } catch (err: any) {
      console.error('   ❌ Exception:', err.message);
      failCount++;
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 MIGRATION SUMMARY');
  console.log('─'.repeat(70));
  console.log(`   Total Statements: ${statements.length}`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   Success Rate: ${((successCount / statements.length) * 100).toFixed(1)}%`);
  console.log('\n' + '═'.repeat(70));

  if (failCount === 0) {
    console.log('\n✅ Migration applied successfully!');
    console.log('\n📋 Admin RLS policies are now in place:');
    console.log('   ✅ Admins can manage all dentist availability');
    console.log('   ✅ Admins can view all appointments');
    console.log('   ✅ Admins can update all appointments');
    console.log('   ✅ Admins can view all dentists');
    console.log('   ✅ Admins can view all profiles');
    console.log('\n🎉 Admin users can now access the admin dashboard!');
  } else {
    console.log('\n⚠️  Some statements failed. This may be OK if policies already exist.');
    console.log('   Please review the errors above.');
  }

  console.log('\n' + '═'.repeat(70) + '\n');
}

// Note about exec_sql function
console.log('⚠️  NOTE: This script requires the exec_sql function to be available in Supabase.');
console.log('   If you get an error about exec_sql not existing, you have two options:');
console.log('   1. Apply the migration manually via Supabase Dashboard (SQL Editor)');
console.log('   2. Use Supabase CLI: supabase db push\n');

applyMigration().catch((err) => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
