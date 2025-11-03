/**
 * Sync Dentists to Supabase
 * This script ensures all dentists from the User Web App are available in the Dentist Portal
 * Run with: npx tsx scripts/syncDentistsToSupabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env file
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env');
    const envFile = readFileSync(envPath, 'utf-8');
    const envVars: Record<string, string> = {};
    
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
    
    Object.assign(process.env, envVars);
  } catch (error) {
    // .env file might not exist, use process.env directly
    console.warn('Could not load .env file, using process.env');
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// All 6 dentists from the User Web App
const dentists = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@example.com',
    specialization: 'General Dentistry',
    rating: 4.8,
    experience_years: 10,
    phone: '+1-555-0101',
    address: '123 Main St, City, State',
    bio: 'Experienced general dentist with focus on preventive care and patient comfort. Specializes in routine cleanings, fillings, and oral health maintenance.',
    education: 'DDS from Harvard University',
    expertise: ['Preventive Care', 'Restorative Dentistry', 'Oral Health'],
    image_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=800&fit=crop',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Dr. Michael Chen',
    email: 'michael.chen@example.com',
    specialization: 'Orthodontics',
    rating: 4.9,
    experience_years: 15,
    phone: '+1-555-0102',
    address: '456 Oak Ave, City, State',
    bio: 'Specialist in orthodontic treatments and braces. Expert in creating beautiful, straight smiles with the latest techniques.',
    education: 'DDS from Stanford University, Orthodontics Residency',
    expertise: ['Braces', 'Invisalign', 'Jaw Surgery'],
    image_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&h=800&fit=crop',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Dr. Emily Rodriguez',
    email: 'emily.rodriguez@example.com',
    specialization: 'Pediatric Dentistry',
    rating: 4.7,
    experience_years: 8,
    phone: '+1-555-0103',
    address: '789 Pine St, City, State',
    bio: 'Dedicated to children\'s dental health and comfort. Specializes in making dental visits fun and stress-free for young patients.',
    education: 'DDS from UCLA, Pediatric Dentistry Fellowship',
    expertise: ['Child Dental Care', 'Sedation Dentistry', 'Preventive Care'],
    image_url: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=800&h=800&fit=crop',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'Dr. James Wilson',
    email: 'james.wilson@example.com',
    specialization: 'Oral Surgery',
    rating: 4.6,
    experience_years: 12,
    phone: '+1-555-0104',
    address: '321 Elm St, City, State',
    bio: 'Expert in complex oral and maxillofacial surgeries. Specializes in wisdom teeth removal, dental implants, and reconstructive procedures.',
    education: 'DDS from Columbia University, Oral Surgery Residency',
    expertise: ['Wisdom Teeth', 'Implants', 'Jaw Surgery'],
    image_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&h=800&fit=crop',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'Dr. Lisa Thompson',
    email: 'lisa.thompson@example.com',
    specialization: 'Cosmetic Dentistry',
    rating: 4.9,
    experience_years: 14,
    phone: '+1-555-0105',
    address: '654 Maple Dr, City, State',
    bio: 'Specialist in cosmetic and aesthetic dental treatments. Expert in smile makeovers, veneers, and teeth whitening procedures.',
    education: 'DDS from NYU, Cosmetic Dentistry Fellowship',
    expertise: ['Veneers', 'Teeth Whitening', 'Smile Design'],
    image_url: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800&h=800&fit=crop',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    name: 'Dr. Robert Brown',
    email: 'robert.brown@example.com',
    specialization: 'Endodontics',
    rating: 4.8,
    experience_years: 11,
    phone: '+1-555-0106',
    address: '987 Cedar Ln, City, State',
    bio: 'Root canal specialist with advanced techniques. Focuses on saving teeth and providing pain-free endodontic treatments.',
    education: 'DDS from University of Michigan, Endodontics Residency',
    expertise: ['Root Canals', 'Endodontic Surgery', 'Pain Management'],
    image_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800&h=800&fit=crop',
  },
];

async function syncDentists() {
  console.log('🔄 Starting dentist synchronization...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const dentist of dentists) {
    try {
      // Check if dentist already exists
      const { data: existing } = await supabase
        .from('dentists')
        .select('id, email')
        .eq('id', dentist.id)
        .single();

      if (existing) {
        // Update existing dentist
        const { error: updateError } = await supabase
          .from('dentists')
          .update({
            name: dentist.name,
            email: dentist.email,
            specialization: dentist.specialization,
            rating: dentist.rating,
            experience_years: dentist.experience_years,
            years_of_experience: dentist.experience_years, // Support both column names
            phone: dentist.phone,
            address: dentist.address,
            bio: dentist.bio,
            education: dentist.education,
            expertise: dentist.expertise,
            image_url: dentist.image_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dentist.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`✅ Updated: ${dentist.name} (${dentist.email})`);
        successCount++;
      } else {
        // Insert new dentist
        const { error: insertError } = await supabase
          .from('dentists')
          .insert({
            id: dentist.id,
            name: dentist.name,
            email: dentist.email,
            specialization: dentist.specialization,
            rating: dentist.rating,
            experience_years: dentist.experience_years,
            years_of_experience: dentist.experience_years,
            phone: dentist.phone,
            address: dentist.address,
            bio: dentist.bio,
            education: dentist.education,
            expertise: dentist.expertise,
            image_url: dentist.image_url,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          throw insertError;
        }

        console.log(`✅ Inserted: ${dentist.name} (${dentist.email})`);
        successCount++;
      }

      // Also ensure profile exists (for future use)
      const { data: profileExists } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', dentist.id)
        .single();

      if (!profileExists) {
        // Create profile entry
        await supabase
          .from('profiles')
          .insert({
            id: dentist.id,
            email: dentist.email,
            full_name: dentist.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .catch(() => {
            // Ignore profile errors, not critical
          });
      } else {
        // Update profile if exists
        await supabase
          .from('profiles')
          .update({
            email: dentist.email,
            full_name: dentist.name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dentist.id)
          .catch(() => {
            // Ignore profile errors
          });
      }

    } catch (error: any) {
      console.error(`❌ Error syncing ${dentist.name}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Successfully synced: ${successCount} dentists`);
  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount} dentists`);
  }
  console.log('='.repeat(50));

  // Verify by listing all dentists
  console.log('\n📋 Verifying dentists in database:');
  const { data: allDentists, error: listError } = await supabase
    .from('dentists')
    .select('name, email')
    .order('name');

  if (listError) {
    console.error('Error listing dentists:', listError);
  } else {
    console.log(`Found ${allDentists?.length || 0} dentists:`);
    allDentists?.forEach(d => {
      console.log(`  - ${d.name}: ${d.email}`);
    });
  }
}

// Run the sync
syncDentists()
  .then(() => {
    console.log('\n✨ Sync completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Sync failed:', error);
    process.exit(1);
  });

