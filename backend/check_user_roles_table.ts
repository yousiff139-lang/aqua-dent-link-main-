
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSchema() {
    console.log('Checking for user_roles table...');

    // Try to query the table
    const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ user_roles table does NOT exist or is not accessible');
        console.error('Error:', error);
    } else {
        console.log('✅ user_roles table exists');
        console.log('Sample data:', data);
    }
}

checkSchema().catch(console.error);
