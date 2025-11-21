import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a dummy client if env vars are missing (prevents app crash)
const createSupabaseClient = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('⚠️ Missing Supabase environment variables. Some features may not work.');
    console.warn('Please check dentist-portal/.env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
    // Return a dummy client that will fail gracefully
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        storage: localStorage,
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
};

export const supabase = createSupabaseClient();
