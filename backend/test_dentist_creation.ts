import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('🔍 Testing Dentist Creation...\n');
console.log('Environment Check:');
console.log('✓ SUPABASE_URL:', supabaseUrl ? 'Set' : '❌ MISSING');
console.log('✓ SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : '❌ MISSING');
console.log('');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function testDentistCreation() {
    const testEmail = `test.dentist.${Date.now()}@example.com`;
    const testPassword = 'Test123!@#';
    let userId: string | null = null;

    try {
        console.log('Step 1: Creating auth user...');
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: testEmail,
            password: testPassword,
            email_confirm: true,
            user_metadata: {
                full_name: 'Test Dentist',
                role: 'dentist'
            }
        });

        if (authError) {
            console.error('❌ Auth user creation failed:', authError.message);
            return;
        }

        console.log(' Auth user created:', authData.user.id);
        userId = authData.user.id;

        console.log('\nStep 2: Waiting for trigger to create profile...');
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('\nStep 3: Updating profile with role...');
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .update({
                full_name: 'Test Dentist',
                role: 'dentist',
            })
            .eq('id', userId)
            .select();

        if (profileError) {
            console.error('❌ Profile update failed:', profileError.message);
            console.error('Error details:', JSON.stringify(profileError, null, 2));
            return;
        }

        console.log('✅ Profile updated successfully');

        console.log('\nStep 4: Creating dentist record...');
        const { data: dentistData, error: dentistError } = await supabase
            .from('dentists')
            .upsert({
                id: userId,
                name: 'Test Dentist',
                email: testEmail,
                specialization: 'General Dentistry',
                status: 'active',
            }, {
                onConflict: 'id'
            })
            .select();

        if (dentistError) {
            console.error('❌ Dentist record creation failed:', dentistError.message);
            console.error('Error details:', JSON.stringify(dentistError, null, 2));
            return;
        }

        console.log('✅ Dentist record created');

        console.log('\n✅ SUCCESS! All steps completed successfully!');
        console.log('Test dentist ID:', userId);
        console.log('Test email:', testEmail);

    } catch (error: any) {
        console.error('\n❌ Unexpected error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (userId) {
            console.log('\n🧹 Cleaning up test data...');
            try {
                await supabase.from('dentists').delete().eq('id', userId);
                await supabase.from('profiles').delete().eq('id', userId);
                await supabase.auth.admin.deleteUser(userId);
                console.log('✅ Cleanup complete');
            } catch (cleanupError: any) {
                console.error(' Cleanup failed:', cleanupError.message);
            }
        }
    }
}

testDentistCreation();
