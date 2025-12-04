
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

async function cleanupTestUsers() {
    console.log('Starting cleanup of test users...');

    // 1. Get all users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
        console.error('Failed to list users:', usersError);
        return;
    }

    console.log(`Total users found: ${users.length}`);

    console.log('Listing all users:');
    users.forEach(u => {
        console.log(`- ${u.email} (${u.user_metadata?.full_name}) [${u.id}]`);
    });

    // 2. Filter for users to delete
    // Keep only known valid users
    const validEmails = ['yousiff139@gmail.com', 'karrarmayaly@gmail.com'];

    const testUsers = users.filter(user => {
        const email = (user.email || '').trim();
        return !validEmails.includes(email);
    });

    console.log(`Found ${testUsers.length} test users to delete.`);

    if (testUsers.length === 0) {
        console.log('No test users found.');
        return;
    }

    // 3. Delete them
    for (const user of testUsers) {
        console.log(`Deleting user: ${user.email} (${user.id})`);
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

        if (deleteError) {
            console.error(`❌ Failed to delete user ${user.email}:`, deleteError.message);
        } else {
            console.log(`✅ Deleted user ${user.email}`);

            // Also ensure profile is deleted (should cascade but good to be sure)
            const { error: profileError } = await supabase.from('profiles').delete().eq('id', user.id);
            if (profileError) {
                console.warn(`   ⚠️ Failed to delete profile for ${user.email} (might already be gone):`, profileError.message);
            }
        }
    }

    console.log('Cleanup complete.');
}

cleanupTestUsers().catch(console.error);
