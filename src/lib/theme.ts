import { useCallback, useEffect, useState } from 'react';

export const THEMES = [
  { value: 'zambezi', label: 'Zambezi', note: 'Teal · default' },
  { value: 'forest', label: 'Forest', note: 'Deep green' },
  { value: 'sky', label: 'Sky', note: 'Classic blue' },
  { value: 'lavender', label: 'Lavender', note: 'Soft purple' },
  { value: 'copper', label: 'Copper', note: 'Warm earth' },
  { value: 'sunset', label: 'Sunset', note: 'Bright orange' },
  { value: 'night', label: 'Night', note: 'Dark teal' },
  { value: 'midnight', label: 'Midnight', note: 'Dark navy' },
] as const;

export type Theme = (typeof THEMES)[number]['value'];

const STORAGE_KEY = 'cabinhub-theme';
// The app used to be called BoardZM; a theme saved under the old name still counts.
const OLD_STORAGE_KEY = 'boardzm-theme';
const EVENT = 'cabinhub-theme-change';

function isTheme(v: unknown): v is Theme {
  return THEMES.some((t) => t.value === v);
}

export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(OLD_STORAGE_KEY);
    if (isTheme(saved)) return saved;
  } catch {
    // Storage can be blocked (private mode); fall back to the default.
  }
  // Older saved themes (blueprint, emerald) fall back to the default too.
  return 'zambezi';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'zambezi') delete root.dataset.theme;
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
