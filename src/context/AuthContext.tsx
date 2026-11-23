import React, { createContext, useContext, useState, useCallback } from 'react';
import { api, setAuthToken } from '../services/api';

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: 'ROLE_ADMIN' | 'ROLE_CITIZEN';
  department: string;
  zonePreference: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    zonePreference: string;
  }) => Promise<AuthUser>;
  bootstrapAdmin: (payload: {
    fullName: string;
    email: string;
    password: string;
    passcode?: string;
  }) => Promise<AuthUser>;
  refreshProfile: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
    setAuthToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(
    async (payload: { fullName: string; email: string; password: string; zonePreference: string }) => {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/register', payload);
      setAuthToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    },
    []
  );

  const bootstrapAdmin = useCallback(
    async (payload: { fullName: string; email: string; password: string; passcode?: string }) => {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/bootstrap-admin', payload);
      setAuthToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    },
    []
  );

  const refreshProfile = useCallback(async () => {
    const res = await api.get<AuthUser>('/auth/me');
    setUser(res.data);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'ROLE_ADMIN',
        login,
        register,
        bootstrapAdmin,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
