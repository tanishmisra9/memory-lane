import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'framer-motion';
import { Nav } from './components/Nav';
import { Landing } from './pages/Landing';
import { Gone } from './pages/Gone';

const Setup = lazy(() => import('./pages/Setup').then(m => ({ default: m.Setup })));
const Player = lazy(() => import('./pages/Player').then(m => ({ default: m.Player })));
const Book = lazy(() => import('./pages/Book').then(m => ({ default: m.Book })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));

function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo(0, 0); }, [pathname]); return null; }

export function App() {
  return (
    <BrowserRouter>
      <LazyMotion features={domAnimation} strict={false}>
        <a className="skip" href="#app-main">Skip to the content</a>
        <Nav />
        <ScrollToTop />
        <Suspense fallback={<main id="app-main" className="wrap" style={{ paddingTop: 48 }}><p role="status">Loading…</p></main>}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<Setup />} />
            <Route path="/app/:id" element={<Player />} />
            <Route path="/book/:id" element={<Book />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<Gone message="That page does not exist." />} />
          </Routes>
        </Suspense>
        <footer className="wrap noprint" style={{ paddingTop: 24, paddingBottom: 32, color: 'var(--color-muted)', fontSize: 15, borderTop: '1px solid var(--color-line)' }}>
          An activity planner for family caregivers, not therapy or medical advice. Music and films found with Qloo, which describes what groups tend to like. You know the person. <Link to="/privacy" style={{ color: 'inherit' }}>Privacy</Link> · <a href="https://github.com/tanishmisra9/memory-lane" style={{ color: 'inherit' }}>Source</a>
        </footer>
      </LazyMotion>
    </BrowserRouter>
  );
}
