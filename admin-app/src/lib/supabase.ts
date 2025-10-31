import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL environment variable')
  console.error('Please check admin-app/.env file')
  throw new Error('Missing VITE_SUPABASE_URL environment variable. Check admin-app/.env file.')
}

if (!supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY environment variable')
  console.error('Please check admin-app/.env file')
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable. Check admin-app/.env file.')
}

console.log('✅ Supabase client initialized successfully')
console.log('Supabase URL:', supabaseUrl)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})