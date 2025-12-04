import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    console.log('🔌 Connecting to Supabase...');

    const migrationPath = join(process.cwd(), 'supabase/migrations/20251202000000_fix_appointment_schema.sql');
    console.log(`📖 Reading migration file: ${migrationPath}`);

    try {
        const sql = readFileSync(migrationPath, 'utf-8');
        console.log('🚀 Applying migration...');

        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }

        console.log('✅ Migration applied successfully!');
        console.log('   Added columns: chronic_diseases, gender, is_pregnant, medications, allergies, previous_dental_work, smoking, symptoms');

    } catch (err) {
        console.error('❌ Error applying migration:', err);
        process.exit(1);
    }
}

applyMigration();
