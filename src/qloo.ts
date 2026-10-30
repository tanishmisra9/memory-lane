import { eraWindow, inWindow, safety, type Artist, type Culture, type CulturalProfile, type Media, type Pool } from './engine';

const BASE = 'https://hackathon.api.qloo.com';
export type Cache = { get(key: string): Promise<unknown | null>; set(key: string, value: unknown, ttlMs: number): Promise<void> };
export type Step = { text: string; kept?: number; dropped?: number };
export type Raw = { entity_id?: string; name?: string; tags?: Array<{ name?: string; type?: string }>; properties?: Record<string, unknown>; query?: { explainability?: Record<string, Array<{ entity_id: string; score: number }>> } };

const memory = new Map<string, { value: unknown; expires: number }>();
export const memoryCache: Cache = {
  async get(key) { const hit = memory.get(key); return hit && hit.expires > Date.now() ? hit.value : null; },
  async set(key, value, ttl) { if (memory.size > 300) memory.clear(); memory.set(key, { value, expires: Date.now() + ttl }); },
};

// Qloo's terms allow private server-side caching; it also keeps a rate-limited hackathon key usable.
export async function qlooGet(path: string, params: Record<string, string>, key: string, cache: Cache = memoryCache): Promise<unknown> {
  const query = new URLSearchParams(params).toString(), id = `${path}?${query}`;
  const hit = await cache.get(id); if (hit) return hit;
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(`${BASE}${path}?${query}`, { headers: { 'X-Api-Key': key } });
    if (response.status === 429 && attempt < 2) { await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1))); continue; }
    if (response.status === 429) throw new Error('Qloo is busy right now (rate limit). Try again in a minute.');
    if (!response.ok) throw new Error(`Qloo unavailable (${response.status}).`);
    const value = await response.json();
    await cache.set(id, value, 24 * 3600_000);
    return value;
  }
}

export const list = (data: unknown): Raw[] => { const r = (data as { results?: unknown })?.results; const items = Array.isArray(r) ? r : (r as { entities?: unknown })?.entities; return Array.isArray(items) ? items as Raw[] : []; };
// Qloo uses null for unknown, and Number(null) is 0, which would read an active artist's end_year as 0.
export const one = (value: unknown): number | undefined => { const v = Array.isArray(value) ? value[0] : value; if (v === null || v === undefined || v === '') return undefined; const n = Number(v); return Number.isFinite(n) ? n : undefined; };
export const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
export const image = (value: unknown): string | undefined => { const url = (value as { url?: unknown })?.url; return typeof url === 'string' ? url : undefined; };
export const norm = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const short = (value: unknown, max: number): string | undefined => typeof value === 'string' && value.trim() ? (value.length > max ? `${value.slice(0, max).replace(/\s+\S*$/, '')}…` : value.trim()) : undefined;
// Genre tags name the scene an artist belongs to (Laiko, Bossa Nova); "obscurity" and audience tags are not scenes.
const scenes = (raw: Raw): string[] => [...new Set((raw.tags ?? []).filter(t => t.name && /:genre:/.test(t.type ?? '')).map(t => t.name!))].slice(0, 3);
export function cultureOf(raw: Raw, closest: Culture['closest'] = []): Culture {
  const p = raw.properties || {}, place = typeof p.place_of_birth === 'string' ? p.place_of_birth.split(',').pop()?.trim() : undefined;
  return { scene: scenes(raw), influences: strings(p.influenced_by).slice(0, 3), origin: place || undefined, impact: short(p.cultural_impact, 220), fans: strings(p.adjectives_for_fans).slice(0, 3), closest };
}
// Qloo's explainability says how much each signal artist contributed to a result; turn it into "closest to ..." shares.
export function closestTo(raw: Raw, names: Map<string, string>): Culture['closest'] {
  const share = new Map<string, number>();
  for (const e of Object.values(raw.query?.explainability || {}).flat()) share.set(e.entity_id, (share.get(e.entity_id) ?? 0) + e.score);
  const total = [...share.values()].reduce((a, b) => a + b, 0);
  return total ? [...share].map(([id, v]) => ({ name: names.get(id) ?? '', pct: Math.round((v / total) * 100) })).filter(c => c.name).sort((a, b) => b.pct - a.pct).slice(0, 3) : [];
}
export function toArtist(raw: Raw): Artist | null {
  const p = raw.properties || {};
  if (!raw.entity_id || !raw.name) return null;
  return { id: raw.entity_id, name: raw.name, start: one(p.start_year), end: one(p.end_year), obscurity: one(p.obscurity_scale), complexity: one(p.complexity_scale),
    themes: strings(p.lyrical_themes), songs: strings(p.notable_songs).slice(0, 4), genres: strings(p.primary_genres).slice(0, 3), image: image(p.image), culture: cultureOf(raw) };
}
export function toMedia(raw: Raw, kind: 'film' | 'show'): Media | null {
  const year = one(raw.properties?.release_year);
  return raw.entity_id && raw.name && year ? { id: raw.entity_id, title: raw.name, year, kind, image: image(raw.properties?.image), popularity: typeof (raw as { popularity?: unknown }).popularity === 'number' ? (raw as { popularity: number }).popularity : 0 } : null;
}

async function searchRaw(q: string, key: string, cache?: Cache): Promise<Raw[]> {
  return list(await qlooGet('/search', { query: q, take: '6', types: 'urn:entity:artist' }, key, cache)).filter(e => e.entity_id && e.name);
}
export async function searchArtists(q: string, key: string, cache?: Cache): Promise<{ id: string; name: string; image?: string }[]> {
  return (await searchRaw(q, key, cache)).map(e => ({ id: e.entity_id!, name: e.name!, image: image(e.properties?.image) })).slice(0, 6);
}
// Qloo search is fuzzy (a nonsense name still returns something), so accept a match only when the names agree.
export async function resolveAnchor(name: string, key: string, cache?: Cache): Promise<{ id: string; name: string; artist: Artist | null } | null> {
  const wanted = norm(name);
  const hit = (await searchRaw(name, key, cache)).find(a => { const got = norm(a.name!); return got === wanted || got.includes(wanted) || wanted.includes(got); });
  return hit ? { id: hit.entity_id!, name: hit.name!, artist: toArtist(hit) } : null;
}

export type AgentResult = { anchors: { id: string; name: string }[]; unresolved: string[]; pool: Pool; trace: Step[] };
export const TARGET_SAFE = 15, MAX_HOPS = 3;

export async function runAgent(input: { born: number; anchors: string[] }, key: string, cache?: Cache, onStep?: (step: Step) => void): Promise<AgentResult> {
  const trace: Step[] = [], [from, to] = eraWindow(input.born);
  // Every trace line is also announced as it happens, so the page can show the real work live.
  const say = (step: Step) => { trace.push(step); onStep?.(step); };
  const resolved = await Promise.all(input.anchors.map(async name => ({ name, hit: await resolveAnchor(name, key, cache) })));
  const anchors = resolved.flatMap(r => r.hit ? [{ id: r.hit.id, name: r.hit.name }] : []), unresolved = resolved.filter(r => !r.hit).map(r => r.name);
  if (!anchors.length) throw Object.assign(new Error(`Qloo could not find ${unresolved.join(', ')}. Check the spelling or pick from the shelf.`), { unresolved });
  say({ text: `Found ${anchors.map(a => a.name).join(', ')} in Qloo.`, kept: anchors.length, dropped: unresolved.length });

  const names = new Map(anchors.map(a => [a.id, a.name])), pool = new Map<string, Artist>();
  // The artists the caregiver named go first: they are the surest songs, and they face the same safety screen as everyone else.
  for (const { hit } of resolved) {
    if (!hit?.artist) continue;
    const known = await datedSongs(hit.name, from, to, cache);
    if (!known.length) { say({ text: `Left out ${hit.name}: no songs on iTunes released ${from} to ${to}.` }); continue; }
    pool.set(hit.id, { ...hit.artist, known, songs: known.map(k => k.title), start: known[0].year, end: undefined });
  }
  let signals = anchors.map(a => a.id);
  const used = new Set(signals);
  for (let hop = 1; hop <= MAX_HOPS; hop++) {
    say({ text: `Asking Qloo for artists near ${signals.length} you gave it.` });
    const data = await qlooGet('/v2/insights', { 'filter.type': 'urn:entity:artist', 'signal.interests.entities': signals.join(','), take: '50', 'feature.explainability': 'true' }, key, cache);
    let added = 0;
    for (const raw of list(data)) {
      const artist = toArtist(raw); if (!artist || pool.has(artist.id)) continue;
      const closest = closestTo(raw, names);
      artist.via = closest[0]?.name;
      artist.culture = cultureOf(raw, closest);
      pool.set(artist.id, artist); names.set(artist.id, artist.name); added++;
    }
    const fit = [...pool.values()].filter(a => inWindow(a, input.born)), safe = fit.filter(a => safety(a).safe);
    say({ text: `Kept artists active ${from} to ${to} that are gentle and familiar.`, kept: safe.length, dropped: pool.size - safe.length });
    if (safe.length >= TARGET_SAFE || !added) break;
    // Re-anchor on artists not yet used, so each hop explores new ground instead of repeating the last query.
    const fresh = safe.filter(a => !used.has(a.id)).slice(0, 5);
    if (!fresh.length) break;
    fresh.forEach(a => used.add(a.id));
    signals = [...anchors.map(a => a.id), ...fresh.map(a => a.id)];
    if (hop < MAX_HOPS) say({ text: `Not enough yet. Asking again from ${fresh.slice(0, 3).map(a => a.name).join(', ')}.` });
  }

  const seeds = [...pool.values()].filter(a => inWindow(a, input.born) && safety(a).safe).slice(0, 5).map(a => a.id);
  const media: Media[] = [];
  for (const [type, kind] of [['movie', 'film'], ['tv_show', 'show']] as const) {
    const data = await qlooGet('/v2/insights', { 'filter.type': `urn:entity:${type}`, 'signal.interests.entities': [...anchors.map(a => a.id), ...seeds].join(','), 'filter.release_year.min': String(from), 'filter.release_year.max': String(to), take: '12', 'feature.explainability': 'true' }, key, cache).catch(() => null);
    // Qloo returns these in order of cultural closeness to the artists. Take the closest one with artwork, not the most famous:
    // for a Greek listener that is a Greek film, not a cartoon everyone knows.
    const rows = list(data), at = rows.findIndex(raw => !!toMedia(raw, kind)?.image), first = at >= 0 ? toMedia(rows[at]!, kind) : null;
    if (first) media.push({ ...first, closest: closestTo(rows[at]!, names) });
  }
  const fitted = [...pool.values()].filter(a => (inWindow(a, input.born) || a.known) && safety(a).safe);
  const culture = profileOf(fitted);
  say({ text: `Picked films and shows released ${from} to ${to}, closest to what you named.`, kept: media.length });
  if (culture.scenes.length) say({ text: `Qloo reads their culture as ${culture.scenes.join(', ')}${culture.influences.length ? `, shaped by ${culture.influences.join(', ')}` : ''}.` });
  return { anchors, unresolved, pool: { artists: [...pool.values()], media, culture }, trace };
}

const top = (values: string[], n: number, drop: Set<string> = new Set()) => {
  const count = new Map<string, number>();
  for (const v of values) if (v && !drop.has(norm(v))) count.set(v, (count.get(v) ?? 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1]).slice(0, n).map(([v]) => v);
};
// The scenes, influences and origins that recur across everything Qloo found for this person: their cultural profile, read from the taste graph (nothing is asked about ethnicity).
export function profileOf(artists: Artist[]): CulturalProfile {
  const own = new Set(artists.map(a => norm(a.name))), c = artists.flatMap(a => a.culture ? [a.culture] : []);
  return { scenes: top(c.flatMap(x => x.scene), 3), influences: top(c.flatMap(x => x.influences), 3, own), origins: top(c.flatMap(x => (x.origin && x.origin.length > 3 ? [x.origin] : [])), 3), fans: top(c.flatMap(x => x.fans), 3) };
}

// iTunes serves artwork at the size in its URL; ask for a big one for the full-screen player.
export const bigArt = (url?: string): string | undefined => url ? url.replace(/\/\d+x\d+bb\.(jpg|png)/, '/600x600bb.$1') : undefined;

// Qloo's search results carry no era data, so for the artists a caregiver names, iTunes supplies dated songs inside the window.
export async function datedSongs(artist: string, from: number, to: number, cache: Cache = memoryCache): Promise<{ title: string; year: number; previewUrl: string; art?: string }[]> {
  const id = `itunes-dated3:${norm(artist)}:${from}:${to}`, hit = await cache.get(id);
  if (hit) return hit as { title: string; year: number; previewUrl: string; art?: string }[];
  const response = await fetch(`https://itunes.apple.com/search?${new URLSearchParams({ term: artist, media: 'music', entity: 'song', attribute: 'artistTerm', limit: '50' })}`).catch(() => null);
  if (!response?.ok) return [];
  const data = await response.json() as { results?: Array<{ trackName?: string; artistName?: string; previewUrl?: string; releaseDate?: string; artworkUrl100?: string }> };
  const lead = norm(artist).split(' ')[0], seen = new Set<string>(), out: { title: string; year: number; previewUrl: string; art?: string }[] = [];
  for (const r of data.results ?? []) {
    const year = Number((r.releaseDate || '').slice(0, 4)), title = r.trackName || '';
    if (!r.previewUrl || !title || !norm(r.artistName || '').includes(lead) || year < from || year > to || seen.has(norm(title))) continue;
    seen.add(norm(title)); const art = bigArt(r.artworkUrl100); out.push(art ? { title, year, previewUrl: r.previewUrl, art } : { title, year, previewUrl: r.previewUrl });
  }
  // Keep the songs nearest the middle of the window (about age 20), not simply the oldest.
  const middle = (from + to) / 2;
  out.sort((a, b) => Math.abs(a.year - middle) - Math.abs(b.year - middle));
  const result = out.slice(0, 3);
  if (result.length) await cache.set(id, result, 30 * 24 * 3600_000);
  return result;
}

// iTunes returns a 30-second preview; the artist name must match so a cover or namesake is never played.
export async function previewFor(song: string, artist: string, cache: Cache = memoryCache): Promise<{ url: string; art?: string } | null> {
  const id = `itunes2:${norm(song)}:${norm(artist)}`, hit = await cache.get(id);
  if (hit !== null) return hit === '' ? null : hit as { url: string; art?: string };
  const response = await fetch(`https://itunes.apple.com/search?${new URLSearchParams({ term: `${song} ${artist}`, media: 'music', entity: 'song', limit: '6' })}`).catch(() => null);
  if (!response?.ok) { console.warn('itunes preview lookup failed', response?.status ?? 'network', song, artist); return null; }
  const data = await response.json() as { results?: Array<{ previewUrl?: string; artistName?: string; artworkUrl100?: string }> };
  const lead = norm(artist).split(' ')[0];
  const match = data.results?.find(r => r.previewUrl && norm(r.artistName || '').includes(lead));
  const found = match?.previewUrl ? { url: match.previewUrl, art: bigArt(match.artworkUrl100) } : null;
  // A miss is remembered briefly: iTunes can answer a burst of lookups with an empty list, and a week-long miss would silence that song.
  await cache.set(id, found ?? '', found ? 30 * 24 * 3600_000 : 15 * 60_000);
  return found;
}
