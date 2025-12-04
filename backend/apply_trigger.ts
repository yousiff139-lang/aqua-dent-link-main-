
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from .env in the current directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function applyTrigger() {
    console.log('Applying profile creation trigger...');

    const sqlPath = path.resolve(__dirname, 'create_profile_trigger.sql');
    let sqlContent = '';

    try {
        sqlContent = readFileSync(sqlPath, 'utf-8');
    } catch (err) {
        console.error(`Failed to read SQL file at ${sqlPath}:`, err);
        process.exit(1);
    }

    console.log(`Read SQL file (${sqlContent.length} bytes). Executing...`);

    const { error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });

    if (error) {
        console.error('❌ Failed to apply trigger:', error);
        // Fallback: try to execute via raw query if rpc fails (unlikely if runMigrations works)
        // But wait, runMigrations uses rpc. So rpc must exist.
        // If rpc fails, maybe the function doesn't exist?
        if (error.message.includes('function "exec_sql" does not exist')) {
            console.error('   The exec_sql RPC function does not exist. You may need to run this SQL manually in the Supabase dashboard.');
        }
    } else {
        console.log('✅ Trigger applied successfully.');
    }
}

applyTrigger().catch(console.error);
