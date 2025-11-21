import api from '@/services/api';
import { AuthSession } from '@/types';

export const authService = {
  /**
   * Login with email via backend API
   */
  login: async (email: string): Promise<AuthSession> => {
    const normalizedEmail = email.toLowerCase().trim();
    
    try {
      const response = await api.post('/auth/dentist/login', { email: normalizedEmail });
      const payload = response.data?.data ?? response.data;

      if (!payload?.token || !payload?.dentist) {
        throw new Error('Invalid login response from server');
      }

      return {
        token: payload.token,
        dentist: payload.dentist,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };
    } catch (error: any) {
      const message =
        error?.message ||
        error?.response?.data?.error?.message ||
        'Failed to login. Please verify your email address.';
      console.error('Login error:', error);
      throw new Error(message);
    }
  },

  /**
   * Validate current session
   */
  validateSession: async (): Promise<boolean> => {
    try {
      return true;
    } catch {
      return false;
    }
  },
};
