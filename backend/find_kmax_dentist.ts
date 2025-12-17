// Query the database to find K Max dentist
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials!');
    console.log('SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.log('SUPABASE_KEY:', supabaseKey ? '✓' : '✗');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findKMaxDentist() {
    console.log('\\n=== Searching for K Max dentist ===\\n');

    // Search in dentists table
    console.log('1. Searching in DENTISTS table...');
    const { data: dentists, error: dentistsError } = await supabase
        .from('dentists')
        .select('*')
        .or('name.ilike.%max%,name.ilike.%k max%,email.ilike.%max%');

    if (dentistsError) {
        console.error('   Error querying dentists:', dentistsError.message);
    } else {
        console.log(`   Found ${dentists?.length || 0} matches in dentists table:`);
        dentists?.forEach(d => {
            console.log(`   - ID: ${d.id}`);
            console.log(`     Name: ${d.name}`);
            console.log(`     Email: ${d.email}`);
            console.log(`     Status: ${d.status}`);
            console.log('');
        });
    }

    // Search in profiles table
    console.log('\\n2. Searching in PROFILES table...');
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .or('full_name.ilike.%max%,full_name.ilike.%k max%,email.ilike.%max%');

    if (profilesError) {
        console.error('   Error querying profiles:', profilesError.message);
    } else {
        console.log(`   Found ${profiles?.length || 0} matches in profiles table:`);
        profiles?.forEach(p => {
            console.log(`   - ID: ${p.id}`);
            console.log(`     Name: ${p.full_name}`);
            console.log(`     Email: ${p.email}`);
            console.log(`     Role: ${p.role}`);
            console.log('');
        });
    }

    // List all dentists
    console.log('\\n3. Listing ALL dentists in the database...');
    const { data: allDentists, error: allDentistsError } = await supabase
        .from('dentists')
        .select('id, name, email, status')
        .order('created_at', { ascending: false })
        .limit(10);

    if (allDentistsError) {
        console.error('   Error:', allDentistsError.message);
    } else {
        console.log(`   Latest ${allDentists?.length || 0} dentists:`);
        allDentists?.forEach(d => {
            console.log(`   - ${d.name} | ${d.email} | ${d.status}`);
        });
    }
}

findKMaxDentist().catch(console.error);
