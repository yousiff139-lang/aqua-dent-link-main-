
import { supabase } from './src/config/supabase.js';

async function debug() {
    console.log('Debugging Supabase queries...');

    try {
        console.log('1. Querying profiles...');
        const { data: profiles, error: pError } = await supabase.from('profiles').select('id, role').limit(5);
        if (pError) console.error('Profiles error:', pError);
        else console.log('Profiles found:', profiles?.length);

        console.log('2. Querying dentists...');
        const { data: dentists, error: dError } = await supabase.from('dentists').select('id').limit(5);
        if (dError) console.error('Dentists error:', dError);
        else console.log('Dentists found:', dentists?.length);

        console.log('3. Querying profiles with embedded dentists...');
        const { data: joined, error: jError } = await supabase
            .from('profiles')
            .select('id, dentist:dentists(*)')
            .eq('role', 'dentist')
            .limit(5);

        if (jError) {
            console.error('Join error:', jError);
            console.error('Join error details:', jError.message, jError.details, jError.hint);
        } else {
            console.log('Join successful. Data:', JSON.stringify(joined, null, 2));
        }

    } catch (e) {
        console.error('Unexpected error:', e);
    }

    process.exit(0);
}

debug();
