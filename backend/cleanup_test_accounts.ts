
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

async function cleanupTestAccounts() {
    console.log('Starting cleanup of test/debug accounts...\n');

    // Get all profiles
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

    if (error) {
        console.error('Failed to list profiles:', error);
        return;
    }

    console.log(`Total profiles found: ${profiles.length}\n`);

    // Filter for test/debug accounts
    const testAccounts = profiles.filter(p => {
        const email = (p.email || '').toLowerCase();
        const name = (p.full_name || '').toLowerCase();

        return (
            email.includes('test') ||
            email.includes('debug') ||
            email.includes('@example.com') ||
            email.includes('direct') ||
            name.includes('test') ||
            name.includes('debug')
        );
    });

    // Real accounts to keep
    const realAccounts = profiles.filter(p => {
        const email = (p.email || '').toLowerCase();
        const name = (p.full_name || '').toLowerCase();

        return !(
            email.includes('test') ||
            email.includes('debug') ||
            email.includes('@example.com') ||
            email.includes('direct') ||
            name.includes('test') ||
            name.includes('debug')
        );
    });

    console.log('='.repeat(70));
    console.log('ACCOUNTS TO DELETE:');
    console.log('='.repeat(70));
    testAccounts.forEach(p => {
        console.log(`❌ ${p.full_name || 'No name'} (${p.email})`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('ACCOUNTS TO KEEP:');
    console.log('='.repeat(70));
    realAccounts.forEach(p => {
        console.log(`✅ ${p.full_name || 'No name'} (${p.email})`);
    });

    console.log('\n' + '='.repeat(70));
    console.log(`Will delete ${testAccounts.length} test accounts`);
    console.log(`Will keep ${realAccounts.length} real accounts`);
    console.log('='.repeat(70));

    if (testAccounts.length === 0) {
        console.log('\n✅ No test accounts found. Nothing to delete.');
        return;
    }

    console.log('\nStarting deletion...\n');

    for (const account of testAccounts) {
        console.log(`Deleting: ${account.email}`);

        // Delete from profiles
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', account.id);

        if (profileError) {
            console.error(`  ❌ Failed to delete profile:`, profileError.message);
            continue;
        }

        // Try to delete auth user (may already be deleted)
        try {
            await supabase.auth.admin.deleteUser(account.id);
            console.log(`  ✅ Deleted successfully`);
        } catch (authError) {
            console.log(`  ⚠️  Profile deleted (auth user may not exist)`);
        }
    }

    console.log('\n✅ Cleanup complete!');
}

cleanupTestAccounts().catch(console.error);
