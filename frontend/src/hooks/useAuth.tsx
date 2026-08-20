import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { getStoredUser, setStoredUser, clearAuth } from '../lib/auth';
import { api } from '../lib/api';

interface AuthCtx {
  user: User | null;
  sessionWarning: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

/** Decode JWT exp without a library — just parse the payload */
function getTokenExpiry(): number | null {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [sessionWarning, setSessionWarning] = useState(false);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    setSessionWarning(false);
  }, []);

  // Check token expiry every minute
  useEffect(() => {
    if (!user) return;
    function check() {
      const exp = getTokenExpiry();
      if (!exp) return;
      const msLeft = exp - Date.now();
      if (msLeft <= 0) {
        logout();
      } else if (msLeft <= 15 * 60 * 1000) {
        // Warn when < 15 minutes left
        setSessionWarning(true);
      } else {
        setSessionWarning(false);
      }
    }
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [user, logout]);

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password });
    setStoredUser(data.user, data.token);
    setUser(data.user);
    setSessionWarning(false);
  }

  return (
    <AuthContext.Provider value={{ user, sessionWarning, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
