
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const API_URL = 'http://localhost:3001/api';
const ADMIN_API_KEY = process.env.ADMIN_API_KEYS?.split(',')[0]?.trim();

if (!ADMIN_API_KEY) {
    console.error('Missing ADMIN_API_KEY');
    process.exit(1);
}

async function testDentistCreation() {
    console.log('Testing dentist creation...\n');

    const testDentist = {
        name: 'Dr. Test Dentist',
        email: `test.dentist.${Date.now()}@example.com`,
        specialization: 'General Dentistry',
        phone: '+1-555-0100',
        years_of_experience: 5,
        education: 'DDS, Test University',
        bio: 'Test dentist bio'
    };

    try {
        console.log('Sending request with data:', testDentist);

        const response = await axios.post(
            `${API_URL}/admin/dentists`,
            testDentist,
            {
                headers: { 'x-admin-api-key': ADMIN_API_KEY }
            }
        );

        console.log('\n✅ SUCCESS!');
        console.log('Response:', JSON.stringify(response.data, null, 2));

    } catch (error: any) {
        console.log('\n❌ FAILED!');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error Message:', error.message);
            console.log('Full Error:', error);
        }
    }
}

testDentistCreation().catch(console.error);
