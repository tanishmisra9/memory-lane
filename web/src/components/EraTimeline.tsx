import { m, useReducedMotion } from 'framer-motion';
import { AXIS, WINDOW } from '../lib/era';
import { spring } from '../lib/motion';

// Ages 0 to 40 along a line, the 10-to-30 window shaded, and a marker that springs to where this song sits.
// It is the thesis drawn instead of stated: this music belongs to their youth.
export function EraTimeline({ born, span, caption, flag }: { born: number; span: [number, number] | null; caption?: string; flag?: string }) {
  const reduce = useReducedMotion();
  const pct = (age: number) => `${(age / AXIS) * 100}%`;
  const [a, b] = span ?? [0, 0];
  const transition = reduce ? { duration: 0 } : spring;
  return (
    <figure style={{ margin: 0 }} aria-label={span ? `Placed at ages ${a} to ${b}, inside their formative years ages 10 to 30` : 'Their formative years, ages 10 to 30'}>
      <div style={{ position: 'relative', height: 56, marginInline: 20, marginTop: flag ? 24 : 0 }} aria-hidden="true">
        <div style={{ position: 'absolute', left: pct(WINDOW[0]), width: `${((WINDOW[1] - WINDOW[0]) / AXIS) * 100}%`, top: 8, height: 26, background: 'color-mix(in oklab, var(--color-action) 70%, transparent)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 33, height: 2, background: 'var(--color-ink)' }} />
        {[0, 10, 20, 30, 40].map(age => (
          <div key={age} style={{ position: 'absolute', left: pct(age), top: 28, transform: 'translateX(-50%)', textAlign: 'center' }}>
            <div style={{ width: 2, height: 12, background: 'var(--color-ink)', margin: '0 auto' }} />
            <div style={{ font: '600 13px var(--font-body)', color: 'var(--color-muted)', marginTop: 2 }}>{age === 0 ? born : born + age}</div>
          </div>
        ))}
        {span && flag && (
          <m.div initial={false} animate={{ left: pct(a) }} transition={transition} style={{ position: 'absolute', top: -22, translate: '-50% 0', font: '700 14px var(--font-body)', whiteSpace: 'nowrap' }}>{flag}</m.div>
        )}
        {span && (
          <m.div initial={false} animate={{ left: pct(a), width: `max(14px, ${((b - a) / AXIS) * 100}%)` }} transition={transition}
            style={{ position: 'absolute', top: 4, height: 34, background: 'var(--color-red)', border: '1.5px solid var(--color-ink)', borderRadius: 2, boxShadow: '2px 2px 0 var(--color-shadow)', translate: '-7px 0' }} />
        )}
      </div>
      {caption && <figcaption className="hint" style={{ marginTop: 6 }}>{caption}</figcaption>}
    </figure>
  );
}
