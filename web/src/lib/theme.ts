import { useEffect, useState } from 'react';
type Theme = 'light' | 'dark';
const read = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(read);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#17120f' : '#fffdd0');
    try { localStorage.setItem('ml-theme', theme); } catch { /* private mode: the choice just will not persist */ }
  }, [theme]);
  return { theme, toggle: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')) };
}
