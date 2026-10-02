import { THEMES, useTheme, type Theme } from '../lib/theme';

export function ThemeSelect({ className = 'input theme-select', id }: { className?: string; id?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <select
      id={id}
      className={className}
      aria-label={id ? undefined : 'Theme'}
      value={theme}
      onChange={(e) => setTheme(e.target.value as Theme)}
    >
      {THEMES.map((t) => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
    </select>
  );
}
