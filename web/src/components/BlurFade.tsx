import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { blurFade, ease } from '../lib/motion';

// Telogify's reveal: fade up out of a blur. Skipped entirely under reduced motion.
export function BlurFade({ children, delay = 0, className, as = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'section' | 'li' }) {
  const reduce = useReducedMotion();
  const Tag = m[as];
  if (reduce) return <div className={className}>{children}</div>;
  return <Tag className={className} {...blurFade} transition={{ duration: 0.6, ease, delay }}>{children}</Tag>;
}
