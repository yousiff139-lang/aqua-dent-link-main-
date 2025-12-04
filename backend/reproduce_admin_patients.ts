
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from .env in the current directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

const API_URL = 'http://localhost:3001/api';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY. Cannot use admin.createUser.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testAdminPatients() {
    console.log('>>> STARTING ADMIN PATIENTS TEST <<<');

    // 1. Create a test user (patient)
    const timestamp = Date.now();
    const testEmail = `test.patient.${timestamp}@example.com`;
    const testPassword = 'password123';
    const testName = 'Test Patient ' + timestamp;

    console.log(`1. Creating test user: ${testEmail}`);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
            full_name: testName,
        },
    });

    if (authError) {
        console.error('❌ Failed to create test user:', authError.message);
        return;
    }

    const userId = authData.user?.id;
    if (!userId) {
        console.error('❌ User created but no ID returned');
        return;
    }
    console.log(`✅ User created with ID: ${userId}`);

    // Ensure profile exists
    // COMMENTED OUT TO TEST TRIGGER
    /*
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            email: testEmail,
            full_name: testName,
            created_at: new Date().toISOString(),
        });

    if (profileError) {
        console.error('❌ Failed to create profile:', profileError.message);
    } else {
        console.log('✅ Profile ensured');
    }
    */
    console.log('ℹ️ Manual profile creation skipped to test trigger.');

    // 1.5 Create multiple appointments for this user
    console.log('1.5 Creating multiple appointments...');

    // Get a valid dentist ID
    const { data: dentists } = await supabase.from('dentists').select('id').limit(1);
    const dentistId = dentists && dentists.length > 0 ? dentists[0].id : null;

    if (!dentistId) {
        console.warn('⚠️ No dentist found. Cannot create appointments with valid dentist_id.');
    } else {
        const appointmentsToCreate = 3;
        for (let i = 0; i < appointmentsToCreate; i++) {
            const { error: aptError } = await supabase
                .from('appointments')
                .insert({
                    patient_id: userId,
                    appointment_date: new Date().toISOString(),
                    status: 'pending',
                    dentist_id: dentistId,
                    treatment_type: 'Checkup'
                });

            if (aptError) {
                console.warn(`Failed to create appointment ${i}:`, aptError.message);
            }
        }
    }

    // 2. Fetch patients as Admin
    console.log('2. Fetching patients via Admin API...');

    // Get API key from env
    const adminApiKeys = process.env.ADMIN_API_KEYS ? process.env.ADMIN_API_KEYS.split(',') : [];
    const apiKey = adminApiKeys.length > 0 ? adminApiKeys[0].trim() : 'any-key-for-dev';

    try {
        const response = await axios.get(`${API_URL}/admin/patients`, {
            headers: {
                'x-admin-api-key': apiKey,
            },
            params: {
                limit: 100,
            }
        });

        console.log(`Admin API Status: ${response.status}`);
        const patients = response.data.data;
        console.log(`Total patients found: ${patients.length}`);

        const foundUsers = patients.filter((p: any) => p.email === testEmail);
        console.log(`Test user found ${foundUsers.length} times.`);

        if (foundUsers.length > 1) {
            console.error('❌ DUPLICATION DETECTED! User appears multiple times.');
        } else if (foundUsers.length === 1) {
            console.log('✅ User appears exactly once.');
            console.log('User stats:', foundUsers[0]);
            if (foundUsers[0].totalAppointments >= 0) {
                console.log(`Confirmed appointment count: ${foundUsers[0].totalAppointments}`);
            }
        } else {
            console.error('❌ Test user NOT found in admin list!');
        }

    } catch (error: any) {
        console.error('❌ Admin API call failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.status, error.response.data);
        }
    }

    // Cleanup
    console.log('3. Cleaning up...');
    await supabase.auth.admin.deleteUser(userId);
    console.log('✅ Test user deleted');

    console.log('>>> ENDING TEST <<<');
}

testAdminPatients();
