import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, getToken, setToken } from '../../api/client';

export type Language = 'kk' | 'ru' | 'en';
type Theme = 'light' | 'dark';
export type UserRole = 'student' | 'admin';

export interface User {
  id: number;
  role: UserRole;
  name: string;
  email: string;
  studentCode?: string | null;
  gradeLabel?: string | null;
  notificationsEnabled?: boolean;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  toggleTheme: () => void;
  user: User | null;
  isAuthenticated: boolean;
  authReady: boolean;
  loginWithToken: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  t: (key: string) => string;
  config: Record<string, string>;
  configLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LANG_KEY = 'edulearn_lang';

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const s = localStorage.getItem(LANG_KEY) as Language | null;
    return s && ['kk', 'ru', 'en'].includes(s) ? s : 'en';
  });
  const [theme, setTheme] = useState<Theme>('light');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [config, setConfig] = useState<Record<string, string>>({});
  const [configLoading, setConfigLoading] = useState(true);

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem(LANG_KEY, lang);
    setLanguageState(lang);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await api<Record<string, string>>('/api/config');
        if (!cancelled) setConfig(cfg);
      } catch {
        if (!cancelled) setConfig({});
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tr = await api<Record<string, string>>(`/api/i18n/${language}`);
        if (!cancelled) setTranslations(tr);
      } catch {
        if (!cancelled) setTranslations({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tok = getToken();
      if (!tok) {
        setUser(null);
        setAuthReady(true);
        return;
      }
      try {
        const me = await api<User>('/api/auth/me');
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const loginWithToken = (token: string, u: User) => {
    setToken(token);
    setUser(u);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const me = await api<User>('/api/auth/me');
    setUser(me);
  };

  const t = useCallback(
    (key: string): string => {
      return translations[key] || key;
    },
    [translations]
  );

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        theme,
        toggleTheme,
        user,
        isAuthenticated: !!user,
        authReady,
        loginWithToken,
        logout,
        refreshUser,
        t,
        config,
        configLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
