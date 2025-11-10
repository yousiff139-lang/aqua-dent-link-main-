import { useQuery } from '@tanstack/react-query';
import type { Dentist } from '@/types/dentist';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

// Fallback dentist data (matches EnhancedDentists.tsx)
const FALLBACK_DENTISTS: Record<string, any> = {
  "550e8400-e29b-41d4-a716-446655440001": {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@example.com",
    specialization: "General Dentistry",
    bio: "Experienced general dentist with focus on preventive care and patient comfort. Specializes in routine cleanings, fillings, and oral health maintenance.",
    image_url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=800&fit=crop",
    rating: 4.8,
    years_experience: 10,
    education: "DDS from Harvard University",
    expertise: ["Preventive Care", "Restorative Dentistry", "Oral Health"],
    certifications: [],
    availability: {},
  },
  "550e8400-e29b-41d4-a716-446655440002": {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Dr. Michael Chen",
    email: "michael.chen@example.com",
    specialization: "Orthodontics",
    bio: "Specialist in orthodontic treatments and braces. Expert in creating beautiful, straight smiles with the latest techniques.",
    image_url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&h=800&fit=crop",
    rating: 4.9,
    years_experience: 15,
    education: "DDS from Stanford University, Orthodontics Residency",
    expertise: ["Braces", "Invisalign", "Jaw Surgery"],
    certifications: [],
    availability: {},
  },
  "550e8400-e29b-41d4-a716-446655440003": {
    id: "550e8400-e29b-41d4-a716-446655440003",
    name: "Dr. Emily Rodriguez",
    email: "emily.rodriguez@example.com",
    specialization: "Pediatric Dentistry",
    bio: "Dedicated to children's dental health and comfort. Specializes in making dental visits fun and stress-free for young patients.",
    image_url: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=800&h=800&fit=crop",
    rating: 4.7,
    years_experience: 8,
    education: "DDS from UCLA, Pediatric Dentistry Fellowship",
    expertise: ["Child Dental Care", "Sedation Dentistry", "Preventive Care"],
    certifications: [],
    availability: {},
  },
  "550e8400-e29b-41d4-a716-446655440004": {
    id: "550e8400-e29b-41d4-a716-446655440004",
    name: "Dr. James Wilson",
    email: "james.wilson@example.com",
    specialization: "Oral Surgery",
    bio: "Expert in complex oral and maxillofacial surgeries. Specializes in wisdom teeth removal, dental implants, and reconstructive procedures.",
    image_url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&h=800&fit=crop",
    rating: 4.6,
    years_experience: 12,
    education: "DDS from Columbia University, Oral Surgery Residency",
    expertise: ["Wisdom Teeth", "Implants", "Jaw Surgery"],
    certifications: [],
    availability: {},
  },
  "550e8400-e29b-41d4-a716-446655440005": {
    id: "550e8400-e29b-41d4-a716-446655440005",
    name: "Dr. Lisa Thompson",
    email: "lisa.thompson@example.com",
    specialization: "Cosmetic Dentistry",
    bio: "Specialist in cosmetic and aesthetic dental treatments. Expert in smile makeovers, veneers, and teeth whitening procedures.",
    image_url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=800&fit=crop",
    rating: 4.9,
    years_experience: 14,
    education: "DDS from NYU, Cosmetic Dentistry Fellowship",
    expertise: ["Veneers", "Teeth Whitening", "Smile Design"],
    certifications: [],
    availability: {},
  },
  "550e8400-e29b-41d4-a716-446655440006": {
    id: "550e8400-e29b-41d4-a716-446655440006",
    name: "Dr. Robert Brown",
    email: "robert.brown@example.com",
    specialization: "Endodontics",
    bio: "Root canal specialist with advanced techniques. Focuses on saving teeth and providing pain-free endodontic treatments.",
    image_url: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800&h=800&fit=crop",
    rating: 4.8,
    years_experience: 11,
    education: "DDS from University of Michigan, Endodontics Residency",
    expertise: ["Root Canals", "Endodontic Surgery", "Pain Management"],
    certifications: [],
    availability: {},
  },
};

/**
 * React Query hook to fetch a single dentist by ID
 * 
 * @param dentistId - The UUID of the dentist to fetch
 * @returns Query result with dentist data, loading state, and error
 * 
 * Features:
 * - Automatic caching with 5 minute stale time
 * - 2 retry attempts on failure
 * - Type-safe dentist data
 * - Comprehensive error logging
 * - Performance monitoring
 * - Fetches from Supabase database with fallback to hardcoded data
 */
export function useDentist(dentistId: string | undefined) {
  return useQuery({
    queryKey: ['dentist', dentistId],
    queryFn: async () => {
      if (!dentistId) {
        logger.warn('useDentist called without dentist ID');
        throw new Error('Dentist ID is required');
      }

      logger.info('Fetching dentist', { dentistId });

      // Try to fetch from Supabase first
      try {
        // @ts-ignore - Some columns will be added by migration
        const { data, error } = await (supabase as any)
          .from('dentists')
          .select(`
            *,
            profiles!dentists_id_fkey (
              id,
              email,
              full_name
            )
          `)
          .eq('id', dentistId)
          .single();

        if (!error && data) {
          // Transform data to match Dentist type
          const dentist: any = {
            id: data.id,
            name: data.name || data.profiles?.full_name || 'Unknown Dentist',
            email: data.profiles?.email || '',
            specialization: data.specialization || 'General Dentistry',
            bio: data.bio || '',
            image_url: data.image_url || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&h=800&fit=crop',
            rating: data.rating || 4.5,
            experience_years: data.experience_years || data.years_experience || 0,
            education: data.education || '',
            expertise: data.expertise || [],
            certifications: data.certifications || [],
            availability: data.availability || {},
            created_at: data.created_at,
            updated_at: data.updated_at,
          };

          logger.info('Dentist fetched from database', { dentistId, name: dentist.name });
          return dentist as Dentist;
        }

        logger.warn('Dentist not found in database, using fallback', { dentistId, error });
      } catch (dbError) {
        logger.warn('Database error, using fallback', { dentistId, error: dbError });
      }

      // Fallback to hardcoded data
      const fallbackDentist = FALLBACK_DENTISTS[dentistId];
      if (fallbackDentist) {
        logger.info('Using fallback dentist data', { dentistId, name: fallbackDentist.name });
        return fallbackDentist;
      }

      // If not in fallback data either, throw error
      logger.error('Dentist not found in database or fallback', { dentistId });
      throw new Error('Dentist not found');
    },
    enabled: !!dentistId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1, // Reduced retries since we have fallback
  });
}
