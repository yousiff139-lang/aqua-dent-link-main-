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

async function checkAppointments() {
    console.log('\n===== CHECKING APPOINTMENTS =====\n');

    const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching appointments:', error.message);
        return;
    }

    console.log(`Found ${appointments?.length || 0} appointments\n`);

    if (appointments && appointments.length > 0) {
        console.log('Appointments details:');
        appointments.forEach((apt, index) => {
            console.log(`\n${index + 1}. Appointment ID: ${apt.id}`);
            console.log(`   Patient: ${apt.patient_name} (${apt.patient_email})`);
            console.log(`   Dentist: ${apt.dentist_name || 'Not assigned'}`);
            console.log(`   Date: ${apt.appointment_date}`);
            console.log(`   Time: ${apt.appointment_time}`);
            console.log(`   Status: ${apt.status}`);
            console.log(`   Created: ${apt.created_at}`);
        });
    } else {
        console.log('No appointments found in database.');
    }
}

checkAppointments();
