
import { adminService } from './src/services/admin.service.js';
import { dentistsRepository } from './src/repositories/dentists.repository.js';
import { supabase } from './src/config/supabase.js';

async function verify() {
    console.log('Starting verification...');

    // 1. Verify Admin Patients List (should exclude dentists)
    console.log('\n--- Verifying Admin Patients List ---');
    try {
        const patients = await adminService.getPatients({ limit: 100 });
        console.log(`Fetched ${patients.data.length} users from getPatients.`);

        // Check if any have role 'dentist' (we need to check DB for their role as getPatients doesn't return role)
        const patientIds = patients.data.map(p => p.id);
        if (patientIds.length > 0) {
            const { data: profilesWithRole } = await supabase
                .from('profiles')
                .select('id, role, full_name')
                .in('id', patientIds);

            const dentistsInList = profilesWithRole?.filter(p => p.role === 'dentist' || p.role === 'admin');

            if (dentistsInList && dentistsInList.length > 0) {
                console.error('FAIL: Found dentists or admins in patients list:', dentistsInList);
            } else {
                console.log('PASS: No dentists or admins found in patients list.');
            }
        } else {
            console.log('No patients found to verify.');
        }
    } catch (error) {
        console.error('Error verifying admin patients:', error);
    }

    // 2. Verify Public Dentists List (should include all dentists)
    console.log('\n--- Verifying Public Dentists List ---');
    try {
        const allDentists = await dentistsRepository.findAll({});
        console.log(`Fetched ${allDentists.length} dentists from findAll.`);

        // Get count of actual dentist profiles in DB
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'dentist');

        console.log(`Total dentist profiles in DB: ${count}`);

        if (allDentists.length === count) {
            console.log('PASS: Fetched dentist count matches DB count.');
        } else {
            console.warn(`WARNING: Fetched count (${allDentists.length}) does not match DB count (${count}).`);
        }

        // Check if we have dentists with missing details (simulated by checking if they came from profiles)
        const dentistsWithDefaults = allDentists.filter(d => d.specialization === 'General Dentistry' && d.rating === 5.0);
        console.log(`Dentists with default values (likely missing specific record): ${dentistsWithDefaults.length}`);

        if (allDentists.length > 0) {
            console.log('Sample dentist:', JSON.stringify(allDentists[0], null, 2));
        }

    } catch (error) {
        console.error('Error verifying public dentists:', error);
    }

    process.exit(0);
}

verify();
