import { createContext, useContext, useState, type ReactNode } from 'react';

export type ScreenName =
  | 'login'
  | 'connect-meta'
  | 'home'
  | 'templates'
  | 'template-form'
  | 'schedules'
  | 'schedule-form'
  | 'ai'
  | 'settings';

interface RouterState {
  screen: ScreenName;
  params: Record<string, string>;
}

interface RouterContextValue extends RouterState {
  navigate: (screen: ScreenName, params?: Record<string, string>) => void;
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RouterState>({ screen: 'home', params: {} });

  const navigate = (screen: ScreenName, params: Record<string, string> = {}) =>
    setState({ screen, params });

  return (
    <RouterContext.Provider value={{ ...state, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
