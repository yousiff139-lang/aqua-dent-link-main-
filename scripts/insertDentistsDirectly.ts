/**
 * Insert Dentists Directly to Supabase
 * This script inserts all dentists using raw SQL execution via Supabase RPC or direct insert
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
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
    console.warn('Could not load .env file, using process.env');
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const dentists = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@example.com',
    specialization: 'General Dentistry',
    rating: 4.8,
    experience_years: 10,
    years_of_experience: 10,
    phone: '+1-555-0101',
    address: '123 Main St, City, State',
    bio: 'Experienced general dentist with focus on preventive care and patient comfort.',
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
    years_of_experience: 15,
    phone: '+1-555-0102',
    address: '456 Oak Ave, City, State',
    bio: 'Specialist in orthodontic treatments and braces.',
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
    years_of_experience: 8,
    phone: '+1-555-0103',
    address: '789 Pine St, City, State',
    bio: 'Dedicated to children\'s dental health and comfort.',
    education: 'DDS from UCLA, Pediatric Dentistry Fellowship',
    expertise: ['Child Dental Care', 'Sedation Dentistry'],
    image_url: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=800&h=800&fit=crop',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'Dr. James Wilson',
    email: 'james.wilson@example.com',
    specialization: 'Oral Surgery',
    rating: 4.6,
    experience_years: 12,
    years_of_experience: 12,
    phone: '+1-555-0104',
    address: '321 Elm St, City, State',
    bio: 'Expert in complex oral and maxillofacial surgeries.',
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
    years_of_experience: 14,
    phone: '+1-555-0105',
    address: '654 Maple Dr, City, State',
    bio: 'Specialist in cosmetic and aesthetic dental treatments.',
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
    years_of_experience: 11,
    phone: '+1-555-0106',
    address: '987 Cedar Ln, City, State',
    bio: 'Root canal specialist with advanced techniques.',
    education: 'DDS from University of Michigan, Endodontics Residency',
    expertise: ['Root Canals', 'Endodontic Surgery'],
    image_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800&h=800&fit=crop',
  },
];

async function insertDentists() {
  console.log('🔄 Inserting dentists into Supabase...\n');

  for (const dentist of dentists) {
    try {
      // Try to insert, will fail if exists
      const { error: insertError } = await supabase
        .from('dentists')
        .insert({
          id: dentist.id,
          name: dentist.name,
          email: dentist.email,
          specialization: dentist.specialization,
          rating: dentist.rating,
          experience_years: dentist.experience_years,
          years_of_experience: dentist.years_of_experience,
          phone: dentist.phone,
          address: dentist.address,
          bio: dentist.bio,
          education: dentist.education,
          expertise: dentist.expertise,
          image_url: dentist.image_url,
        });

      if (insertError) {
        // If insert fails, try update
        if (insertError.code === '23505') { // Unique violation
          const { error: updateError } = await supabase
            .from('dentists')
            .update({
              name: dentist.name,
              email: dentist.email,
              specialization: dentist.specialization,
              rating: dentist.rating,
              experience_years: dentist.experience_years,
              years_of_experience: dentist.years_of_experience,
              phone: dentist.phone,
              address: dentist.address,
              bio: dentist.bio,
              education: dentist.education,
              expertise: dentist.expertise,
              image_url: dentist.image_url,
            })
            .eq('id', dentist.id);

          if (updateError) {
            throw updateError;
          }
          console.log(`✅ Updated: ${dentist.name} (${dentist.email})`);
        } else {
          throw insertError;
        }
      } else {
        console.log(`✅ Inserted: ${dentist.name} (${dentist.email})`);
      }
    } catch (error: any) {
      console.error(`❌ Error with ${dentist.name}:`, error.message);
    }
  }

  // Verify
  console.log('\n📋 Verifying dentists in database:');
  const { data: allDentists, error: listError } = await supabase
    .from('dentists')
    .select('name, email')
    .order('name');

  if (listError) {
    console.error('Error listing:', listError.message);
    console.log('\n⚠️  You may need to run the migration SQL file first:');
    console.log('   supabase/migrations/20251031000000_insert_all_dentists.sql');
  } else {
    console.log(`\nFound ${allDentists?.length || 0} dentists:`);
    allDentists?.forEach(d => {
      console.log(`  - ${d.name}: ${d.email}`);
    });
  }
}

insertDentists().catch(console.error);

