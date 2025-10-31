import api from './api';
import { AuthSession, LoginResponse } from '@/types';

export const authService = {
  /**
   * Login with email
   */
  login: async (email: string): Promise<AuthSession> => {
    const response = await api.post<LoginResponse>('/auth/dentist/login', { email });
    
    // Calculate expiration (24 hours from now)
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    
    return {
      token: response.data.token,
      dentist: response.data.dentist,
      expiresAt,
    };
  },

  /**
   * Validate current session
   */
  validateSession: async (): Promise<boolean> => {
    try {
      await api.get('/auth/validate');
      return true;
    } catch (error) {
      return false;
    }
  },
};
