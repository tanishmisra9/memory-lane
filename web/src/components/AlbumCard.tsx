import { useState } from 'react';
import { m, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import type { Item } from '../lib/types';
import { stockOf } from '../lib/era';

// Large artwork that tilts toward the cursor. If the picture is missing or fails, a drawn strip stands in.
export function Cover({ item, size }: { item: Item; size: number }) {
  const src = [item.art, item.image].find(Boolean), [bad, setBad] = useState(false);
  const fill = `var(--color-${stockOf(item.kind)})`;
  return src && !bad
    ? <img src={src} alt={`Cover for ${item.title}`} width={size} height={size} onError={() => setBad(true)} style={{ width: size, height: size, objectFit: 'cover', border: '1.5px solid var(--color-ink)', display: 'block', flex: 'none' }} />
    : <div aria-hidden="true" style={{ width: size, height: size, flex: 'none', display: 'grid', placeItems: 'center', background: fill, color: '#fff', font: `700 ${Math.round(size / 3)}px var(--font-display)`, border: '1.5px solid var(--color-ink)' }}>{item.code}</div>;
}

export function AlbumCard({ item, size = 'min(70vw, 460px)', playing = false }: { item: Item; size?: string; playing?: boolean }) {
  const reduce = useReducedMotion();
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const src = [item.art, item.image].find(url => url && !broken[url]);
  const x = useMotionValue(0), y = useMotionValue(0);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-7, 7]), { stiffness: 200, damping: 20 });
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 200, damping: 20 });
  const tilt = !reduce && typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
  return (
    <m.div
      onPointerMove={tilt ? e => { const r = e.currentTarget.getBoundingClientRect(); x.set((e.clientX - r.left) / r.width - 0.5); y.set((e.clientY - r.top) / r.height - 0.5); } : undefined}
      onPointerLeave={tilt ? () => { x.set(0); y.set(0); } : undefined}
      animate={reduce ? undefined : { y: playing ? -6 : 0, boxShadow: playing ? '10px 10px 0 var(--color-shadow)' : '4px 4px 0 var(--color-shadow)' }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      style={{ width: size, aspectRatio: '1 / 1', rotateX: tilt ? rotateX : 0, rotateY: tilt ? rotateY : 0, transformPerspective: 900 }}
      className="card" >
      {src
        ? <img src={src} alt={`Cover for ${item.title}${item.by ? ` by ${item.by}` : ''}`} onError={() => setBroken(b => ({ ...b, [src]: true }))} width={600} height={600} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <div aria-hidden="true" style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: `var(--color-${stockOf(item.kind)})`, color: '#fff', font: '700 clamp(72px, 22vw, 160px) var(--font-display)' }}>{item.code}</div>}
    </m.div>
  );
}
