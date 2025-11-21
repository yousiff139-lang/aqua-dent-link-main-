import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Create a dummy client if env vars are missing (prevents app crash)
// The app will show errors when trying to use Supabase, but won't crash on load
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Missing Supabase environment variables. Some features may not work.')
    console.warn('Please check admin-app/.env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set')
    // Return a dummy client that will fail gracefully
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }

  console.log('✅ Supabase client initialized successfully')
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

export const supabase = createSupabaseClient()