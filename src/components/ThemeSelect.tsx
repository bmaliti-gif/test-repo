import { Check } from 'lucide-react';
import { THEMES, useTheme, type Theme } from '../lib/theme';

/** Theme picker: a swatch for each theme, previewed in its own colours (see themes.css). */
export function ThemePicker({ labelledBy }: { labelledBy?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-picker" role="radiogroup" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : 'Theme'}>
      {THEMES.map((t) => {
        const on = theme === t.value;
        return (
          <label key={t.value} className={on ? 'theme-option is-on' : 'theme-option'}>
            <input type="radio" name="theme" value={t.value} checked={on} onChange={() => setTheme(t.value as Theme)} />
            <span className="theme-swatch" data-swatch={t.value} aria-hidden="true">
              <span className="sw-bg" />
              <span className="sw-accent" />
              <span className="sw-accent2" />
              {on && <Check className="sw-check" size={14} strokeWidth={3} />}
            </span>
            <span className="theme-text">
              <span className="theme-name">{t.label}</span>
              <span className="theme-note">{t.note}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
