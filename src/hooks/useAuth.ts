import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import { AuthSessionUser } from '../types/api';
import { StaffRole } from '../types';

export function useAuth() {
  const [user, setUser] = useState<AuthSessionUser | null>(() => authApi.getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const currentUser = await authApi.getCurrentUser();
        if (isMounted) setUser(currentUser);
      } catch {
        // Fall back to stored session if present
        const stored = authApi.getStoredUser();
        if (isMounted) setUser(stored);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(email, pass);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (allowedRoles: StaffRole[]): boolean => {
      if (!user) return false;
      return allowedRoles.includes(user.role as StaffRole);
    },
    [user]
  );

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      if (user.role === 'OWNER') return true;
      return user.permissions?.includes(permission) ?? false;
    },
    [user]
  );

  return {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    logout,
    hasRole,
    hasPermission,
  };
}
