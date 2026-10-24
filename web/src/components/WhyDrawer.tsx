import type { Item } from '../lib/types';
import { Drawer } from './Drawer';

const lines = (item: Item, born: number): { head: string; body: string }[] => {
  const out: { head: string; body: string }[] = [];
  if (item.kind === 'song') {
    out.push({ head: 'Where it came from', body: item.found ? `Qloo found ${item.by} near ${item.via ?? 'the artists you named'}.` : `You named ${item.by}. Its song was dated through iTunes, so the year is exact.` });
    out.push({ head: 'Why it is from their youth', body: item.ages && item.ages[0] === item.ages[1] ? `Released in ${item.year}, when they were ${item.age}. Their formative years are ${born + 10} to ${born + 30}.` : `${item.by} was active ${item.active ?? 'in those years'}, which overlaps their formative years, ${born + 10} to ${born + 30}.` });
    if (item.themes.length) out.push({ head: 'Why it is gentle', body: `Lyrical themes screened: ${item.themes.join(', ')}. None are upsetting.` });
    if (item.obscurity !== undefined) out.push({ head: 'Why it is familiar', body: `Familiarity rating ${item.obscurity}. Only artists rated 3 or lower are played.` });
    if (!item.themes.length || item.obscurity === undefined) out.push({ head: 'What could not be checked', body: item.found ? 'Qloo lists no lyrical themes or familiarity rating for this artist, so those checks could not run. It is marked "unknown" rather than assumed safe.' : 'You named this artist, and Qloo keeps no lyrical themes or familiarity rating for it, so those checks could not run. It is included because you chose it.' });
  } else if (item.timeless) {
    out.push({ head: 'Where it came from', body: item.kind === 'meal' ? 'Qloo searched restaurants near the city you gave, filtered to their home cuisine, ranked by closeness to the artists you named.' : 'Qloo ranked destinations by cultural closeness to the artists you named. This is somewhere to revisit in memory or on a map.' });
  } else {
    out.push({ head: 'Where it came from', body: `Qloo returned this ${item.kind} near the artists you named, from ${item.year}, when they were ${item.age}. Qloo ranks these by cultural closeness, not fame.` });
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

export function WhyDrawer({ item, born, onClose }: { item: Item; born: number; onClose: () => void }) {
  return (
    <Drawer id="why-title" title={`Why this ${item.kind === 'song' ? 'song' : item.kind}`} onClose={onClose}>
      <p style={{ marginTop: 8, font: '700 24px var(--font-display)', textTransform: 'uppercase' }}>{item.title}{item.by ? <span style={{ fontWeight: 400, fontFamily: 'var(--font-body)', textTransform: 'none', fontSize: 18 }}> · {item.by}</span> : null}</p>
      <dl style={{ margin: '20px 0 0', display: 'grid', gap: 18 }}>
        {lines(item, born).map(l => <div key={l.head}><dt className="label">{l.head}</dt><dd style={{ margin: '4px 0 0' }}>{l.body}</dd></div>)}
      </dl>
    </Drawer>
  );
}
