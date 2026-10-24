import type { Item } from '../lib/types';
import { AXIS, WINDOW, ageSpan, assignLanes } from '../lib/era';

const stock = (item: Item) => `stock-${item.kind === 'song' ? 'red' : item.kind === 'film' ? 'cobalt' : 'green'}`;
// The whole session on one line. Dated songs, films and shows are points at the age they belong to;
// artists known only by their active years are drawn as bars across those years, never as a made-up point.
export function BookTimeline({ born, items }: { born: number; items: Item[] }) {
  const dated = items.filter(i => { const [a, b] = ageSpan(i); return b - a <= 1; }), spans = items.filter(i => !dated.includes(i));
  const lane = assignLanes(dated.map(i => ageSpan(i)[0]), 2.6), rows = Math.max(1, ...lane.map(l => l + 1)), ROW = 34, BAR = 22;
  const pct = (age: number) => `${(age / AXIS) * 100}%`;
  const base = 32, height = base + rows * ROW + spans.length * BAR + 12;
  return (
    <div aria-hidden="true" style={{ position: 'relative', height, marginInline: 20 }}>
      <div style={{ position: 'absolute', left: pct(WINDOW[0]), width: `${((WINDOW[1] - WINDOW[0]) / AXIS) * 100}%`, top: 0, bottom: 30, background: 'color-mix(in oklab, var(--color-action) 40%, transparent)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 30, height: 2, background: 'var(--color-ink)' }} />
      {[0, 10, 20, 30, 40].map(age => (
        <div key={age} style={{ position: 'absolute', left: pct(age), bottom: 0, transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ width: 2, height: 10, background: 'var(--color-ink)', margin: '0 auto' }} />
          <div style={{ font: '600 13px var(--font-body)', color: 'var(--color-muted)', marginTop: 2 }}>{born + age}</div>
        </div>
      ))}
      {dated.map((item, i) => (
        <span key={item.id} className={`code ${stock(item)}`} style={{ position: 'absolute', left: pct(ageSpan(item)[0]), bottom: base + 4 + (lane[i] ?? 0) * ROW, transform: 'translateX(-50%)', minWidth: 30, height: 28, fontSize: 16, border: '1.5px solid var(--color-ink)', boxShadow: '2px 2px 0 var(--color-shadow)', outline: item.reaction === 'smiled' ? '3px solid var(--color-green)' : undefined }}>{item.code}</span>
      ))}
      {spans.map((item, i) => { const [a, b] = ageSpan(item); return (
        <span key={item.id} className={stock(item)} style={{ position: 'absolute', left: pct(a), width: `${((b - a) / AXIS) * 100}%`, minWidth: 30, bottom: base + rows * ROW + 8 + i * BAR, height: 18, background: 'var(--stock)', color: '#fff', font: '700 13px/18px var(--font-display)', paddingLeft: 6, border: '1px solid var(--color-ink)', outline: item.reaction === 'smiled' ? '3px solid var(--color-green)' : undefined }}>{item.code}</span>
      ); })}
    </div>
  );
}
