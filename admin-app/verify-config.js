/**
 * Admin App Configuration Verification Script
 * Run with: node verify-config.js
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Verifying Admin App Configuration...\n');

// Check .env file
try {
  const envPath = join(__dirname, '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  
  console.log('✅ .env file found');
  
  // Parse environment variables
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim().replace(/"/g, '');
    }
  });
  
  // Check required variables
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_PROJECT_ID'
  ];
  
  console.log('\n📋 Environment Variables:');
  required.forEach(key => {
    if (envVars[key]) {
      const value = envVars[key];
      const masked = key.includes('KEY') 
        ? value.substring(0, 20) + '...' 
        : value;
      console.log(`  ✅ ${key}: ${masked}`);
    } else {
      console.log(`  ❌ ${key}: MISSING`);
    }
  });
  
  // Check project ID consistency
  const projectId = envVars['VITE_SUPABASE_PROJECT_ID'];
  const url = envVars['VITE_SUPABASE_URL'];
  
  if (projectId && url) {
    const urlProjectId = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (urlProjectId === projectId) {
      console.log('\n✅ Project ID matches URL');
    } else {
      console.log('\n⚠️  WARNING: Project ID mismatch!');
      console.log(`   URL project: ${urlProjectId}`);
      console.log(`   ENV project: ${projectId}`);
    }
  }
  
  // Compare with main app
  try {
    const mainEnvPath = join(__dirname, '..', '.env');
    const mainEnvContent = readFileSync(mainEnvPath, 'utf-8');
    const mainEnvVars = {};
    mainEnvContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        mainEnvVars[key.trim()] = value.trim().replace(/"/g, '');
      }
    });
    
    const mainProjectId = mainEnvVars['VITE_SUPABASE_PROJECT_ID'];
    
    console.log('\n🔄 Comparing with Main App:');
    if (mainProjectId === projectId) {
      console.log('  ✅ Using SAME Supabase project');
      console.log('  📊 Shared database - appointments sync automatically');
    } else {
      console.log('  ⚠️  Using DIFFERENT Supabase projects');
      console.log(`  Main app: ${mainProjectId}`);
      console.log(`  Admin app: ${projectId}`);
      console.log('  ⚠️  Data will NOT sync between apps!');
    }
  } catch (err) {
    console.log('\n⚠️  Could not compare with main app .env');
  }
  
} catch (err) {
  console.log('❌ Error reading .env file:', err.message);
  console.log('\n💡 Create .env file from .env.example:');
  console.log('   cp .env.example .env');
}

// Check package.json
try {
  const pkgPath = join(__dirname, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  
  console.log('\n📦 Package Info:');
  console.log(`  Name: ${pkg.name}`);
  console.log(`  Version: ${pkg.version}`);
  
  // Check important dependencies
  const deps = {
    'react': pkg.dependencies?.react,
    '@supabase/supabase-js': pkg.dependencies?.['@supabase/supabase-js'],
    '@tanstack/react-query': pkg.dependencies?.['@tanstack/react-query'],
    'react-router-dom': pkg.dependencies?.['react-router-dom']
  };
  
  console.log('\n📚 Key Dependencies:');
  Object.entries(deps).forEach(([name, version]) => {
    if (version) {
      console.log(`  ✅ ${name}: ${version}`);
    } else {
      console.log(`  ❌ ${name}: NOT INSTALLED`);
    }
  });
  
} catch (err) {
  console.log('\n❌ Error reading package.json:', err.message);
}

// Check if ErrorBoundary exists
try {
  const errorBoundaryPath = join(__dirname, 'src', 'components', 'ErrorBoundary.tsx');
  readFileSync(errorBoundaryPath, 'utf-8');
  console.log('\n✅ ErrorBoundary component exists');
} catch (err) {
  console.log('\n❌ ErrorBoundary component not found');
}

console.log('\n' + '='.repeat(60));
console.log('📊 Verification Complete');
console.log('='.repeat(60));

console.log('\n💡 Next Steps:');
console.log('1. If project IDs differ, decide if intentional');
console.log('2. Run: npm install (if dependencies missing)');
console.log('3. Run: npm run dev (to start admin app)');
console.log('4. Access: http://localhost:3010');
console.log('5. Login with admin credentials');
console.log('\n');
