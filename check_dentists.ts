// Quick check of dentists table
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

async function main() {
    console.log('=== CHECKING DENTISTS ===\n');

    // Get ALL dentists (no filter)
    const { data: allDentists, error: error1 } = await supabase
        .from('dentists')
        .select('id, name, status, email');

    if (error1) {
        console.error('Error:', error1);
        return;
    }

    console.log(`Total dentists in DB: ${allDentists?.length || 0}`);
    allDentists?.forEach((d, i) => {
        console.log(`${i + 1}. ${d.name} | status: ${d.status} | email: ${d.email}`);
    });

    // Get only active dentists
    const { data: activeDentists, error: error2 } = await supabase
        .from('dentists')
        .select('id, name')
        .eq('status', 'active');

    console.log(`\nActive dentists (status='active'): ${activeDentists?.length || 0}`);

    if (allDentists && allDentists.length > 0 && (!activeDentists || activeDentists.length === 0)) {
        console.log('\n⚠️  PROBLEM: Dentists exist but none have status="active"!');
        console.log('FIX: Run this SQL to activate all dentists:');
        console.log("UPDATE dentists SET status = 'active' WHERE status IS NULL OR status != 'active';");
    }
}

main().catch(console.error);
