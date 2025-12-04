
import axios from 'axios';
import fs from 'fs';

const API_URL = 'http://localhost:3001/api';
const DENTIST_EMAIL = 'sarah.johnson@example.com';

async function testDentistAuth() {
    const log = (msg: string) => {
        console.error(msg);
        fs.appendFileSync('error_log.txt', msg + '\n');
    };

    fs.writeFileSync('error_log.txt', 'STARTING TEST\n');

    try {
        log('1. Login...');
        const loginResponse = await axios.post(`${API_URL}/auth/dentist/login`, {
            email: DENTIST_EMAIL
        });

        log(`Login Status: ${loginResponse.status}`);
        const { token, dentist } = loginResponse.data.data;

        if (!token) {
            log('❌ No token received!');
            return;
        }
        log('✅ Token received');

        log('2. Test PUT with dummy ID...');
        const dummyId = '00000000-0000-0000-0000-000000000000';
        try {
            const updateResponse = await axios.put(`${API_URL}/appointments/${dummyId}`,
                { status: 'completed' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            log(`✅ Update successful (unexpected)! Status: ${updateResponse.status}`);
        } catch (err: any) {
            log(`❌ Update failed: ${err.message}`);
            if (err.response) {
                log(`Response Status: ${err.response.status}`);
                log(`Response Data: ${JSON.stringify(err.response.data, null, 2)}`);
            }
        }

    } catch (error: any) {
        log(`❌ Test failed: ${error.message}`);
    }
    log('>>> ENDING TEST <<<');
}

testDentistAuth();
