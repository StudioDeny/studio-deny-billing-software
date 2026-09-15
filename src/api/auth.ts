import { apiClient, setAccessToken, clearAuthSession } from './client';
import { AuthLoginResponse, AuthSessionUser } from '../types/api';

export const authApi = {
  login: async (email: string, password: string): Promise<AuthLoginResponse> => {
    const res = await apiClient<AuthLoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    setAccessToken(res.data.accessToken);
    sessionStorage.setItem('STUDIO_DENY_USER', JSON.stringify(res.data.user));
    return res.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout notification error:', e);
    } finally {
      clearAuthSession();
    }
  },

  getCurrentUser: async (): Promise<AuthSessionUser> => {
    const res = await apiClient<AuthSessionUser>('/auth/me');
    sessionStorage.setItem('STUDIO_DENY_USER', JSON.stringify(res.data));
    return res.data;
  },

  getStoredUser: (): AuthSessionUser | null => {
    try {
      const stored = sessionStorage.getItem('STUDIO_DENY_USER');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },
};
