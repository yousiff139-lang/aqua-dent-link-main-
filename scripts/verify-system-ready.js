/**
 * System Readiness Verification Script
 * Run this to check if all components are properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Dental Care Connect - System Readiness Check\n');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

// Check 1: Frontend .env file
console.log('1️⃣  Checking frontend environment variables...');
try {
  const frontendEnv = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
  
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_API_URL'
  ];
  
  let allPresent = true;
  requiredVars.forEach(varName => {
    if (!frontendEnv.includes(varName)) {
      console.log(`   ❌ Missing: ${varName}`);
      allPresent = false;
      checks.failed++;
    }
  });
  
  if (allPresent) {
    console.log('   ✅ All required frontend variables present');
    checks.passed++;
  }
} catch (error) {
  console.log('   ❌ Frontend .env file not found');
  checks.failed++;
}

// Check 2: Backend .env file
console.log('\n2️⃣  Checking backend environment variables...');
try {
  const backendEnv = fs.readFileSync(path.join(__dirname, '../backend/.env'), 'utf8');
  
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  let allPresent = true;
  requiredVars.forEach(varName => {
    if (!backendEnv.includes(varName)) {
      console.log(`   ❌ Missing: ${varName}`);
      allPresent = false;
      checks.failed++;
    } else if (backendEnv.includes(`${varName}=YOUR_`) || backendEnv.includes(`${varName}=your_`)) {
      console.log(`   ⚠️  ${varName} needs to be set (placeholder value detected)`);
      checks.warnings++;
      allPresent = false;
    }
  });
  
  if (allPresent) {
    console.log('   ✅ All required backend variables present and configured');
    checks.passed++;
  }
} catch (error) {
  console.log('   ❌ Backend .env file not found');
  checks.failed++;
}

// Check 3: Migration file exists
console.log('\n3️⃣  Checking database migration file...');
const migrationPath = path.join(__dirname, '../supabase/migrations/20251027140000_fix_schema_cache_appointments.sql');
if (fs.existsSync(migrationPath)) {
  console.log('   ✅ Migration file exists');
  console.log('   ⚠️  IMPORTANT: Have you applied this migration in Supabase Dashboard?');
  checks.passed++;
  checks.warnings++;
} else {
  console.log('   ❌ Migration file not found');
  checks.failed++;
}

// Check 4: Backend dependencies
console.log('\n4️⃣  Checking backend dependencies...');
const backendPackageJson = path.join(__dirname, '../backend/package.json');
const backendNodeModules = path.join(__dirname, '../backend/node_modules');
if (fs.existsSync(backendPackageJson)) {
  if (fs.existsSync(backendNodeModules)) {
    console.log('   ✅ Backend dependencies installed');
    checks.passed++;
  } else {
    console.log('   ⚠️  Backend dependencies not installed. Run: cd backend && npm install');
    checks.warnings++;
  }
} else {
  console.log('   ❌ Backend package.json not found');
  checks.failed++;
}

// Check 5: Frontend dependencies
console.log('\n5️⃣  Checking frontend dependencies...');
const frontendPackageJson = path.join(__dirname, '../package.json');
const frontendNodeModules = path.join(__dirname, '../node_modules');
if (fs.existsSync(frontendPackageJson)) {
  if (fs.existsSync(frontendNodeModules)) {
    console.log('   ✅ Frontend dependencies installed');
    checks.passed++;
  } else {
    console.log('   ⚠️  Frontend dependencies not installed. Run: npm install');
    checks.warnings++;
  }
} else {
  console.log('   ❌ Frontend package.json not found');
  checks.failed++;
}

// Check 6: Key files exist
console.log('\n6️⃣  Checking key application files...');
const keyFiles = [
  '../src/components/BookingForm.tsx',
  '../src/pages/DentistProfile.tsx',
  '../src/pages/Admin.tsx',
  '../backend/src/routes/index.ts',
  '../backend/src/controllers/appointments.controller.ts'
];

let allFilesExist = true;
keyFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ Missing: ${file}`);
    allFilesExist = false;
    checks.failed++;
  }
});

if (allFilesExist) {
  console.log('   ✅ All key application files present');
  checks.passed++;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${checks.passed}`);
console.log(`⚠️  Warnings: ${checks.warnings}`);
console.log(`❌ Failed: ${checks.failed}`);

if (checks.failed === 0 && checks.warnings === 0) {
  console.log('\n🎉 System is ready! You can start the application.');
  console.log('\nNext steps:');
  console.log('1. Apply database migration in Supabase Dashboard');
  console.log('2. Start backend: cd backend && npm run dev');
  console.log('3. Start frontend: npm run dev');
} else if (checks.failed === 0) {
  console.log('\n⚠️  System is mostly ready, but has warnings.');
  console.log('Please address the warnings above before proceeding.');
} else {
  console.log('\n❌ System is NOT ready. Please fix the failed checks above.');
}

console.log('\n📚 For detailed setup instructions, see:');
console.log('   - PRODUCTION_SETUP_CHECKLIST.md');
console.log('   - APPLY_MIGRATION_URGENT.md');
console.log('');

process.exit(checks.failed > 0 ? 1 : 0);
