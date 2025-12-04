
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

async function testManualDentistCreation() {
    console.log('Testing manual dentist creation with actual database schema...\n');

    const email = `test.manual.${Date.now()}@example.com`;
    const name = 'Dr. Manual Test';

    try {
        // Step 1: Create auth user
        console.log('1. Creating auth user...');
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password: 'TempPassword123!',
            email_confirm: true,
            user_metadata: {
                role: 'dentist',
                full_name: name,
            },
        });

        if (authError || !authData?.user) {
            console.error('❌ Auth creation failed:', authError);
            return;
        }

        const userId = authData.user.id;
        console.log('✅ Auth user created:', userId);

        // Step 2: Create profile (WITHOUT phone - might be causing issues)
        console.log('\n2. Creating profile...');
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: userId,
            full_name: name,
            email,
            // Remove phone to see if that's causing the issue
        });

        if (profileError) {
            console.error('❌ Profile creation failed:', profileError);
            await supabase.auth.admin.deleteUser(userId);
            return;
        }
        console.log('✅ Profile created');

        // Step 3: Create dentist record
        console.log('\n3. Creating dentist record...');
        const { error: dentistError } = await supabase.from('dentists').upsert({
            id: userId,
            name,
            email,
            expertise: ['General Dentistry'],
            status: 'active',
            education: 'DDS, Test University',
        });

        if (dentistError) {
            console.error('❌ Dentist creation failed:', dentistError);
            await supabase.from('profiles').delete().eq('id', userId);
            await supabase.auth.admin.deleteUser(userId);
            return;
        }
        console.log('✅ Dentist record created');

        console.log('\n✅✅✅ SUCCESS! All steps completed.');
        console.log(`Dentist ID: ${userId}`);
        console.log(`Email: ${email}`);

        // Cleanup
        console.log('\n4. Cleaning up...');
        await supabase.from('dentists').delete().eq('id', userId);
        await supabase.from('profiles').delete().eq('id', userId);
        await supabase.auth.admin.deleteUser(userId);
        console.log('✅ Cleanup complete');

    } catch (error) {
        console.error('\n❌ Unexpected error:', error);
    }
}

testManualDentistCreation().catch(console.error);
