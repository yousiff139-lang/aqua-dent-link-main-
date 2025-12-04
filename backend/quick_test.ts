import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function quickTest() {
    console.log('Testing profile upsert...\n');

    const testId = '00000000-0000-0000-0000-000000000001';

    try {
        const { data, error } = await supabase
            .from('profiles')
            .upsert({
                id: testId,
                full_name: 'Quick Test',
                email: 'quicktest@test.com',
                role: 'dentist',
            }, {
                onConflict: 'id'
            })
            .select();

        if (error) {
            console.error('ERROR:', error);
        } else {
            console.log('SUCCESS:', data);
        }

        // Clean up
        await supabase.from('profiles').delete().eq('id', testId);

    } catch (err: any) {
        console.error('EXCEPTION:', err.message);
    }
}

quickTest();
