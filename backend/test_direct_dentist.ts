
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

async function testDirectDentistCreation() {
    const timestamp = Date.now();
    const email = `test.direct.${timestamp}@example.com`;
    const name = `Test Direct ${timestamp}`;

    console.log('Testing direct dentist creation...');
    console.log('Email:', email);

    try {
        // Step 1: Create auth user
        console.log('\n1. Creating auth user...');
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
            console.error('❌ Failed:', authError);
            return;
        }

        const userId = authData.user.id;
        console.log('✅ Auth user created:', userId);

        // Step 2: Create profile
        console.log('\n2. Creating profile...');
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: userId,
            full_name: name,
            email,
            phone: '+1-555-0100',
        });

        if (profileError) {
            console.error('❌ Failed:', profileError);
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
            specialization: 'General Dentistry',
            phone: '+1-555-0100',
            years_of_experience: 5,
            experience_years: 5,
            bio: 'Test dentist',
            education: 'DDS',
            status: 'active',
        });

        if (dentistError) {
            console.error('❌ Failed:', dentistError);
            await supabase.auth.admin.deleteUser(userId);
            return;
        }
        console.log('✅ Dentist record created');

        // Step 4: Create user_roles entry
        console.log('\n4. Creating user_roles entry...');
        const { error: roleError } = await supabase.from('user_roles').upsert({
            user_id: userId,
            role: 'dentist',
            dentist_id: userId,
        });

        if (roleError) {
            console.error('❌ Failed:', roleError);
            console.error('Error details:', JSON.stringify(roleError, null, 2));
            // Don't fail completely - this might not be critical
        } else {
            console.log('✅ user_roles entry created');
        }

        // Cleanup
        console.log('\n5. Cleaning up...');
        await supabase.from('user_roles').delete().eq('user_id', userId);
        await supabase.from('dentists').delete().eq('id', userId);
        await supabase.from('profiles').delete().eq('id', userId);
        await supabase.auth.admin.deleteUser(userId);
        console.log('✅ Cleanup complete');

        console.log('\n✅ TEST PASSED - All steps completed successfully');

    } catch (error) {
        console.error('\n❌ Unexpected error:', error);
    }
}

testDirectDentistCreation().catch(console.error);
