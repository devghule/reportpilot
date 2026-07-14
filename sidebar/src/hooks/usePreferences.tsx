import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { runScript } from '../utils/appscript';

export interface Preferences {
  defaultDestination: 'active' | 'existing' | 'new';
  defaultStartCell: string;
  defaultTimezone: string;
  theme: 'system' | 'light' | 'dark';
}

const DEFAULT_PREFERENCES: Preferences = {
  defaultDestination: 'new',
  defaultStartCell: 'A1',
  defaultTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
  theme: 'system',
};

const LOCAL_STORAGE_KEY = 'reportpilot_prefs';

interface PreferencesContextValue {
  preferences: Preferences;
  setPreferences: (prefs: Preferences) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferencesState] = useState<Preferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    (async () => {
      try {
        const stored = await runScript<Preferences | null>('getPreferences');
        if (stored) setPreferencesState({ ...DEFAULT_PREFERENCES, ...stored });
      } catch {
        // Outside Google Sheets (e.g. local dev/preview) — fall back to
        // localStorage so preferences still persist across reloads.
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          try {
            setPreferencesState({ ...DEFAULT_PREFERENCES, ...JSON.parse(raw) });
          } catch {
            // ignore malformed local data
          }
        }
      }
    })();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (preferences.theme === 'system') {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = preferences.theme;
    }
  }, [preferences.theme]);

  const setPreferences = async (prefs: Preferences) => {
    setPreferencesState(prefs);
    await runScript('setPreferences', prefs).catch(() => {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prefs));
    });
  };

  return (
    <PreferencesContext.Provider value={{ preferences, setPreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
