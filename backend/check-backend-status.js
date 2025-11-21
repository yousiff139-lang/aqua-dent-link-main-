#!/usr/bin/env node

/**
 * Check Backend Server Status
 * This script checks if the backend server is running and accessible
 */

const http = require('http');

const PORT = process.env.PORT || 3001;
const API_PREFIX = process.env.API_PREFIX || '/api';
const BASE_URL = `http://localhost:${PORT}`;

const checkEndpoint = (path, description) => {
  return new Promise((resolve) => {
    const url = `${BASE_URL}${path}`;
    const startTime = Date.now();
    
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;
        const success = res.statusCode >= 200 && res.statusCode < 300;
        resolve({
          path,
          description,
          success,
          statusCode: res.statusCode,
          duration,
          data: data.substring(0, 200), // First 200 chars
        });
      });
    });

    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        path,
        description,
        success: false,
        error: error.message,
        duration,
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        path,
        description,
        success: false,
        error: 'Request timeout (5s)',
        duration: 5000,
      });
    });
  });
};

const main = async () => {
  console.log('🔍 Checking Backend Server Status...\n');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔌 Port: ${PORT}\n`);

  const checks = [
    { path: '/health', description: 'Health Check' },
    { path: `${API_PREFIX}/admin/dashboard/stats`, description: 'Admin Dashboard Stats' },
    { path: `${API_PREFIX}/admin/patients`, description: 'Admin Patients' },
  ];

  const results = await Promise.all(checks.map(check => checkEndpoint(check.path, check.description)));

  console.log('📊 Results:\n');
  
  let allPassed = true;
  results.forEach((result) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.description}`);
    console.log(`   Path: ${result.path}`);
    
    if (result.success) {
      console.log(`   Status: ${result.statusCode}`);
      console.log(`   Response Time: ${result.duration}ms`);
    } else {
      allPassed = false;
      console.log(`   Error: ${result.error || 'Failed'}`);
      if (result.statusCode) {
        console.log(`   Status Code: ${result.statusCode}`);
      }
    }
    console.log();
  });

  if (allPassed) {
    console.log('✅ Backend server is running and accessible!\n');
    process.exit(0);
  } else {
    console.log('❌ Backend server is not responding correctly.\n');
    console.log('💡 Troubleshooting:');
    console.log('   1. Make sure the backend is running: cd backend && npm run dev');
    console.log('   2. Check if port', PORT, 'is available');
    console.log('   3. Verify environment variables in backend/.env');
    console.log('   4. Check backend logs for errors\n');
    process.exit(1);
  }
};

main().catch((error) => {
  console.error('❌ Script error:', error);
  process.exit(1);
});

