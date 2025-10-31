/**
 * Shared Security Utilities for Edge Functions
 * Provides JWT verification, rate limiting, input sanitization, and CORS handling
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

/**
 * Standard CORS headers for edge functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightRequest(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

// ============================================================================
// JWT VERIFICATION
// ============================================================================

export interface VerifiedUser {
  id: string;
  email?: string;
  role?: string;
  aud?: string;
  exp?: number;
}

/**
 * Verify JWT token and get authenticated user
 * @param req - Request object
 * @param supabase - Supabase client
 * @returns Verified user object
 * @throws Error if token is invalid or missing
 */
export async function verifyJWT(req: Request, supabase: any): Promise<VerifiedUser> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization header format. Expected: Bearer <token>');
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!token || token.length < 10) {
    throw new Error('Invalid token format');
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('JWT verification error:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      aud: user.aud,
      exp: user.exp
    };
  } catch (error) {
    console.error('Error in verifyJWT:', error);
    throw new Error(error instanceof Error ? error.message : 'Authentication failed');
  }
}

/**
 * Verify user has specific role
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param requiredRole - Required role (admin, dentist, patient)
 * @returns True if user has role
 */
export async function verifyUserRole(
  supabase: any,
  userId: string,
  requiredRole: 'admin' | 'dentist' | 'patient'
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', requiredRole)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error verifying user role:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in verifyUserRole:', error);
    return false;
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limit store (for simple implementation)
// In production, use Redis or similar distributed cache
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Check rate limit for a user or IP
 * @param identifier - User ID or IP address
 * @param config - Rate limit configuration
 * @returns True if rate limit exceeded
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }
): { limited: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!entry || entry.resetTime < now) {
    // Create new entry
    const resetTime = now + config.windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return {
      limited: false,
      remaining: config.maxRequests - 1,
      resetTime
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(identifier, entry);

  const limited = entry.count > config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    limited,
    remaining,
    resetTime: entry.resetTime
  };
}

/**
 * Get client identifier (user ID or IP address)
 * @param req - Request object
 * @param userId - Optional user ID
 * @returns Identifier string
 */
export function getClientIdentifier(req: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get IP from various headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return `ip:${forwardedFor.split(',')[0].trim()}`;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return `ip:${realIp}`;
  }

  // Fallback to a generic identifier
  return 'ip:unknown';
}

/**
 * Create rate limit response
 * @param resetTime - Time when rate limit resets
 * @returns Response object
 */
export function createRateLimitResponse(resetTime: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      resetTime: new Date(resetTime).toISOString()
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString()
      }
    }
  );
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitize string input to prevent XSS and injection attacks
 * @param input - Input string
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 10000); // Limit length
}

/**
 * Sanitize object by sanitizing all string values
 * @param obj - Input object
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Validate UUID format
 * @param uuid - UUID string
 * @returns True if valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format
 * @param email - Email string
 * @returns True if valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 * @param phone - Phone number string
 * @returns True if valid phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

/**
 * Create standardized error response
 * @param error - Error object or message
 * @param status - HTTP status code
 * @param requestId - Optional request ID for tracking
 * @returns Response object
 */
export function createErrorResponse(
  error: Error | string,
  status: number = 500,
  requestId?: string
): Response {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorName = error instanceof Error ? error.name : 'Error';

  const errorResponse: ErrorResponse = {
    error: errorName,
    message: errorMessage,
    timestamp: new Date().toISOString(),
    requestId
  };

  // Don't expose internal error details in production
  if (Deno.env.get('ENVIRONMENT') === 'development') {
    errorResponse.details = error instanceof Error ? error.stack : undefined;
  }

  return new Response(
    JSON.stringify(errorResponse),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}

/**
 * Create success response
 * @param data - Response data
 * @param status - HTTP status code
 * @returns Response object
 */
export function createSuccessResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString()
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

/**
 * Validate request body exists and is valid JSON
 * @param req - Request object
 * @returns Parsed JSON body
 * @throws Error if body is invalid
 */
export async function validateRequestBody(req: Request): Promise<any> {
  const contentType = req.headers.get('content-type');
  
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Content-Type must be application/json');
  }

  try {
    const body = await req.json();
    
    if (!body || typeof body !== 'object') {
      throw new Error('Request body must be a valid JSON object');
    }

    return body;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Validate required fields in request body
 * @param body - Request body
 * @param requiredFields - Array of required field names
 * @throws Error if required fields are missing
 */
export function validateRequiredFields(body: any, requiredFields: string[]): void {
  const missingFields = requiredFields.filter(field => !(field in body) || body[field] === null || body[field] === undefined);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * Log request information
 * @param req - Request object
 * @param userId - Optional user ID
 * @param additionalInfo - Additional information to log
 */
export function logRequest(req: Request, userId?: string, additionalInfo?: any): void {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userId: userId || 'anonymous',
    userAgent: req.headers.get('user-agent'),
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    ...additionalInfo
  };

  console.log('Request:', JSON.stringify(logData));
}

/**
 * Log error information
 * @param error - Error object
 * @param context - Additional context
 */
export function logError(error: Error | string, context?: any): void {
  const errorData = {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    ...context
  };

  console.error('Error:', JSON.stringify(errorData));
}
