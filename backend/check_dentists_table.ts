
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

async function checkDentistsTable() {
    console.log('Checking dentists table...\n');

    // Try to query the table
    const { data, error } = await supabase
        .from('dentists')
        .select('*')
        .limit(1);

    if (error) {
        console.log('❌ Error querying dentists table:', error);
        return;
    }

    console.log('✅ dentists table exists');

    if (data && data.length > 0) {
        console.log('\nSample record columns:');
        console.log(Object.keys(data[0]));
    } else {
        console.log('\nNo records in table, trying to insert test record...');

        const testRecord = {
            id: crypto.randomUUID(),
            name: 'Test',
            email: 'test@test.com',
            specialization: 'General Dentistry',
            status: 'active'
        };

        const { data: insertData, error: insertError } = await supabase
            .from('dentists')
            .insert(testRecord)
            .select();

        if (insertError) {
            console.log('❌ Insert failed:', insertError);
            console.log('This tells us what columns might be missing or have issues');
        } else {
            console.log('✅ Insert successful');
            // Clean up
            await supabase.from('dentists').delete().eq('id', testRecord.id);
        }
    }
}

checkDentistsTable().catch(console.error);
