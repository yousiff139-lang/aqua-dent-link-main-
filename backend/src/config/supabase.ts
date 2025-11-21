import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from './logger.js';

// Validate Supabase credentials
if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  logger.error('Missing Supabase configuration', {
    hasUrl: !!env.SUPABASE_URL,
    hasServiceKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
  });
  throw new Error('Supabase URL and Service Role Key are required');
}

// Create Supabase client with service role key for backend operations
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'realtime-sync-backend',
      },
    },
  }
);

// Test Supabase connection on startup
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      logger.error('Supabase connection test failed', { error });
      return false;
    }
    logger.info('✅ Supabase connection successful');
    return true;
  } catch (error: any) {
    logger.error('Supabase connection test error', { 
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
};

// Create Supabase client for user authentication (with anon key)
export const supabaseAuth = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
