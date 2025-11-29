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
      // Ensure we're using admin API
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'realtime-sync-backend',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
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

// Test if service role key has admin permissions
export const testAdminPermissions = async (): Promise<boolean> => {
  try {
    // Try to list users (requires admin permissions)
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      logger.error('Service role key does not have admin permissions', { 
        error: error.message,
        code: error.code,
        status: error.status 
      });
      return false;
    }
    logger.info('✅ Service role key has admin permissions');
    return true;
  } catch (error: any) {
    logger.error('Admin permissions test error', { 
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
