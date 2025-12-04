
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

async function testDentistDeletion() {
    console.log('Testing dentist deletion...\n');

    // 1. Create a dentist first
    const testDentist = {
        name: 'Dr. To Be Deleted',
        email: `delete.me.${Date.now()}@example.com`,
        specialization: 'General Dentistry',
        phone: '+1-555-9999',
        years_of_experience: 2,
        education: 'DDS, Temporary Univ',
        bio: 'I will be deleted soon'
    };

    let dentistId: string | null = null;

    try {
        console.log('1. Creating dentist to delete...');
        const createResponse = await axios.post(
            `${API_URL}/admin/dentists`,
            testDentist,
            { headers: { 'x-admin-api-key': ADMIN_API_KEY } }
        );

        console.log('Create Response Data:', JSON.stringify(createResponse.data, null, 2));

        const responseData = createResponse.data;
        if (!responseData || !responseData.data || !responseData.data.dentist) {
            throw new Error('Invalid response format: missing dentist object');
        }

        dentistId = responseData.data.dentist.id;
        console.log('   Dentist created with ID:', dentistId);

        if (!dentistId) throw new Error('Failed to get dentist ID');

        // 2. Delete the dentist
        console.log('\n2. Deleting dentist...');
        const deleteResponse = await axios.delete(
            `${API_URL}/admin/dentists/${dentistId}`,
            { headers: { 'x-admin-api-key': ADMIN_API_KEY } }
        );

        console.log('   Delete response:', deleteResponse.data);

        console.log('\n✅ SUCCESS! Dentist created and deleted.');

    } catch (error: any) {
        console.log('\n❌ FAILED!');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error Message:', error.message);
        }
    }
}

testDentistDeletion().catch(console.error);
