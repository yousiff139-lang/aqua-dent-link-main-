
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '.env') });

const API_URL = 'http://localhost:3001/api';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_API_KEY = process.env.ADMIN_API_KEYS?.split(',')[0]?.trim();

if (!SUPABASE_URL || !SUPABASE_KEY || !ADMIN_API_KEY) {
    console.error('Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testDentistSynchronization() {
    console.log('='.repeat(70));
    console.log('DENTIST SYNCHRONIZATION TEST');
    console.log('='.repeat(70));

    const timestamp = Date.now();
    const testDentist = {
        name: `Test Dentist ${timestamp}`,
        email: `test.dentist.${timestamp}@example.com`,
        specialization: 'General Dentistry',
        phone: '+1-555-0100',
        years_of_experience: 5,
        education: 'DDS, Test University',
        bio: 'Test dentist for synchronization verification'
    };

    let dentistId: string | null = null;
    let tempPassword: string | null = null;

    try {
        // ============================================================
        // TEST 1: Add Dentist via Admin API
        // ============================================================
        console.log('\n📝 TEST 1: Adding dentist via Admin Panel...');
        console.log('-'.repeat(70));

        const createResponse = await axios.post(
            `${API_URL}/admin/dentists`,
            testDentist,
            {
                headers: { 'x-admin-api-key': ADMIN_API_KEY }
            }
        );

        dentistId = createResponse.data.dentist.id;
        tempPassword = createResponse.data.tempPassword;

        if (!dentistId || !tempPassword) {
            console.error('❌ Failed to get dentist ID or password from response');
            return;
        }

        console.log(`✅ Dentist created with ID: ${dentistId}`);
        console.log(`   Email: ${testDentist.email}`);
        console.log(`   Temp Password: ${tempPassword}`);

        // ============================================================
        // TEST 2: Verify Dentist in Database Tables
        // ============================================================
        console.log('\n📝 TEST 2: Verifying dentist in database tables...');
        console.log('-'.repeat(70));

        // Check auth.users
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const authUser = users.find(u => u.id === dentistId);
        console.log(authUser ? '✅ Found in auth.users' : '❌ NOT found in auth.users');

        // Check profiles table
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', dentistId)
            .maybeSingle();
        console.log(profile ? '✅ Found in profiles table' : '❌ NOT found in profiles table');

        // Check dentists table
        const { data: dentist } = await supabase
            .from('dentists')
            .select('*')
            .eq('id', dentistId)
            .maybeSingle();
        console.log(dentist ? '✅ Found in dentists table' : '❌ NOT found in dentists table');

        // Check user_roles table
        const { data: role } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', dentistId)
            .maybeSingle();
        console.log(role ? '✅ Found in user_roles table' : '❌ NOT found in user_roles table');

        // ============================================================
        // TEST 3: Verify Dentist Portal Login
        // ============================================================
        console.log('\n📝 TEST 3: Testing Dentist Portal login...');
        console.log('-'.repeat(70));

        try {
            const loginResponse = await axios.post(`${API_URL}/dentist/login`, {
                email: testDentist.email
            });

            if (loginResponse.data.token && loginResponse.data.dentist) {
                console.log('✅ Dentist can log into Dentist Portal');
                console.log(`   Name: ${loginResponse.data.dentist.full_name}`);
                console.log(`   Email: ${loginResponse.data.dentist.email}`);
            } else {
                console.log('❌ Login succeeded but missing token or dentist data');
            }
        } catch (error: any) {
            console.log('❌ Dentist Portal login failed:', error.response?.data?.message || error.message);
        }

        // ============================================================
        // TEST 4: Verify Dentist in Public API (User Web App)
        // ============================================================
        console.log('\n📝 TEST 4: Verifying dentist appears in User Web App...');
        console.log('-'.repeat(70));

        try {
            const dentistsResponse = await axios.get(`${API_URL}/dentists`);
            const foundDentist = dentistsResponse.data.find((d: any) => d.id === dentistId);

            if (foundDentist) {
                console.log('✅ Dentist found in User Web App dentist list');
                console.log(`   Name: ${foundDentist.name}`);
                console.log(`   Specialization: ${foundDentist.specialization}`);
            } else {
                console.log('❌ Dentist NOT found in User Web App dentist list');
            }
        } catch (error: any) {
            console.log('❌ Failed to fetch dentists from User Web App:', error.message);
        }

        // ============================================================
        // TEST 5: Remove Dentist via Admin API
        // ============================================================
        console.log('\n📝 TEST 5: Removing dentist via Admin Panel...');
        console.log('-'.repeat(70));

        await axios.delete(
            `${API_URL}/admin/dentists/${dentistId}`,
            {
                headers: { 'x-admin-api-key': ADMIN_API_KEY }
            }
        );

        console.log('✅ Dentist deleted successfully');

        // ============================================================
        // TEST 6: Verify Dentist Removed from All Tables
        // ============================================================
        console.log('\n📝 TEST 6: Verifying dentist removed from database...');
        console.log('-'.repeat(70));

        // Check auth.users
        const { data: { users: usersAfter } } = await supabase.auth.admin.listUsers();
        const authUserAfter = usersAfter.find(u => u.id === dentistId);
        console.log(!authUserAfter ? '✅ Removed from auth.users' : '❌ STILL in auth.users');

        // Check profiles table
        const { data: profileAfter } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', dentistId)
            .maybeSingle();
        console.log(!profileAfter ? '✅ Removed from profiles table' : '❌ STILL in profiles table');

        // Check dentists table
        const { data: dentistAfter } = await supabase
            .from('dentists')
            .select('*')
            .eq('id', dentistId)
            .maybeSingle();
        console.log(!dentistAfter ? '✅ Removed from dentists table' : '❌ STILL in dentists table');

        // Check user_roles table
        const { data: roleAfter } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', dentistId)
            .maybeSingle();
        console.log(!roleAfter ? '✅ Removed from user_roles table' : '❌ STILL in user_roles table');

        // ============================================================
        // TEST 7: Verify Dentist Portal Access Denied
        // ============================================================
        console.log('\n📝 TEST 7: Verifying Dentist Portal access denied...');
        console.log('-'.repeat(70));

        try {
            await axios.post(`${API_URL}/dentist/login`, {
                email: testDentist.email
            });
            console.log('❌ Dentist can still log into Dentist Portal (should fail)');
        } catch (error: any) {
            if (error.response?.status === 404 || error.response?.data?.message?.includes('not found')) {
                console.log('✅ Dentist Portal access correctly denied');
            } else {
                console.log('⚠️  Login failed with unexpected error:', error.response?.data?.message || error.message);
            }
        }

        // ============================================================
        // TEST 8: Verify Dentist Removed from User Web App
        // ============================================================
        console.log('\n📝 TEST 8: Verifying dentist removed from User Web App...');
        console.log('-'.repeat(70));

        try {
            const dentistsResponseAfter = await axios.get(`${API_URL}/dentists`);
            const foundDentistAfter = dentistsResponseAfter.data.find((d: any) => d.id === dentistId);

            if (!foundDentistAfter) {
                console.log('✅ Dentist correctly removed from User Web App');
            } else {
                console.log('❌ Dentist STILL appears in User Web App');
            }
        } catch (error: any) {
            console.log('❌ Failed to fetch dentists from User Web App:', error.message);
        }

        console.log('\n' + '='.repeat(70));
        console.log('TEST COMPLETE');
        console.log('='.repeat(70));

    } catch (error: any) {
        console.error('\n❌ Test failed with error:', error.response?.data || error.message);

        // Cleanup attempt
        if (dentistId) {
            console.log('\nAttempting cleanup...');
            try {
                await axios.delete(
                    `${API_URL}/admin/dentists/${dentistId}`,
                    {
                        headers: { 'x-admin-api-key': ADMIN_API_KEY }
                    }
                );
                console.log('✅ Cleanup successful');
            } catch (cleanupError) {
                console.log('⚠️  Cleanup failed (dentist may already be deleted)');
            }
        }
    }
}

testDentistSynchronization().catch(console.error);
