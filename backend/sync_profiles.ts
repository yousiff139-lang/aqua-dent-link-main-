
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

async function syncProfiles() {
    console.log('Starting profile synchronization...');

    // 1. Get all users from auth.users
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

    const profileIds = new Set(profiles.map(p => p.id));
    const missingProfiles = users.filter(u => !profileIds.has(u.id));

    console.log(`Users without profiles: ${missingProfiles.length}`);

    if (missingProfiles.length === 0) {
        console.log('✅ All users have profiles. No action needed.');
        return;
    }

    // 3. Create missing profiles
    for (const user of missingProfiles) {
        console.log(`Creating profile for user: ${user.email} (${user.id})`);

        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User',
                created_at: user.created_at,
            });

        if (insertError) {
            console.error(`❌ Failed to create profile for ${user.email}:`, insertError.message);
        } else {
            console.log(`✅ Profile created for ${user.email}`);
        }
    }

    console.log('Synchronization complete.');
}

syncProfiles().catch(console.error);
