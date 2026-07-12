import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ActiveTheme = 'light' | 'dark';

interface ThemeContextType {
  themePreference: ThemePreference;
  activeTheme: ActiveTheme;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): ActiveTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialPreference(): ThemePreference {
  const stored = localStorage.getItem('roomcanvas-theme') as ThemePreference | null;
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function updateThemeAttribute(activeTheme: ActiveTheme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', activeTheme);
  
  if (activeTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', activeTheme === 'dark' ? '#0A0A0B' : '#FAF7F2');
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(getInitialPreference);
  const [activeTheme, setActiveTheme] = useState<ActiveTheme>(
    themePreference === 'system' ? getSystemTheme() : themePreference
  );

  const applyTheme = (pref: ThemePreference) => {
    const computed = pref === 'system' ? getSystemTheme() : pref;
    setActiveTheme(computed);
    updateThemeAttribute(computed);
  };

  useEffect(() => {
    applyTheme(themePreference);
  }, []);

  const setTheme = (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    localStorage.setItem('roomcanvas-theme', pref);
    applyTheme(pref);
  };

  const toggleTheme = () => {
    setTheme(activeTheme === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (themePreference === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePreference]);

  return (
    <ThemeContext.Provider value={{ themePreference, activeTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
