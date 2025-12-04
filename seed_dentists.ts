
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (!process.env.VITE_SUPABASE_URL) {
    dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or SERVICE ROLE Key');
    console.error('Please add SUPABASE_SERVICE_ROLE_KEY to your .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const dentistsToSeed = [
    {
        name: "Dr. Sarah Wilson",
        email: "sarah.wilson@example.com",
        specialization: "Orthodontics",
        phone: "+1 (555) 123-4567",
        years_of_experience: 12,
        rating: 4.9,
        reviews: 128,
        bio: "Dr. Wilson is a board-certified orthodontist with over a decade of experience in creating beautiful smiles. She specializes in Invisalign and traditional braces for both children and adults.",
        image_url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop"
    },
    {
        name: "Dr. Michael Chen",
        email: "michael.chen@example.com",
        specialization: "Cosmetic Dentistry",
        phone: "+1 (555) 234-5678",
        years_of_experience: 15,
        rating: 4.8,
        reviews: 95,
        bio: "Dr. Chen is renowned for his artistic approach to smile makeovers. He combines advanced technology with dental artistry to deliver natural-looking results.",
        image_url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop"
    },
    {
        name: "Dr. Emily Rodriguez",
        email: "emily.rodriguez@example.com",
        specialization: "Pediatric Dentistry",
        phone: "+1 (555) 345-6789",
        years_of_experience: 8,
        rating: 4.9,
        reviews: 156,
        bio: "Dr. Rodriguez creates a fun and safe environment for children. Her gentle approach helps young patients build positive associations with dental care.",
        image_url: "https://images.unsplash.com/photo-1594824476969-51c44d7eccca?w=400&h=400&fit=crop"
    },
    {
        name: "Dr. James Thompson",
        email: "james.thompson@example.com",
        specialization: "Oral Surgery",
        phone: "+1 (555) 456-7890",
        years_of_experience: 20,
        rating: 5.0,
        reviews: 210,
        bio: "Dr. Thompson is a specialist in oral and maxillofacial surgery. He is an expert in complex extractions, dental implants, and reconstructive surgery.",
        image_url: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop"
    },
    {
        name: "Dr. Lisa Patel",
        email: "lisa.patel@example.com",
        specialization: "Periodontics",
        phone: "+1 (555) 567-8901",
        years_of_experience: 10,
        rating: 4.7,
        reviews: 88,
        bio: "Dr. Patel focuses on the prevention, diagnosis, and treatment of periodontal disease. She is dedicated to helping patients maintain healthy gums.",
        image_url: "https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?w=400&h=400&fit=crop"
    },
    {
        name: "Dr. David Kim",
        email: "david.kim@example.com",
        specialization: "Endodontics",
        phone: "+1 (555) 678-9012",
        years_of_experience: 14,
        rating: 4.8,
        reviews: 112,
        bio: "Dr. Kim specializes in root canal therapy. He uses the latest microscopic techniques to save natural teeth and relieve pain efficiently.",
        image_url: "https://images.unsplash.com/photo-1582750433449-d22b1274be8f?w=400&h=400&fit=crop"
    }
];

async function seedDentists() {
    console.log('Starting dentist seeding...');

    for (const dentist of dentistsToSeed) {
        try {
            console.log(`Processing ${dentist.name}...`);

            // 1. Create Auth User
            let userId: string;
            const { data: users, error: findError } = await supabase.auth.admin.listUsers();
            const existingUser = users?.users.find(u => u.email === dentist.email);

            if (existingUser) {
                console.log(`User ${dentist.email} already exists.`);
                userId = existingUser.id;
            } else {
                const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                    email: dentist.email,
                    password: 'Password123!',
                    email_confirm: true,
                    user_metadata: {
                        full_name: dentist.name,
                        role: 'dentist'
                    }
                });

                if (createError) throw createError;
                if (!newUser.user) throw new Error('Failed to create user');
                userId = newUser.user.id;
                console.log(`Created auth user for ${dentist.name}`);
            }

            // 2. Upsert Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    full_name: dentist.name,
                    email: dentist.email,
                    phone: dentist.phone,
                    role: 'dentist',
                    updated_at: new Date().toISOString()
                });

            if (profileError) {
                console.error(`Error updating profile for ${dentist.name}:`, profileError);
            } else {
                console.log(`Updated profile for ${dentist.name}`);
            }

            // 3. Upsert Dentist
            const { error: dentistError } = await supabase
                .from('dentists')
                .upsert({
                    id: userId,
                    name: dentist.name,
                    email: dentist.email,
                    specialization: dentist.specialization,
                    phone: dentist.phone,
                    years_of_experience: dentist.years_of_experience,
                    rating: dentist.rating,
                    reviews: dentist.reviews,
                    bio: dentist.bio,
                    image_url: dentist.image_url,
                    status: 'active',
                    updated_at: new Date().toISOString()
                });

            if (dentistError) {
                console.error(`Error updating dentist record for ${dentist.name}:`, dentistError);
            } else {
                console.log(`Updated dentist record for ${dentist.name}`);
            }

            // 4. Upsert User Role
            const { error: roleError } = await supabase
                .from('user_roles')
                .upsert({
                    user_id: userId,
                    role: 'dentist',
                    dentist_id: userId
                }, { onConflict: 'user_id, role' });

            if (roleError) {
                console.error(`Error updating user role for ${dentist.name}:`, roleError);
            } else {
                console.log(`Updated user role for ${dentist.name}`);
            }

        } catch (error) {
            console.error(`Failed to process ${dentist.name}:`, error);
        }
    }

    console.log('Seeding completed.');
}

seedDentists();
