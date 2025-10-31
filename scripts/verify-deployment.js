#!/usr/bin/env node

/**
 * Automated System Verification Script
 * Verifies database, backend, and frontend are working correctly
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}${colors.reset}\n`),
};

// Load environment variables
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    log.error('.env file not found');
    return null;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      env[key] = value;
    }
  });

  return env;
}

// Verify environment variables
function verifyEnvironment(env) {
  log.section('1. ENVIRONMENT VARIABLES');
  
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_API_URL',
  ];

  let allPresent = true;
  required.forEach(key => {
    if (env[key]) {
      log.success(`${key} is set`);
    } else {
      log.error(`${key} is missing`);
      allPresent = false;
    }
  });

  return allPresent;
}

// Verify database connection and schema
async function verifyDatabase(env) {
  log.section('2. DATABASE VERIFICATION');

  try {
    const supabase = createClient(
      env.VITE_SUPABASE_URL,
      env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    // Check appointments table
    log.info('Checking appointments table...');
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id')
      .limit(1);

    if (appointmentsError) {
      log.error(`Appointments table error: ${appointmentsError.message}`);
      return false;
    }
    log.success('Appointments table exists and is accessible');

    // Check dentists table
    log.info('Checking dentists table...');
    const { data: dentists, error: dentistsError } = await supabase
      .from('dentists')
      .select('id, name, email')
      .limit(3);

    if (dentistsError) {
      log.error(`Dentists table error: ${dentistsError.message}`);
      return false;
    }

    if (!dentists || dentists.length === 0) {
      log.warning('Dentists table is empty - run insert-6-dentists.sql');
    } else {
      log.success(`Dentists table has ${dentists.length} dentists`);
    }

    // Test public insert (critical for booking form)
    log.info('Testing public insert capability...');
    const testAppointment = {
      patient_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      patient_name: 'Test Patient',
      patient_email: 'test@example.com',
      patient_phone: '555-0100',
      appointment_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      appointment_time: '10:00:00',
      status: 'pending',
    };

    const { data: insertTest, error: insertError } = await supabase
      .from('appointments')
      .insert(testAppointment)
      .select()
      .single();

    if (insertError) {
      log.error(`Public insert failed: ${insertError.message}`);
      log.warning('This means booking form will NOT work for public users');
      return false;
    }

    log.success('Public insert works - booking form will work!');

    // Clean up test appointment
    if (insertTest) {
      await supabase.from('appointments').delete().eq('id', insertTest.id);
      log.info('Cleaned up test appointment');
    }

    return true;
  } catch (error) {
    log.error(`Database verification failed: ${error.message}`);
    return false;
  }
}

// Verify backend API
async function verifyBackend(env) {
  log.section('3. BACKEND API VERIFICATION');

  const apiUrl = env.VITE_API_URL || 'http://localhost:3000';

  try {
    // Check health endpoint
    log.info(`Checking backend at ${apiUrl}...`);
    const healthResponse = await axios.get(`${apiUrl}/health`, {
      timeout: 5000,
    });

    if (healthResponse.status === 200) {
      log.success('Backend health endpoint responding');
    } else {
      log.warning(`Backend returned status ${healthResponse.status}`);
    }

    // Check appointments API
    log.info('Checking appointments API...');
    const appointmentsResponse = await axios.get(`${apiUrl}/api/appointments`, {
      timeout: 5000,
    });

    if (appointmentsResponse.status === 200) {
      log.success('Appointments API responding');
    }

    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log.error('Backend is not running');
      log.info('Start backend with: cd backend && npm run dev');
    } else if (error.code === 'ETIMEDOUT') {
      log.error('Backend request timed out');
    } else {
      log.error(`Backend error: ${error.message}`);
    }
    return false;
  }
}

// Verify frontend configuration
function verifyFrontend() {
  log.section('4. FRONTEND VERIFICATION');

  // Check if package.json exists
  const packagePath = path.join(__dirname, '..', 'package.json');
  if (!fs.existsSync(packagePath)) {
    log.error('package.json not found');
    return false;
  }
  log.success('Main app package.json found');

  // Check dentist portal
  const dentistPortalPath = path.join(__dirname, '..', 'dentist-portal', 'package.json');
  if (fs.existsSync(dentistPortalPath)) {
    log.success('Dentist portal found');
  } else {
    log.warning('Dentist portal not found');
  }

  // Check admin app
  const adminAppPath = path.join(__dirname, '..', 'admin-app', 'package.json');
  if (fs.existsSync(adminAppPath)) {
    log.success('Admin app found');
  } else {
    log.warning('Admin app not found');
  }

  return true;
}

// Main verification function
async function main() {
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════╗
║                                                            ║
║         DENTAL CARE CONNECT SYSTEM VERIFICATION            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
  `);

  const env = loadEnv();
  if (!env) {
    log.error('Failed to load environment variables');
    process.exit(1);
  }

  const results = {
    environment: false,
    database: false,
    backend: false,
    frontend: false,
  };

  // Run verifications
  results.environment = verifyEnvironment(env);
  results.database = await verifyDatabase(env);
  results.backend = await verifyBackend(env);
  results.frontend = verifyFrontend();

  // Summary
  log.section('VERIFICATION SUMMARY');

  const allPassed = Object.values(results).every(r => r === true);

  if (allPassed) {
    log.success('ALL CHECKS PASSED! ✨');
    log.info('Your system is ready for use');
    console.log('\nNext steps:');
    console.log('1. Start frontend: npm run dev');
    console.log('2. Start backend: cd backend && npm run dev');
    console.log('3. Open browser: http://localhost:5173');
    console.log('4. Test booking flow');
  } else {
    log.error('SOME CHECKS FAILED');
    console.log('\nFailed checks:');
    Object.entries(results).forEach(([key, passed]) => {
      if (!passed) {
        console.log(`  - ${key}`);
      }
    });
    console.log('\nRefer to VERIFY_SYSTEM_COMPLETE.md for detailed troubleshooting');
  }

  console.log('\n');
  process.exit(allPassed ? 0 : 1);
}

// Run verification
main().catch(error => {
  log.error(`Verification script failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
