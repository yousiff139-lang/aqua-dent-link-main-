/**
 * System Verification Script
 * Checks if all components of Dental Care Connect are properly configured
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('🔍 Dental Care Connect - System Verification\n');
console.log('='.repeat(60));

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function success(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function error(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function warning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function info(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

async function verifyEnvironmentVariables() {
  console.log('\n📋 Checking Environment Variables...');
  
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
  ];
  
  let allPresent = true;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      success(`${varName} is set`);
    } else {
      error(`${varName} is missing`);
      allPresent = false;
    }
  }
  
  return allPresent;
}

async function verifyBackendEnv() {
  console.log('\n🔧 Checking Backend Configuration...');
  
  const backendEnvPath = join(__dirname, '../backend/.env');
  
  if (existsSync(backendEnvPath)) {
    success('Backend .env file exists');
    
    // Load backend env
    dotenv.config({ path: backendEnvPath });
    
    const backendVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'CORS_ORIGIN',
      'JWT_SECRET',
    ];
    
    let allPresent = true;
    for (const varName of backendVars) {
      if (process.env[varName] && process.env[varName] !== 'YOUR_SERVICE_ROLE_KEY_HERE') {
        success(`${varName} is configured`);
      } else {
        error(`${varName} is missing or not configured`);
        allPresent = false;
      }
    }
    
    return allPresent;
  } else {
    error('Backend .env file not found');
    info('Run: cp backend/.env.example backend/.env');
    return false;
  }
}

async function verifySupabaseConnection() {
  console.log('\n🔌 Testing Supabase Connection...');
  
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    error('Supabase credentials not found');
    return false;
  }
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Test connection by fetching from a simple table
    const { data, error: queryError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (queryError) {
      error(`Connection failed: ${queryError.message}`);
      return false;
    }
    
    success('Connected to Supabase successfully');
    return true;
  } catch (err) {
    error(`Connection error: ${err.message}`);
    return false;
  }
}

async function verifyDatabaseTables() {
  console.log('\n🗄️  Checking Database Tables...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  const requiredTables = [
    'profiles',
    'appointments',
    'dentists',
    'user_roles',
  ];
  
  let allTablesExist = true;
  
  for (const tableName of requiredTables) {
    try {
      const { data, error: queryError } = await supabase
        .from(tableName)
        .select('count')
        .limit(1);
      
      if (queryError) {
        if (queryError.code === '42P01') {
          error(`Table '${tableName}' does not exist`);
          allTablesExist = false;
        } else {
          warning(`Table '${tableName}' exists but query failed: ${queryError.message}`);
        }
      } else {
        success(`Table '${tableName}' exists`);
      }
    } catch (err) {
      error(`Error checking table '${tableName}': ${err.message}`);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

async function verifyDentistsData() {
  console.log('\n👨‍⚕️ Checking Dentists Data...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  try {
    const { data, error: queryError, count } = await supabase
      .from('dentists')
      .select('*', { count: 'exact' });
    
    if (queryError) {
      error(`Failed to fetch dentists: ${queryError.message}`);
      return false;
    }
    
    if (count === 0) {
      warning('No dentists found in database');
      info('Run migration: 20251027000003_add_sample_dentists.sql');
      return false;
    }
    
    success(`Found ${count} dentist(s) in database`);
    
    // Show dentist names
    if (data && data.length > 0) {
      console.log('\n   Dentists:');
      data.forEach((dentist, index) => {
        console.log(`   ${index + 1}. ${dentist.name} (${dentist.specialization})`);
      });
    }
    
    return true;
  } catch (err) {
    error(`Error checking dentists: ${err.message}`);
    return false;
  }
}

async function verifyAppointmentsTable() {
  console.log('\n📅 Checking Appointments Table...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  try {
    const { data, error: queryError, count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (queryError) {
      error(`Failed to fetch appointments: ${queryError.message}`);
      return false;
    }
    
    success(`Appointments table is accessible`);
    info(`Found ${count} appointment(s) in database`);
    
    // Check required columns
    if (data && data.length > 0) {
      const requiredColumns = [
        'patient_name',
        'patient_email',
        'patient_phone',
        'dentist_email',
        'appointment_date',
        'appointment_time',
        'status',
        'payment_method',
      ];
      
      const sampleAppointment = data[0];
      const missingColumns = requiredColumns.filter(col => !(col in sampleAppointment));
      
      if (missingColumns.length > 0) {
        warning(`Missing columns: ${missingColumns.join(', ')}`);
        info('Run migration: 20251027000000_fix_appointments_table.sql');
      } else {
        success('All required columns present');
      }
    }
    
    return true;
  } catch (err) {
    error(`Error checking appointments: ${err.message}`);
    return false;
  }
}

async function verifyAdminUsers() {
  console.log('\n👑 Checking Admin Users...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  try {
    const { data, error: queryError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('role', 'admin');
    
    if (queryError) {
      error(`Failed to fetch admin users: ${queryError.message}`);
      return false;
    }
    
    if (!data || data.length === 0) {
      warning('No admin users found');
      info('Grant admin role to karrarmayaly@gmail.com using SQL');
      return false;
    }
    
    success(`Found ${data.length} admin user(s)`);
    return true;
  } catch (err) {
    error(`Error checking admin users: ${err.message}`);
    return false;
  }
}

async function verifyBackendServer() {
  console.log('\n🚀 Checking Backend Server...');
  
  try {
    const response = await fetch('http://localhost:3000/health');
    
    if (response.ok) {
      success('Backend server is running on http://localhost:3000');
      return true;
    } else {
      error(`Backend server responded with status ${response.status}`);
      return false;
    }
  } catch (err) {
    error('Backend server is not running');
    info('Start backend: cd backend && npm run dev');
    return false;
  }
}

async function main() {
  const results = {
    envVars: await verifyEnvironmentVariables(),
    backendEnv: await verifyBackendEnv(),
    supabaseConnection: await verifySupabaseConnection(),
    databaseTables: await verifyDatabaseTables(),
    dentistsData: await verifyDentistsData(),
    appointmentsTable: await verifyAppointmentsTable(),
    adminUsers: await verifyAdminUsers(),
    backendServer: await verifyBackendServer(),
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Verification Summary:\n');
  
  const checks = [
    { name: 'Environment Variables', result: results.envVars },
    { name: 'Backend Configuration', result: results.backendEnv },
    { name: 'Supabase Connection', result: results.supabaseConnection },
    { name: 'Database Tables', result: results.databaseTables },
    { name: 'Dentists Data', result: results.dentistsData },
    { name: 'Appointments Table', result: results.appointmentsTable },
    { name: 'Admin Users', result: results.adminUsers },
    { name: 'Backend Server', result: results.backendServer },
  ];
  
  let passedChecks = 0;
  let totalChecks = checks.length;
  
  checks.forEach(check => {
    if (check.result) {
      success(check.name);
      passedChecks++;
    } else {
      error(check.name);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n${passedChecks}/${totalChecks} checks passed\n`);
  
  if (passedChecks === totalChecks) {
    success('🎉 System is ready for use!');
    console.log('\nNext steps:');
    console.log('1. Start frontend: npm run dev');
    console.log('2. Visit: http://localhost:5174');
    console.log('3. Sign in as admin: karrarmayaly@gmail.com');
  } else {
    warning('⚠️  System needs configuration');
    console.log('\nRefer to QUICK_SETUP_GUIDE.md for detailed instructions');
  }
  
  console.log('\n');
}

main().catch(console.error);
