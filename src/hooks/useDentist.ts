import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import type { Dentist } from '@/types/dentist';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

// Cache for prefetched dentist data
const dentistCache = new Map<string, any>();

// Fallback dentist data (matches EnhancedDentists.tsx)
const FALLBACK_DENTISTS: Record<string, any> = {
  "550e8400-e29b-41d4-a716-446655440001": {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@example.com",
    specialization: "General Dentistry",
    bio: "Experienced general dentist with focus on preventive care and patient comfort.",
    image_url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&q=80",
    rating: 4.8,
    reviews: 6,
    years_experience: 10,
    education: "DDS from Harvard University",
    expertise: ["Preventive Care", "Restorative Dentistry", "Oral Health"],
  },
  "550e8400-e29b-41d4-a716-446655440002": {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Dr. Michael Chen",
    email: "michael.chen@example.com",
    specialization: "Orthodontics",
    bio: "Specialist in orthodontic treatments and braces.",
    image_url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&q=80",
    rating: 4.9,
    reviews: 6,
    years_experience: 15,
    education: "DDS from Stanford University, Orthodontics Residency",
    expertise: ["Braces", "Invisalign", "Jaw Surgery"],
  },
  "550e8400-e29b-41d4-a716-446655440003": {
    id: "550e8400-e29b-41d4-a716-446655440003",
    name: "Dr. Emily Rodriguez",
    email: "emily.rodriguez@example.com",
    specialization: "Pediatric Dentistry",
    bio: "Dedicated to children's dental health and comfort.",
    image_url: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&q=80",
    rating: 4.7,
    reviews: 6,
    years_experience: 8,
    education: "DDS from UCLA, Pediatric Dentistry Fellowship",
    expertise: ["Child Dental Care", "Sedation Dentistry", "Preventive Care"],
  },
  "550e8400-e29b-41d4-a716-446655440004": {
    id: "550e8400-e29b-41d4-a716-446655440004",
    name: "Dr. James Wilson",
    email: "james.wilson@example.com",
    specialization: "Oral Surgery",
    bio: "Expert in complex oral and maxillofacial surgeries.",
    image_url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&q=80",
    rating: 4.6,
    reviews: 6,
    years_experience: 12,
    education: "DDS from Columbia University, Oral Surgery Residency",
    expertise: ["Wisdom Teeth", "Implants", "Jaw Surgery"],
  },
  "550e8400-e29b-41d4-a716-446655440005": {
    id: "550e8400-e29b-41d4-a716-446655440005",
    name: "Dr. Lisa Thompson",
    email: "lisa.thompson@example.com",
    specialization: "Cosmetic Dentistry",
    bio: "Specialist in cosmetic and aesthetic dental treatments.",
    image_url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop&q=80",
    rating: 4.9,
    reviews: 6,
    years_experience: 14,
    education: "DDS from NYU, Cosmetic Dentistry Fellowship",
    expertise: ["Veneers", "Teeth Whitening", "Smile Design"],
  },
  "550e8400-e29b-41d4-a716-446655440006": {
    id: "550e8400-e29b-41d4-a716-446655440006",
    name: "Dr. Robert Brown",
    email: "robert.brown@example.com",
    specialization: "Endodontics",
    bio: "Root canal specialist with advanced techniques.",
    image_url: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop&q=80",
    rating: 4.8,
    reviews: 6,
    years_experience: 11,
    education: "DDS from University of Michigan, Endodontics Residency",
    expertise: ["Root Canals", "Endodontic Surgery", "Pain Management"],
  },
};

// Get all fallback dentists as array
const FALLBACK_DENTISTS_ARRAY = Object.values(FALLBACK_DENTISTS);

/**
 * Fetch dentist from database or fallback
 */
async function fetchDentist(dentistId: string): Promise<Dentist> {
  // Check in-memory cache first
  if (dentistCache.has(dentistId)) {
    return dentistCache.get(dentistId);
  }

  try {
    const { data, error } = await (supabase as any)
      .from('dentists')
      .select('*')
      .eq('id', dentistId)
      .single();

    if (!error && data) {
      const dentist = transformDentistData(data);
      dentistCache.set(dentistId, dentist);
      return dentist;
    }
  } catch (dbError) {
    logger.warn('Database error, using fallback', { dentistId, error: dbError });
  }

  // Fallback to hardcoded data
  const fallbackDentist = FALLBACK_DENTISTS[dentistId];
  if (fallbackDentist) {
    dentistCache.set(dentistId, fallbackDentist);
    return fallbackDentist;
  }

  throw new Error('Dentist not found');
}

/**
 * Transform raw database data to Dentist type
 */
function transformDentistData(data: any): Dentist {
  return {
    id: data.id,
    name: data.name || 'Unknown Dentist',
    email: data.email || '',
    phone: data.phone || '',
    specialization: data.specialization || 'General Dentistry',
    bio: data.bio || '',
    image_url: data.image_url || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&q=80',
    rating: data.rating || 4.5,
    reviews: data.reviews || 6,
    experience_years: data.experience_years || data.years_of_experience || 0,
    years_of_experience: data.years_of_experience || data.experience_years || 0,
    education: data.education || '',
    expertise: data.expertise || [],
    certifications: data.certifications || [],
    availability: data.availability || {},
    created_at: data.created_at,
    updated_at: data.updated_at,
  } as Dentist;
}

/**
 * Optimized React Query hook to fetch a single dentist by ID
 * Features:
 * - In-memory caching layer
 * - Extended stale time (10 minutes)
 * - Prefetching support
 * - Type-safe dentist data
 */
export function useDentist(dentistId: string | undefined) {
  return useQuery({
    queryKey: ['dentist', dentistId],
    queryFn: () => fetchDentist(dentistId!),
    enabled: !!dentistId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });
}

/**
 * Hook to fetch all dentists with caching
 */
export function useDentists() {
  return useQuery({
    queryKey: ['dentists'],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('dentists')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          const dentists = data.map(transformDentistData);
          // Cache individual dentists
          dentists.forEach((d: Dentist) => dentistCache.set(d.id, d));
          return dentists;
        }
      } catch (dbError) {
        logger.warn('Database error fetching dentists, using fallback');
      }

      return FALLBACK_DENTISTS_ARRAY;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to prefetch dentist data on hover
 */
export function usePrefetchDentist() {
  const queryClient = useQueryClient();

  const prefetchDentist = useCallback((dentistId: string) => {
    // Don't prefetch if already in cache
    if (dentistCache.has(dentistId)) return;

    queryClient.prefetchQuery({
      queryKey: ['dentist', dentistId],
      queryFn: () => fetchDentist(dentistId),
      staleTime: 10 * 60 * 1000,
    });
  }, [queryClient]);

  return prefetchDentist;
}

/**
 * Prefetch all dentists on initial load
 */
export function usePrefetchAllDentists() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch all dentists in background
    queryClient.prefetchQuery({
      queryKey: ['dentists'],
      queryFn: async () => {
        try {
          const { data, error } = await (supabase as any)
            .from('dentists')
            .select('*')
            .order('name', { ascending: true });

          if (!error && data && data.length > 0) {
            const dentists = data.map(transformDentistData);
            dentists.forEach((d: Dentist) => dentistCache.set(d.id, d));
            return dentists;
          }
        } catch {
          // Ignore errors, fallback will be used
        }
        return FALLBACK_DENTISTS_ARRAY;
      },
      staleTime: 10 * 60 * 1000,
    });
  }, [queryClient]);
}
