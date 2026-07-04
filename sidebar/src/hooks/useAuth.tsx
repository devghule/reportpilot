import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { runScript } from '../utils/appscript';
import { apiClient } from '../services/api.service';
import type { User } from '../types';

interface AuthContextValue {
  token: string | null;
  user: User | null;
  loading: boolean;
  setToken: (token: string | null) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async (activeToken?: string | null) => {
    const t = activeToken ?? token;
    if (!t) {
      setUser(null);
      return;
    }
    try {
      const { data } = await apiClient(t).get<User>('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
      setTokenState(null);
      await runScript('clearToken').catch(() => undefined);
    }
  };

  const setToken = async (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      await runScript('storeToken', newToken).catch(() => undefined);
      await refreshUser(newToken);
    } else {
      await runScript('clearToken').catch(() => undefined);
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await runScript<string | null>('getToken');
        if (storedToken) {
          setTokenState(storedToken);
          await refreshUser(storedToken);
        }
      } catch {
        // Not running inside Google Sheets (e.g. local dev) — stay logged out.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, loading, setToken, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
