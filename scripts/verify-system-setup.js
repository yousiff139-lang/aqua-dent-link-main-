#!/usr/bin/env node

/**
 * System Setup Verification Script
 * 
 * This script verifies that the Dental Care Connect booking system
 * is properly configured and ready to use.
 * 
 * Usage: node scripts/verify-system-setup.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper functions for colored output
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

// Load environment variables
function loadEnvFile(filePath) {
  try {
    const envContent = fs.readFileSync(filePath, 'utf-8');
    const env = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return env;
  } catch (error) {
    return null;
  }
}

// Main verification function
async function verifySystem() {
  console.log(`\n${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   Dental Care Connect - System Setup Verification         ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  let allChecksPassed = true;
  const issues = [];

  // ============================================================================
  // 1. Check Frontend Environment Variables
  // ============================================================================
  log.section('1. Frontend Environment Configuration');

  const frontendEnvPath = path.join(__dirname, '..', '.env');
  const frontendEnv = loadEnvFile(frontendEnvPath);

  if (!frontendEnv) {
    log.error('Frontend .env file not found');
    issues.push('Create .env file in project root');
    allChecksPassed = false;
  } else {
    log.success('Frontend .env file found');

    // Check required variables
    const requiredFrontendVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_PUBLISHABLE_KEY',
    ];

    requiredFrontendVars.forEach(varName => {
      if (frontendEnv[varName] && !frontendEnv[varName].includes('your-') && !frontendEnv[varName].includes('YOUR_')) {
        log.success(`${varName} is configured`);
      } else {
        log.error(`${varName} is missing or not configured`);
        issues.push(`Configure ${varName} in .env`);
        allChecksPassed = false;
      }
    });
  }

  // ============================================================================
  // 2. Check Backend Environment Variables
  // ============================================================================
  log.section('2. Backend Environment Configuration');

  const backendEnvPath = path.join(__dirname, '..', 'backend', '.env');
  const backendEnv = loadEnvFile(backendEnvPath);

  if (!backendEnv) {
    log.error('Backend .env file not found');
    issues.push('Create backend/.env file');
    allChecksPassed = false;
  } else {
    log.success('Backend .env file found');

    // Check required variables
    const requiredBackendVars = [
      { name: 'SUPABASE_URL', critical: true },
      { name: 'SUPABASE_ANON_KEY', critical: true },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', critical: true },
      { name: 'JWT_SECRET', critical: false },
      { name: 'STRIPE_SECRET_KEY', critical: false },
    ];

    requiredBackendVars.forEach(({ name, critical }) => {
      if (backendEnv[name] && !backendEnv[name].includes('your-') && !backendEnv[name].includes('YOUR_')) {
        log.success(`${name} is configured`);
      } else {
        if (critical) {
          log.error(`${name} is missing or not configured (CRITICAL)`);
          issues.push(`Configure ${name} in backend/.env`);
          allChecksPassed = false;
        } else {
          log.warning(`${name} is missing or not configured (optional)`);
        }
      }
    });
  }

  // ============================================================================
  // 3. Test Database Connection
  // ============================================================================
  log.section('3. Database Connection');

  if (frontendEnv && frontendEnv.VITE_SUPABASE_URL && frontendEnv.VITE_SUPABASE_PUBLISHABLE_KEY) {
    try {
      const supabase = createClient(
        frontendEnv.VITE_SUPABASE_URL,
        frontendEnv.VITE_SUPABASE_PUBLISHABLE_KEY
      );

      // Test connection by querying dentists table
      const { data, error } = await supabase
        .from('dentists')
        .select('id')
        .limit(1);

      if (error) {
        log.error(`Database connection failed: ${error.message}`);
        issues.push('Check Supabase credentials and database setup');
        allChecksPassed = false;
      } else {
        log.success('Database connection successful');
      }
    } catch (error) {
      log.error(`Database connection error: ${error.message}`);
      issues.push('Verify Supabase credentials');
      allChecksPassed = false;
    }
  } else {
    log.warning('Skipping database test (missing credentials)');
  }

  // ============================================================================
  // 4. Check Database Schema
  // ============================================================================
  log.section('4. Database Schema Verification');

  if (frontendEnv && frontendEnv.VITE_SUPABASE_URL && frontendEnv.VITE_SUPABASE_PUBLISHABLE_KEY) {
    try {
      const supabase = createClient(
        frontendEnv.VITE_SUPABASE_URL,
        frontendEnv.VITE_SUPABASE_PUBLISHABLE_KEY
      );

      // Check appointments table
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .limit(1);

      if (appointmentsError) {
        log.error(`Appointments table check failed: ${appointmentsError.message}`);
        issues.push('Apply database migration: supabase/migrations/20251027140000_fix_schema_cache_appointments.sql');
        allChecksPassed = false;
      } else {
        log.success('Appointments table exists and is accessible');
      }

      // Check dentists table
      const { data: dentists, error: dentistsError } = await supabase
        .from('dentists')
        .select('*')
        .limit(1);

      if (dentistsError) {
        log.error(`Dentists table check failed: ${dentistsError.message}`);
        issues.push('Verify dentists table exists in database');
        allChecksPassed = false;
      } else {
        log.success('Dentists table exists and is accessible');
        
        if (dentists && dentists.length > 0) {
          log.success(`Found ${dentists.length} dentist(s) in database`);
        } else {
          log.warning('No dentists found in database (add dentists to test booking)');
        }
      }
    } catch (error) {
      log.error(`Schema verification error: ${error.message}`);
      allChecksPassed = false;
    }
  } else {
    log.warning('Skipping schema verification (missing credentials)');
  }

  // ============================================================================
  // 5. Check Migration File
  // ============================================================================
  log.section('5. Migration File Check');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251027140000_fix_schema_cache_appointments.sql');
  
  if (fs.existsSync(migrationPath)) {
    log.success('Migration file exists');
    log.info('To apply: Copy content to Supabase SQL Editor and run');
  } else {
    log.error('Migration file not found');
    issues.push('Migration file is missing');
    allChecksPassed = false;
  }

  // ============================================================================
  // 6. Check Backend Server
  // ============================================================================
  log.section('6. Backend Server Check');

  try {
    const response = await fetch('http://localhost:3000/health');
    
    if (response.ok) {
      const data = await response.json();
      log.success('Backend server is running');
      log.success(`Database status: ${data.checks?.database || 'unknown'}`);
    } else {
      log.warning('Backend server responded with error');
      log.info('Start backend: cd backend && npm run dev');
    }
  } catch (error) {
    log.warning('Backend server is not running');
    log.info('Start backend: cd backend && npm run dev');
  }

  // ============================================================================
  // 7. Check Frontend Server
  // ============================================================================
  log.section('7. Frontend Server Check');

  try {
    const response = await fetch('http://localhost:5174');
    
    if (response.ok) {
      log.success('Frontend server is running');
    } else {
      log.warning('Frontend server responded with error');
    }
  } catch (error) {
    log.warning('Frontend server is not running');
    log.info('Start frontend: npm run dev');
  }

  // ============================================================================
  // Summary
  // ============================================================================
  console.log(`\n${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   Verification Summary                                     ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  if (allChecksPassed) {
    log.success('All critical checks passed! ✨');
    console.log('\n🚀 Your system is ready to use!\n');
    console.log('Next steps:');
    console.log('  1. Start backend: cd backend && npm run dev');
    console.log('  2. Start frontend: npm run dev');
    console.log('  3. Open: http://localhost:5174\n');
  } else {
    log.error('Some checks failed. Please fix the following issues:\n');
    issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
    console.log('\nSee QUICK_SETUP_GUIDE.md for detailed instructions.\n');
    process.exit(1);
  }
}

// Run verification
verifySystem().catch(error => {
  console.error(`\n${colors.red}Verification failed with error:${colors.reset}`, error);
  process.exit(1);
});
