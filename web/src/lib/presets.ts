import type { BuildInput } from './types';
// Real examples a judge can try in one tap. Their Qloo lookups are cached on the server, so they start fast.
export const PRESETS: Record<string, BuildInput & { label: string }> = {
  us: { label: 'United States, 1946', born: 1946, anchors: ['Frank Sinatra', 'Elvis Presley'] },
  mexico: { label: 'Mexico, 1950', born: 1950, anchors: ['Vicente Fernández', 'José José'] },
  greece: { label: 'Greece, 1947', born: 1947, anchors: ['Nana Mouskouri', 'Mikis Theodorakis'] },
  india: { label: 'India, 1948', born: 1948, anchors: ['Lata Mangeshkar', 'Kishore Kumar'] },
};
