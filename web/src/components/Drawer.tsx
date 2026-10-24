import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { m, useReducedMotion } from 'framer-motion';
import { springFirm } from '../lib/motion';

// A dialog that traps focus, locks the page behind it (inert), and closes on Escape: the Portfolio's overlay pattern.
export function Drawer({ title, onClose, children, id }: { title: string; onClose: () => void; children: ReactNode; id: string }) {
  const reduce = useReducedMotion(), ref = useRef<HTMLDivElement>(null), opener = useRef<Element | null>(document.activeElement);
  useEffect(() => {
    const main = document.getElementById('app-main'); main?.setAttribute('inert', '');
    ref.current?.querySelector<HTMLElement>('button, textarea, input')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab' && ref.current) {
        const f = [...ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], textarea, input')]; if (!f.length) return;
        const first = f[0]!, last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); main?.removeAttribute('inert'); (opener.current as HTMLElement | null)?.focus?.(); };
  }, [onClose]);
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 70 }}>
      <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgb(48 22 12 / .6)' }} />
      <m.div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className="card" initial={reduce ? false : { x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={springFirm}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 'min(460px, 100%)', overflow: 'auto', padding: 24, borderRight: 0, borderTop: 0, borderBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
          <h2 id={id} style={{ fontSize: 32, lineHeight: 1.05 }}>{title}</h2>
          <button type="button" className="btn quiet small" onClick={onClose} aria-label="Close" style={{ minWidth: 44, padding: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
          </button>
        </div>
        {children}
      </m.div>
    </div>, document.body);
}
