import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';
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
    } catch (err) {
      // Only a genuine 401 means the token is actually invalid/expired —
      // any other failure (network blip, temporary 500) should NOT throw
      // away a still-valid persisted session. Previously any error here
      // cleared the token, forcing a fresh Google login on transient issues.
      const isUnauthorized = axios.isAxiosError(err) && err.response?.status === 401;
      if (isUnauthorized) {
        setUser(null);
        setTokenState(null);
        await runScript('clearToken').catch(() => undefined);
      }
      // Non-401: keep the token as-is. The next successful call will
      // populate `user` again; the UI can retry rather than re-auth.
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
