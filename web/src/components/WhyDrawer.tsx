import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { m, useReducedMotion } from 'framer-motion';
import type { Item } from '../lib/types';
import { springFirm } from '../lib/motion';

const lines = (item: Item, born: number): { head: string; body: string }[] => {
  const out: { head: string; body: string }[] = [];
  if (item.kind === 'song') {
    out.push({ head: 'Where it came from', body: item.found ? `Qloo found ${item.by} near ${item.via ?? 'the artists you named'}.` : `You named ${item.by}. Its song was dated through iTunes, so the year is exact.` });
    out.push({ head: 'Why it is from their youth', body: item.ages && item.ages[0] === item.ages[1] ? `Released in ${item.year}, when they were ${item.age}. Their formative years are ${born + 10} to ${born + 30}.` : `${item.by} was active ${item.active ?? 'in those years'}, which overlaps their formative years, ${born + 10} to ${born + 30}.` });
    if (item.themes.length) out.push({ head: 'Why it is gentle', body: `Lyrical themes screened: ${item.themes.join(', ')}. None are upsetting.` });
    if (item.obscurity !== undefined) out.push({ head: 'Why it is familiar', body: `Familiarity rating ${item.obscurity}. Only artists rated 3 or lower are played.` });
    if (!item.themes.length || item.obscurity === undefined) out.push({ head: 'What could not be checked', body: item.found ? 'Qloo lists no lyrical themes or familiarity rating for this artist, so those checks could not run. It is marked "unknown" rather than assumed safe.' : 'You named this artist, and Qloo keeps no lyrical themes or familiarity rating for it, so those checks could not run. It is included because you chose it.' });
  } else {
    out.push({ head: 'Where it came from', body: `Qloo returned this ${item.kind} near the artists, released ${item.year}, when they were ${item.age}. Of the in-window results, the most widely known was chosen.` });
  }
  const c = item.culture;
  if (c) {
    const bits: string[] = [];
    if (c.scene.length) bits.push(`Scene: ${c.scene.join(', ')}.`);
    if (c.influences.length) bits.push(`Shaped by ${c.influences.join(', ')}.`);
    if (c.origin) bits.push(`From ${c.origin}.`);
    if (c.fans.length) bits.push(`Qloo describes its listeners as ${c.fans.join(', ').toLowerCase()}.`);
    if (c.impact) bits.push(c.impact);
    if (bits.length) out.push({ head: 'Their cultural thread', body: bits.join(' ') });
    if (c.closest.length) out.push({ head: 'Closest to what you named', body: `${c.closest.map(x => `${x.name} ${x.pct}%`).join(', ')}. This is Qloo's own measure of which artist pulled this ${item.kind === 'song' ? 'artist' : item.kind} in.` });
  }
  out.push({ head: 'Who decided', body: 'Qloo finds the candidates. Plain, tested rules decide what is safe to play. No AI model makes that call.' });
  return out;
};

// A dialog that traps focus, locks the page behind it (inert), and closes on Escape: the Portfolio's overlay pattern.
export function WhyDrawer({ item, born, onClose }: { item: Item; born: number; onClose: () => void }) {
  const reduce = useReducedMotion(), ref = useRef<HTMLDivElement>(null), opener = useRef<Element | null>(document.activeElement);
  useEffect(() => {
    const main = document.getElementById('app-main'); main?.setAttribute('inert', '');
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab' && ref.current) {
        const f = [...ref.current.querySelectorAll<HTMLElement>('button, a[href]')]; if (!f.length) return;
        const first = f[0]!, last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); main?.removeAttribute('inert'); (opener.current as HTMLElement | null)?.focus?.(); };
  }, [onClose]);
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 70 }}>
      <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgb(48 22 12 / .6)' }} />
      <m.div ref={ref} role="dialog" aria-modal="true" aria-labelledby="why-title" className="card" initial={reduce ? false : { x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={springFirm}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 'min(440px, 100%)', overflow: 'auto', padding: 24, borderRight: 0, borderTop: 0, borderBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
          <h2 id="why-title" style={{ fontSize: 32, lineHeight: 1.05 }}>Why this {item.kind === 'song' ? 'song' : item.kind}</h2>
          <button type="button" className="btn quiet small" onClick={onClose} aria-label="Close" style={{ minWidth: 44, padding: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
          </button>
        </div>
        <p style={{ marginTop: 8, font: '700 24px var(--font-display)', textTransform: 'uppercase' }}>{item.title}{item.by ? <span style={{ fontWeight: 400, fontFamily: 'var(--font-body)', textTransform: 'none', fontSize: 18 }}> · {item.by}</span> : null}</p>
        <dl style={{ margin: '20px 0 0', display: 'grid', gap: 18 }}>
          {lines(item, born).map(l => <div key={l.head}><dt className="label">{l.head}</dt><dd style={{ margin: '4px 0 0' }}>{l.body}</dd></div>)}
        </dl>
      </m.div>
    </div>, document.body);
}
