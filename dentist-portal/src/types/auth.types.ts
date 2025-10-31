import { Dentist } from './dentist.types';

export interface AuthSession {
  token: string;
  dentist: Dentist;
  expiresAt: number;
}

export interface AuthContextType {
  dentist: Dentist | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
}

export interface LoginResponse {
  token: string;
  dentist: Dentist;
}
