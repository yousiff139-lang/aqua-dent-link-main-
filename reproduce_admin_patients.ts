
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('Starting reproduction script...');

    // 1. Create a new user
    const email = `test_user_${Date.now()}@example.com`;
    const password = 'password123';
    const name = `Test User ${Date.now()}`;

    console.log(`Creating user: ${email}`);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name: name,
        },
    });

    if (authError || !authData.user) {
        console.error('Failed to create user:', authError);
        return;
    }

    const userId = authData.user.id;
    console.log(`User created with ID: ${userId}`);

    // 2. Create profile for the user (simulating what happens on signup)
    const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        full_name: name,
        email: email,
        role: 'patient', // Explicitly setting role to patient
    });

    if (profileError) {
        console.error('Failed to create profile:', profileError);
        // Cleanup
        await supabase.auth.admin.deleteUser(userId);
        return;
    }

    console.log('Profile created.');

    // 3. Assign 'patient' role in user_roles (if your system uses it)
    const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: userId,
        role: 'patient',
    });

    if (roleError) {
        console.warn('Failed to assign role in user_roles (might be optional):', roleError);
    } else {
        console.log('User role assigned.');
    }


    // 4. Fetch patients using the admin service logic (simulated here)
    console.log('Fetching patients...');

    // Replicating the logic from admin.service.ts
    const { data: dentists } = await supabase.from('dentists').select('id');
    const dentistIds = (dentists || []).map(d => d.id).filter(Boolean);

    const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
    const adminIds = (admins || []).map(a => a.user_id).filter(Boolean);

    const { data: dentistRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'dentist');
    const dentistRoleIds = (dentistRoles || []).map(a => a.user_id).filter(Boolean);

    const excludeIds = [...new Set([...dentistIds, ...adminIds, ...dentistRoleIds])];

    console.log(`Excluding ${excludeIds.length} IDs.`);
    if (excludeIds.includes(userId)) {
        console.error('ERROR: The new user ID is in the exclusion list!');
    } else {
        console.log('The new user ID is NOT in the exclusion list.');
    }

    let query = supabase
        .from('profiles')
        .select('id, full_name, email')
        .not('id', 'in', `(${excludeIds.join(',')})`);

    const { data: patients, error: fetchError } = await query;

    if (fetchError) {
        console.error('Failed to fetch patients:', fetchError);
    } else {
        const found = patients?.find(p => p.id === userId);
        if (found) {
            console.log('SUCCESS: New user found in patients list.');
        } else {
            console.error('FAILURE: New user NOT found in patients list.');
            console.log('Total patients fetched:', patients?.length);
        }
    }

    // Cleanup
    console.log('Cleaning up...');
    await supabase.auth.admin.deleteUser(userId);
    await supabase.from('profiles').delete().eq('id', userId);
    await supabase.from('user_roles').delete().eq('user_id', userId);
}

main().catch(console.error);
