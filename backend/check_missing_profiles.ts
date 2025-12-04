
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function checkMissingProfiles() {
    console.log('Checking for users without profiles...');

    // 1. Get all users from auth.users (requires service role)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
        console.error('Failed to list users:', usersError);
        return;
    }

    console.log(`Total auth users: ${users.length}`);

    // 2. Get all profiles
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id');

    if (profilesError) {
        console.error('Failed to list profiles:', profilesError);
        return;
    }

    console.log(`Total profiles: ${profiles.length}`);

    const profileIds = new Set(profiles.map(p => p.id));
    const missingProfiles = users.filter(u => !profileIds.has(u.id));

    console.log(`Users without profiles: ${missingProfiles.length}`);

    if (missingProfiles.length > 0) {
        console.log('IDs of users without profiles:');
        missingProfiles.forEach(u => console.log(`- ${u.id} (${u.email})`));
    } else {
        console.log('✅ All users have profiles.');
    }
}

checkMissingProfiles().catch(console.error);
