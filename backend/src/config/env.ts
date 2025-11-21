import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment variable schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  API_PREFIX: z.string().default('/api'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  CORS_ORIGIN: z
    .string()
    .default(
      [
        'http://localhost:8000',   // user portal (vite or preview)
        'http://localhost:3000',   // legacy user app / production preview
        'http://localhost:3001',   // backend itself / health checks
        'http://localhost:3010',   // admin portal dev server
        'http://localhost:5173',   // vite default
        'http://localhost:5174',   // dentist portal/dev variant
        'http://localhost:8080',   // alt user portal port
      ].join(',')
    ),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  REDIS_URL: z.string().optional(),
  CACHE_TTL: z.string().default('3600').transform(Number),

  JWT_SECRET: z.string().optional(),

  // Stripe configuration
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SUCCESS_URL: z.string().url().optional(),
  STRIPE_CANCEL_URL: z.string().url().optional(),

  // Payment configuration
  DEFAULT_APPOINTMENT_AMOUNT: z.string().default('5000').transform(Number),
  PAYMENT_CURRENCY: z.string().default('usd'),

  ADMIN_API_KEYS: z.string().optional(),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

export const env = parseEnv();

// Export parsed CORS origins as array
export const corsOrigins = env.CORS_ORIGIN.split(',').map(origin => origin.trim());

export const adminApiKeys = env.ADMIN_API_KEYS
  ? env.ADMIN_API_KEYS.split(',').map((key) => key.trim()).filter((key) => key.length > 0)
  : [];
