
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

async function cleanupOrphanedProfiles() {
    console.log('Starting cleanup of orphaned profiles...');

    // 1. Get all profiles
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

    if (error) {
        console.error('Failed to list profiles:', error);
        return;
    }

    console.log(`Total profiles found: ${profiles.length}`);

    // 2. Filter for test profiles
    // Criteria: Name contains "Test Patient" or email contains "test.patient"
    const testProfiles = profiles.filter(p => {
        const fullName = p.full_name || '';
        const email = p.email || '';
        return fullName.includes('Test Patient') || email.includes('test.patient');
    });

    console.log(`Found ${testProfiles.length} test profiles to delete.`);

    if (testProfiles.length === 0) {
        console.log('No test profiles found.');
        return;
    }

    // 3. Delete them
    for (const profile of testProfiles) {
        console.log(`Deleting profile: ${profile.full_name} (${profile.email}) [${profile.id}]`);
        const { error: deleteError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', profile.id);

        if (deleteError) {
            console.error(`❌ Failed to delete profile ${profile.id}:`, deleteError.message);
        } else {
            console.log(`✅ Deleted profile ${profile.id}`);
        }
    }

    console.log('Cleanup complete.');
}

cleanupOrphanedProfiles().catch(console.error);
