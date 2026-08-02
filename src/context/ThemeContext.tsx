import darkThemeUrl from 'primereact/resources/themes/lara-dark-teal/theme.css?url';
import lightThemeUrl from 'primereact/resources/themes/lara-light-teal/theme.css?url';
import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

const THEME_LINK_ID = 'primereact-theme';

/**
 * Swap the PrimeReact theme stylesheet.
 *
 * PrimeReact ships one stylesheet per theme with literal colors baked in, so
 * dark mode cannot be done with custom properties alone — the sheet itself has
 * to change. This is why the theme is the one vendor stylesheet not imported
 * into a cascade layer in index.css: an @import cannot be swapped at runtime.
 */
const applyPrimeReactTheme = (theme: Theme) => {
  const href = theme === 'dark' ? darkThemeUrl : lightThemeUrl;
  let link = document.getElementById(THEME_LINK_ID) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement('link');
    link.id = THEME_LINK_ID;
    link.rel = 'stylesheet';
    // Append, never prepend: index.css must be parsed first so its @layer
    // statement fixes the position of PrimeReact's own `primereact` layer.
    document.head.append(link);
  }

  if (link.href !== new URL(href, document.baseURI).href) link.href = href;
};

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    applyPrimeReactTheme(theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

// Provider and hook intentionally share a file; the hook is not a component,
// so Fast Refresh is unaffected.
// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
