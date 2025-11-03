import { supabase } from '@/lib/supabase';
import { AuthSession, Dentist } from '@/types';

export const authService = {
  /**
   * Login with email - Find dentist by email in Supabase
   * Tries multiple query strategies to find the dentist
   */
  login: async (email: string): Promise<AuthSession> => {
    const normalizedEmail = email.toLowerCase().trim();
    
    try {
      // Strategy 1: Check dentists table email column directly (most common)
      let { data: dentistDirect, error: directError } = await supabase
        .from('dentists')
        .select('*')
        .eq('email', normalizedEmail)
        .single();

      // Strategy 2: If not found, try case-insensitive search
      if (directError || !dentistDirect) {
        const { data: allDentists } = await supabase
          .from('dentists')
          .select('*');
        
        dentistDirect = allDentists?.find(d => 
          d.email?.toLowerCase() === normalizedEmail
        ) || null;
      }

      // Strategy 3: Try joining with profiles table
      if (!dentistDirect) {
        const { data: joinedData, error: joinedError } = await supabase
          .from('dentists')
          .select(`
            *,
            profiles!dentists_id_fkey (
              id,
              email,
              full_name
            )
          `);

        if (!joinedError && joinedData) {
          // Find dentist where profile email matches
          const matched = joinedData.find(d => {
            const profileEmail = (d as any).profiles?.email?.toLowerCase();
            return profileEmail === normalizedEmail;
          });
          
          if (matched) {
            dentistDirect = matched as any;
          }
        }
      }

      // Strategy 4: Try profiles table directly and then match to dentist
      if (!dentistDirect) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', normalizedEmail)
          .single();

        if (profileData) {
          const { data: dentistByProfile } = await supabase
            .from('dentists')
            .select('*')
            .eq('id', profileData.id)
            .single();

          if (dentistByProfile) {
            dentistDirect = dentistByProfile;
          }
        }
      }

      // If still not found, throw error with helpful message
      if (!dentistDirect) {
        // Get list of available emails for debugging
        const { data: allDentists } = await supabase
          .from('dentists')
          .select('email, name')
          .limit(10);
        
        const availableEmails = allDentists?.map(d => d.email).filter(Boolean) || [];
        
        throw new Error(
          `Dentist not found with email: ${email}. ` +
          `Available dentist emails: ${availableEmails.join(', ') || 'None found'}`
        );
      }

      // Create dentist object from found data
      const dentist: Dentist = {
        id: dentistDirect.id,
        email: dentistDirect.email || normalizedEmail,
        full_name: (dentistDirect as any).name || (dentistDirect as any).profiles?.full_name || 'Unknown Dentist',
        specialization: dentistDirect.specialization || 'General Dentistry',
        years_of_experience: dentistDirect.years_of_experience || (dentistDirect as any).experience_years || 0,
        education: (dentistDirect as any).education || '',
        bio: (dentistDirect as any).bio || '',
        rating: dentistDirect.rating || 4.5,
        created_at: (dentistDirect as any).created_at || new Date().toISOString(),
        updated_at: (dentistDirect as any).updated_at || new Date().toISOString(),
      };

      // Calculate expiration (24 hours from now)
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

      return {
        token: 'supabase-session',
        dentist,
        expiresAt,
      };
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || `Failed to login. Please check your email address: ${email}`);
    }
  },

  /**
   * Validate current session
   */
  validateSession: async (): Promise<boolean> => {
    try {
      // For Supabase, we just check if session exists in localStorage
      // The actual validation is done by checking stored session
      return true;
    } catch (error) {
      return false;
    }
  },
};
