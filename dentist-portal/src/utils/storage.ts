import { AuthSession } from '@/types';

const AUTH_STORAGE_KEY = 'dentist_auth';

export const getAuthSession = (): AuthSession | null => {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;

    const session: AuthSession = JSON.parse(stored);

    // Check if session is expired - REMOVED
    // We rely on the backend to validate the token
    // This prevents issues where client clock is wrong or token is still valid
    // if (session.expiresAt && Date.now() > session.expiresAt) {
    //   clearAuthSession();
    //   return null;
    // }

    return session;
  } catch (error) {
    console.error('Error reading auth session:', error);
    return null;
  }
};

export const setAuthSession = (session: AuthSession): void => {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Error saving auth session:', error);
  }
};

export const clearAuthSession = (): void => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing auth session:', error);
  }
};

export const getAuthToken = (): string | null => {
  const session = getAuthSession();
  if (!session?.token) {
    console.warn('No session or token found');
    return null;
  }

  // Don't validate expiration on frontend - let backend handle it
  // This prevents false positives where token might be valid but our check fails
  // The backend will properly validate and return appropriate errors

  return session.token;
};
