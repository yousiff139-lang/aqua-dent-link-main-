import { createContext, useState, useEffect, ReactNode } from 'react';
import { AuthContextType, Dentist } from '@/types';
import { authService } from '@/services/auth.service';
import { getAuthSession, setAuthSession, clearAuthSession } from '@/utils/storage';
import { toast } from 'sonner';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [dentist, setDentist] = useState<Dentist | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const session = getAuthSession();
    if (session) {
      setDentist(session.dentist);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string): Promise<void> => {
    try {
      const session = await authService.login(email);
      setAuthSession(session);
      setDentist(session.dentist);
      toast.success('Login successful!');
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed. Please check your email and try again.';
      toast.error(errorMessage);
      throw error;
    }
  };

  const logout = (): void => {
    clearAuthSession();
    setDentist(null);
    toast.success('Logged out successfully');
  };

  const value: AuthContextType = {
    dentist,
    isAuthenticated: !!dentist,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
