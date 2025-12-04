import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllData() {
    console.log('\n===== PROFILES =====');
    const { data: profiles } = await supabase.from('profiles').select('*');
    console.table(profiles || []);

    console.log('\n===== DENTISTS =====');
    const { data: dentists } = await supabase.from('dentists').select('*');
    console.table(dentists || []);

    console.log('\n===== USER_ROLES =====');
    const { data: roles } = await supabase.from('user_roles').select('*');
    console.table(roles || []);

    console.log('\n===== APPOINTMENTS =====');
    const { data: appointments } = await supabase.from('appointments').select('id, patient_name, dentist_name, appointment_date, status').limit(10);
    console.table(appointments || []);

    console.log('\n===== SUMMARY =====');
    console.log(`Profiles: ${profiles?.length || 0}`);
    console.log(`Dentists: ${dentists?.length || 0}`);
    console.log(`Roles: ${roles?.length || 0}`);
    console.log(`Appointments: ${appointments?.length || 0}`);
}

listAllData();
