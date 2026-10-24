import type { Item } from '../lib/types';
import { AXIS, WINDOW, ageSpan, assignLanes } from '../lib/era';

// The whole session on one line: every song, film and show placed at the age it belongs to.
export function BookTimeline({ born, items }: { born: number; items: Item[] }) {
  const mids = items.map(i => { const [a, b] = ageSpan(i); return (a + b) / 2; });
  const lane = assignLanes(mids, 2.6), rows = Math.max(1, ...lane.map(l => l + 1)), ROW = 34;
  const pct = (age: number) => `${(age / AXIS) * 100}%`;
  return (
    <div aria-hidden="true" style={{ position: 'relative', height: rows * ROW + 44, marginInline: 14 }}>
      <div style={{ position: 'absolute', left: pct(WINDOW[0]), width: `${((WINDOW[1] - WINDOW[0]) / AXIS) * 100}%`, top: 0, bottom: 30, background: 'color-mix(in oklab, var(--color-action) 40%, transparent)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 30, height: 2, background: 'var(--color-ink)' }} />
      {[0, 10, 20, 30, 40].map(age => (
        <div key={age} style={{ position: 'absolute', left: pct(age), bottom: 0, transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ width: 2, height: 10, background: 'var(--color-ink)', margin: '0 auto' }} />
          <div style={{ font: '600 13px var(--font-body)', color: 'var(--color-muted)', marginTop: 2 }}>{born + age}</div>
        </div>
      ))}
      {items.map((item, i) => (
        <span key={item.id} className={`code stock-${item.kind === 'song' ? 'red' : item.kind === 'film' ? 'cobalt' : 'green'}`}
          style={{ position: 'absolute', left: pct(mids[i] ?? 0), bottom: 32 + (lane[i] ?? 0) * ROW, transform: 'translateX(-50%)', minWidth: 30, height: 28, fontSize: 16, border: '1.5px solid var(--color-ink)', boxShadow: '2px 2px 0 var(--color-shadow)', outline: item.reaction === 'smiled' ? '3px solid var(--color-green)' : undefined }}>{item.code}</span>
      ))}
    </div>
  );
}
