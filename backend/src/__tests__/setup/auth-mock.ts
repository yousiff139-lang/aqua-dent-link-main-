/**
 * Authentication mock for integration tests
 */

import { vi } from 'vitest';

/**
 * Mock authentication middleware for testing
 * This replaces the real auth middleware to allow testing without real tokens
 */
export const mockAuthMiddleware = (userId: string, email: string, role: string = 'patient') => {
  return (req: any, res: any, next: any) => {
    req.user = {
      id: userId,
      email: email,
      role: role,
    };
    next();
  };
};

/**
 * Mock optional auth middleware
 */
export const mockOptionalAuthMiddleware = (userId?: string, email?: string, role?: string) => {
  return (req: any, res: any, next: any) => {
    if (userId && email) {
      req.user = {
        id: userId,
        email: email,
        role: role || 'patient',
      };
    }
    next();
  };
};

/**
 * Generate a test JWT token
 */
export const generateTestToken = (userId: string, email: string, role: string = 'patient'): string => {
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'dentist-portal-secret-key-change-in-production-2024';
  
  if (role === 'dentist') {
    return jwt.sign(
      {
        dentistId: userId,
        email: email,
        type: 'dentist',
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }
  
  // For patients, we'd normally use Supabase tokens, but for testing we'll use a simple JWT
  return jwt.sign(
    {
      sub: userId,
      email: email,
      role: role,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};
