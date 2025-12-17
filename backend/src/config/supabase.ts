import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from './logger.js';
import fetch from 'node-fetch';

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
      fetch: fetch as unknown as typeof globalThis.fetch,
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

// Validate service role key format
export const validateServiceRoleKey = (): { valid: boolean; message?: string } => {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  // Check if key starts with 'sb_' (publishable key format)
  if (key.startsWith('sb_')) {
    return {
      valid: false,
      message: 'Service role key appears to be a publishable key (starts with "sb_"). Please use the service_role key from Supabase Dashboard > Settings > API.'
    };
  }

  // Check if key starts with 'eyJ' (JWT format - correct for service role)
  if (!key.startsWith('eyJ')) {
    return {
      valid: false,
      message: 'Service role key format is unexpected. Service role keys should start with "eyJ" (JWT format).'
    };
  }

  return { valid: true };
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

// Test if service role key can create users
export const testCreateUserCapability = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'Test123456!';

    // Attempt to create a test user
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (error) {
      logger.error('Service role key cannot create users', {
        error: error.message,
        code: error.code,
        status: error.status,
      });
      return {
        success: false,
        error: `Cannot create users: ${error.message || error.code || 'Unknown error'}`
      };
    }

    // If user was created, delete it immediately
    if (data?.user?.id) {
      try {
        await supabase.auth.admin.deleteUser(data.user.id);
        logger.info('✅ Service role key can create users (test user deleted)');
      } catch (deleteError: any) {
        logger.warn('Test user created but could not be deleted', { userId: data.user.id, error: deleteError });
      }
    }

    return { success: true };
  } catch (error: any) {
    logger.error('Create user capability test error', {
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      error: `Test failed: ${error.message || 'Unknown error'}`
    };
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
    global: {
      fetch: fetch as unknown as typeof globalThis.fetch,
    },
  }
);
