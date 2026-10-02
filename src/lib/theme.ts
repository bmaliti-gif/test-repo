import { useCallback, useEffect, useState } from 'react';

export const THEMES = [
  { value: 'blueprint', label: 'Blueprint' },
  { value: 'night', label: 'Night' },
  { value: 'copper', label: 'Copper' },
  { value: 'emerald', label: 'Emerald' },
] as const;

export type Theme = (typeof THEMES)[number]['value'];

const STORAGE_KEY = 'boardzm-theme';
const EVENT = 'boardzm-theme-change';

function isTheme(v: unknown): v is Theme {
  return THEMES.some((t) => t.value === v);
}

export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isTheme(saved)) return saved;
  } catch {
    // Storage can be blocked (private mode); fall back to the default.
  }
  return 'blueprint';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'blueprint') delete root.dataset.theme;
  else root.dataset.theme = theme;
}

/** Current theme plus a setter that saves it and updates <html data-theme>. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readTheme);

  // Keep every theme select (header, account page) in sync.
  useEffect(() => {
    const onChange = () => setThemeState(readTheme());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not saved, but the theme still changes for this visit.
    }
    setThemeState(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { theme, setTheme };
}
