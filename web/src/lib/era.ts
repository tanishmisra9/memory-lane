import type { Item } from './types';
export const WINDOW = [10, 30] as const;
export const AXIS = 40;
// Where a song sits on the age axis: a point for a dated song, a span for an artist's active years inside the window.
export function ageSpan(item: Item): [number, number] {
  const [a, b] = item.ages ?? [item.age, item.age];
  return [Math.max(0, Math.min(a, AXIS)), Math.max(0, Math.min(b, AXIS))];
}
export const label = (item: Item, name?: string) => {
  const who = name || 'They', was = name ? 'was' : 'were';
  if (item.kind !== 'song') return `${item.kind === 'film' ? 'Film' : 'Show'}, ${item.year}. ${who} ${was} ${item.age}`;
  if (item.ages && item.ages[0] === item.ages[1]) return `${item.year}. ${who} ${was} ${item.age}`;
  return item.active ? `Active ${item.active}` : '';
};
export const spotify = (item: Item) => `https://open.spotify.com/search/${encodeURIComponent(`${item.title} ${item.by ?? ''}`.trim())}`;
export const apple = (item: Item) => `https://music.apple.com/search?term=${encodeURIComponent(`${item.title} ${item.by ?? ''}`.trim())}`;

// Greedy lane assignment for markers on one line: a marker moves to the next lane when it would sit closer than `gap` to one already there.
export function assignLanes(positions: number[], gap: number): number[] {
  const lanes: number[][] = [], out: number[] = [];
  positions.forEach(pos => {
    let lane = lanes.findIndex(taken => taken.every(p => Math.abs(p - pos) >= gap));
    if (lane < 0) { lane = lanes.length; lanes.push([]); }
    lanes[lane]!.push(pos); out.push(lane);
  });
  return out;
}
