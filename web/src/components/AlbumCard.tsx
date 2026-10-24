import { useState } from 'react';
import { m, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import type { Item } from '../lib/types';

// Large artwork that tilts toward the cursor. If the picture is missing or fails, a drawn strip stands in.
export function AlbumCard({ item, size = 'min(78vw, 420px)' }: { item: Item; size?: string }) {
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
      style={{ width: size, aspectRatio: '1 / 1', rotateX: tilt ? rotateX : 0, rotateY: tilt ? rotateY : 0, transformPerspective: 900 }}
      className="card" >
      {src
        ? <img src={src} alt={`Cover for ${item.title}${item.by ? ` by ${item.by}` : ''}`} onError={() => setBroken(b => ({ ...b, [src]: true }))} width={600} height={600} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <div aria-hidden="true" style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: item.kind === 'song' ? 'var(--color-red)' : item.kind === 'film' ? 'var(--color-cobalt)' : 'var(--color-green)', color: '#fff', font: '700 clamp(72px, 22vw, 160px) var(--font-display)' }}>{item.code}</div>}
    </m.div>
  );
}
