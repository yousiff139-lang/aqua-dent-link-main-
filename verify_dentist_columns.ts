
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from root or backend
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (!process.env.VITE_SUPABASE_URL) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    console.log('Tried VITE_SUPABASE_URL, SUPABASE_URL');
    console.log('Tried VITE_SUPABASE_ANON_KEY, SUPABASE_ANON_KEY, VITE_SUPABASE_PUBLISHABLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDentistColumns() {
    console.log('Fetching one dentist...');
    const { data, error } = await supabase
        .from('dentists')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching dentist:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No dentists found.');
        return;
    }

    const dentist = data[0];
    console.log('Dentist keys:', Object.keys(dentist));
    console.log('Has image_url:', 'image_url' in dentist);
    console.log('Has profile_picture:', 'profile_picture' in dentist);
    console.log('Sample image_url:', dentist.image_url);
}

verifyDentistColumns();
