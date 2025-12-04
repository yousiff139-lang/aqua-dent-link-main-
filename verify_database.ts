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

async function verifyDatabase() {
    console.log('='.repeat(60));
    console.log('DATABASE VERIFICATION');
    console.log('='.repeat(60));

    // Check dentists
    console.log('\n1. DENTISTS TABLE:');
    const { data: dentists, error: dentistsError } = await supabase
        .from('dentists')
        .select('id, name, email, specialization, status');

    if (dentistsError) {
        console.error('❌ Error fetching dentists:', dentistsError.message);
    } else {
        console.log(`✅ Found ${dentists?.length || 0} dentists`);
        (dentists || []).forEach((d: any) => {
            console.log(`   - ${d.name} (${d.email}) - ${d.status}`);
        });
    }

    // Check profiles
    console.log('\n2. PROFILES TABLE:');
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role');

    if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError.message);
    } else {
        console.log(`✅ Found ${profiles?.length || 0} profiles`);
        const dentistProfiles = (profiles || []).filter((p: any) => p.role === 'dentist');
        console.log(`   - ${dentistProfiles.length} dentist profiles`);
        const patientProfiles = (profiles || []).filter((p: any) => p.role === 'patient');
        console.log(`   - ${patientProfiles.length} patient profiles`);
    }

    // Check appointments
    console.log('\n3. APPOINTMENTS TABLE:');
    const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id, patient_name, appointment_date, status');

    if (appointmentsError) {
        console.error('❌ Error fetching appointments:', appointmentsError.message);
    } else {
        console.log(`✅ Found ${appointments?.length || 0} appointments`);
        (appointments || []).slice(0, 5).forEach((a: any) => {
            console.log(`   - ${a.patient_name} on ${a.appointment_date} - ${a.status}`);
        });
    }

    // Check RLS policies
    console.log('\n4. RLS POLICIES CHECK:');
    if (dentistsError) {
        console.log('❌ RLS policies may still be blocking access (see errors above)');
    } else if (profilesError) {
        console.log('❌ RLS policies may still be blocking access (see errors above)');
    } else {
        console.log('✅ RLS policies appear to be working (no access errors)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Dentists: ${dentists?.length || 0}`);
    console.log(`Profiles: ${profiles?.length || 0}`);
    console.log(`Appointments: ${appointments?.length || 0}`);
    console.log('='.repeat(60));
}

verifyDatabase();
