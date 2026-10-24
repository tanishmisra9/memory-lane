import { useTheme } from '../lib/theme';
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button type="button" onClick={toggle} className="btn quiet small" style={{ minWidth: 44, padding: 0, boxShadow: '2px 2px 0 var(--color-shadow)' }} aria-label={dark ? 'Switch to the light theme' : 'Switch to the dark theme'} aria-pressed={dark}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true">
        {dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></> : <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" />}
      </svg>
    </button>
  );
}
