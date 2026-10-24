import { Link } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

export function Nav() {
  return (
    <header className="wrap noprint" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 16 }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'inherit', textDecoration: 'none', minHeight: 44 }} aria-label="Memory Lane, home">
        <img src="/logo.svg" alt="" width={32} height={32} style={{ borderRadius: 2 }} />
        <span style={{ font: '700 24px var(--font-display)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Memory Lane</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}
