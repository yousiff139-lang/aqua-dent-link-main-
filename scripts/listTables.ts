/**
 * List all tables in the Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
function loadEnvFile() {
  try {
    const envPath = resolve(__dirname, '../.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const envVars: Record<string, string> = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          let value = valueParts.join('=').trim();
          // Remove surrounding quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          envVars[key.trim()] = value;
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('Warning: Could not load .env file');
    return {};
  }
}

const envVars = loadEnvFile();
const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('📋 Listing all tables in the database...\n');
  
  // Try to query information_schema
  const { data, error } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `
    });
  
  if (error) {
    console.log('⚠️  Cannot query information_schema directly');
    console.log('Trying alternative method...\n');
    
    // Try common table names
    const commonTables = [
      'appointments',
      'appointment',
      'dentists',
      'dentist',
      'users',
      'user_roles',
      'profiles',
      'dentist_availability',
      'time_slot_reservations',
      'notifications',
      'documents',
      'chatbot_conversations'
    ];
    
    console.log('Testing common table names:\n');
    
    for (const tableName of commonTables) {
      const { error: testError } = await supabase
        .from(tableName)
        .select('id')
        .limit(0);
      
      if (!testError) {
        console.log(`✅ ${tableName}`);
      } else if (testError.code === 'PGRST204') {
        console.log(`⚠️  ${tableName} (exists but empty or no access)`);
      }
    }
  } else {
    console.log('Tables found:');
    data.forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });
  }
}

listTables().catch(console.error);
