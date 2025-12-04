
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (!process.env.VITE_SUPABASE_URL) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or ANON Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDentists() {
    console.log('Checking dentists table...');
    const { data: dentists, error } = await supabase
        .from('dentists')
        .select('*');

    if (error) {
        console.error('Error fetching dentists:', error);
    } else {
        console.log(`Found ${dentists?.length || 0} dentists in 'dentists' table.`);
        (dentists || []).forEach((d: any) => console.log(`- ${d.name} (${d.email})`));
    }

    console.log('\nChecking profiles with role dentist...');
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'dentist');

    if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
    } else {
        console.log(`Found ${profiles?.length || 0} profiles with role 'dentist'.`);
        (profiles || []).forEach((p: any) => console.log(`- ${p.full_name} (${p.email})`));
    }
}

checkDentists();
