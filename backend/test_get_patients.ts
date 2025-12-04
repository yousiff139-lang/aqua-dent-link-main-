
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

async function testGetPatients() {
    console.log('Testing get patients...\n');

    try {
        const response = await axios.get(
            `${API_URL}/admin/patients`,
            { headers: { 'x-admin-api-key': ADMIN_API_KEY } }
        );

        console.log('✅ SUCCESS!');
        console.log('Total Patients:', response.data.pagination?.total);
        console.log('Data sample:', JSON.stringify(response.data.data.slice(0, 2), null, 2));

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

testGetPatients().catch(console.error);
