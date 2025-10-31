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
  console.error('   Please ensure .env file exists in the project root');
  process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('   Required: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface SchemaCheck {
  table: string;
  requiredColumns: string[];
  description: string;
}

const REQUIRED_SCHEMA: SchemaCheck[] = [
  {
    table: 'appointments',
    requiredColumns: [
      'id',
      'patient_id',
      'dentist_id',
      'appointment_date',
      'appointment_time',
      'status',
      'payment_method',
      'payment_status',
      'patient_name',
      'patient_email',
      'patient_phone',
      'booking_reference',
      'created_at',
      'updated_at'
    ],
    description: 'Appointments table for booking management'
  },
  {
    table: 'dentists',
    requiredColumns: [
      'id',
      'name',
      'email',
      'specialization',
      'rating',
      'bio',
      'education',
      'expertise',
      'image_url',
      'created_at',
      'updated_at'
    ],
    description: 'Dentists table for dentist profiles'
  }
];

interface VerificationResult {
  table: string;
  exists: boolean;
  accessible: boolean;
  columns: string[];
  missingColumns: string[];
  rowCount: number | null;
  error: string | null;
}

/**
 * Check if a table exists and is accessible
 */
async function verifyTableExists(tableName: string): Promise<{ exists: boolean; accessible: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);
    
    if (error) {
      // Check for specific error codes
      if (error.code === '42P01') {
        return { exists: false, accessible: false, error: 'Table does not exist in schema' };
      }
      if (error.code === '42501') {
        return { exists: true, accessible: false, error: 'Permission denied (RLS policy issue)' };
      }
      return { exists: false, accessible: false, error: error.message };
    }
    
    return { exists: true, accessible: true, error: null };
  } catch (err) {
    return { exists: false, accessible: false, error: String(err) };
  }
}

/**
 * Get columns from a table by querying a single row
 */
async function getTableColumns(tableName: string): Promise<{ columns: string[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      return { columns: [], error: error.message };
    }
    
    if (data && data.length > 0) {
      return { columns: Object.keys(data[0]), error: null };
    }
    
    // Table exists but is empty - we can't determine columns this way
    return { columns: [], error: 'Table is empty, cannot verify columns' };
  } catch (err) {
    return { columns: [], error: String(err) };
  }
}

/**
 * Get row count for a table
 */
async function getRowCount(tableName: string): Promise<number | null> {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      return null;
    }
    
    return count;
  } catch (err) {
    return null;
  }
}

/**
 * Verify a single table's schema
 */
async function verifyTable(schemaCheck: SchemaCheck): Promise<VerificationResult> {
  const result: VerificationResult = {
    table: schemaCheck.table,
    exists: false,
    accessible: false,
    columns: [],
    missingColumns: [],
    rowCount: null,
    error: null
  };

  // Check if table exists
  const existsCheck = await verifyTableExists(schemaCheck.table);
  result.exists = existsCheck.exists;
  result.accessible = existsCheck.accessible;
  result.error = existsCheck.error;

  if (!result.exists || !result.accessible) {
    result.missingColumns = schemaCheck.requiredColumns;
    return result;
  }

  // Get columns
  const columnsCheck = await getTableColumns(schemaCheck.table);
  result.columns = columnsCheck.columns;

  // Check for missing columns
  if (columnsCheck.columns.length > 0) {
    result.missingColumns = schemaCheck.requiredColumns.filter(
      col => !columnsCheck.columns.includes(col)
    );
  } else if (columnsCheck.error) {
    // If we can't get columns, assume all are missing
    result.missingColumns = schemaCheck.requiredColumns;
    result.error = columnsCheck.error;
  }

  // Get row count
  result.rowCount = await getRowCount(schemaCheck.table);

  return result;
}

/**
 * Print verification results
 */
function printResults(results: VerificationResult[]): void {
  console.log('\n' + '═'.repeat(70));
  console.log('📊 SCHEMA VERIFICATION RESULTS');
  console.log('═'.repeat(70));

  let allPassed = true;

  for (const result of results) {
    console.log(`\n📋 Table: ${result.table}`);
    console.log('─'.repeat(70));

    if (!result.exists) {
      console.log('   ❌ Status: Table does not exist');
      console.log(`   ⚠️  Error: ${result.error}`);
      allPassed = false;
      continue;
    }

    if (!result.accessible) {
      console.log('   ⚠️  Status: Table exists but is not accessible');
      console.log(`   ⚠️  Error: ${result.error}`);
      allPassed = false;
      continue;
    }

    console.log('   ✅ Status: Table exists and is accessible');
    console.log(`   📊 Row count: ${result.rowCount !== null ? result.rowCount : 'Unknown'}`);

    if (result.columns.length > 0) {
      console.log(`   ✅ Columns found: ${result.columns.length}`);
      console.log(`   📝 Columns: ${result.columns.join(', ')}`);
    }

    if (result.missingColumns.length > 0) {
      console.log(`   ❌ Missing required columns (${result.missingColumns.length}):`);
      result.missingColumns.forEach(col => {
        console.log(`      - ${col}`);
      });
      allPassed = false;
    } else if (result.columns.length > 0) {
      console.log('   ✅ All required columns present');
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('📈 SUMMARY');
  console.log('═'.repeat(70));

  const tablesExist = results.filter(r => r.exists).length;
  const tablesAccessible = results.filter(r => r.accessible).length;
  const tablesComplete = results.filter(r => r.missingColumns.length === 0 && r.accessible).length;

  console.log(`   Tables exist: ${tablesExist}/${results.length}`);
  console.log(`   Tables accessible: ${tablesAccessible}/${results.length}`);
  console.log(`   Tables complete: ${tablesComplete}/${results.length}`);

  if (allPassed) {
    console.log('\n   ✅ All schema checks passed!');
  } else {
    console.log('\n   ❌ Some schema checks failed');
    console.log('\n💡 Next steps:');
    console.log('   1. Run database migrations: npm run migrate');
    console.log('   2. Check Supabase dashboard for table structure');
    console.log('   3. Verify RLS policies are configured correctly');
  }

  console.log('\n' + '═'.repeat(70) + '\n');
}

/**
 * Main verification function
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           Database Schema Verification Script                     ║');
  console.log('║           Booking System Critical Fixes - Task 8                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  
  console.log(`\n🔌 Connecting to Supabase...`);
  console.log(`   URL: ${supabaseUrl}`);

  // Test basic connectivity
  try {
    const { error } = await supabase.from('dentists').select('count').limit(1);
    if (error && error.code === '42P01') {
      console.log('   ⚠️  Connection successful but tables may not exist');
    } else if (error) {
      console.log(`   ⚠️  Connection issue: ${error.message}`);
    } else {
      console.log('   ✅ Connection successful');
    }
  } catch (err) {
    console.error('   ❌ Connection failed:', err);
    process.exit(1);
  }

  console.log('\n🔍 Verifying schema...\n');

  // Verify each table
  const results: VerificationResult[] = [];
  for (const schemaCheck of REQUIRED_SCHEMA) {
    console.log(`   Checking ${schemaCheck.table}...`);
    const result = await verifyTable(schemaCheck);
    results.push(result);
  }

  // Print results
  printResults(results);

  // Exit with appropriate code
  const allPassed = results.every(r => r.exists && r.accessible && r.missingColumns.length === 0);
  process.exit(allPassed ? 0 : 1);
}

// Run the verification
main().catch((err) => {
  console.error('\n❌ Verification script failed:', err);
  process.exit(1);
});
