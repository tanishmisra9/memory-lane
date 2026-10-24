import { closestTo, image, list, one, qlooGet, strings, type Cache, type Raw } from './qloo';
import type { Culture, Media, MediaKind } from './engine';

// Qloo silently ignores parameters that do not belong to an entity type, so every call is checked against an allowlist first.
export type Domain = 'movie' | 'tv_show' | 'book' | 'destination' | 'place';
const KIND: Record<Domain, MediaKind> = { movie: 'film', tv_show: 'show', book: 'book', destination: 'place', place: 'meal' };
const ALLOWED: Record<Domain, string[]> = {
  movie: ['filter.type', 'signal.interests.entities', 'filter.release_year.min', 'filter.release_year.max', 'feature.explainability', 'take'],
  tv_show: ['filter.type', 'signal.interests.entities', 'filter.release_year.min', 'filter.release_year.max', 'feature.explainability', 'take'],
  book: ['filter.type', 'signal.interests.entities', 'filter.publication_year.min', 'filter.publication_year.max', 'feature.explainability', 'take'],
  destination: ['filter.type', 'signal.interests.entities', 'feature.explainability', 'take'],
  place: ['filter.type', 'signal.interests.entities', 'filter.location.query', 'filter.tags', 'feature.explainability', 'take'],
};
export function checkParams(domain: Domain, params: Record<string, string>): void {
  const bad = Object.keys(params).filter(k => !ALLOWED[domain].includes(k));
  if (bad.length) throw new Error(`Parameter ${bad.join(', ')} does not apply to ${domain}; Qloo would ignore it silently.`);
}

export type Candidate = Media & { names: string[]; tags: string[] };
const yearOf = (raw: Raw, domain: Domain): number | undefined => one(raw.properties?.[domain === 'book' ? 'publication_year' : 'release_year']);

// One call to Qloo Insights for one domain, shaped for both the agent and the UI. `names` maps signal ids to artist names for explainability.
export async function explore(domain: Domain, o: { signals: string[]; names: Map<string, string>; from?: number; to?: number; city?: string; cuisine?: string; take?: number }, key: string, cache?: Cache): Promise<Candidate[]> {
  const params: Record<string, string> = { 'filter.type': `urn:entity:${domain}`, 'signal.interests.entities': o.signals.join(','), 'feature.explainability': 'true', take: String(o.take ?? 10) };
  if (domain === 'movie' || domain === 'tv_show') { if (o.from) params['filter.release_year.min'] = String(o.from); if (o.to) params['filter.release_year.max'] = String(o.to); }
  if (domain === 'book') { if (o.from) params['filter.publication_year.min'] = String(o.from); if (o.to) params['filter.publication_year.max'] = String(o.to); }
  if (domain === 'place') { if (!o.city || !o.cuisine) throw new Error('A meal needs a city and a cuisine tag id.'); params['filter.location.query'] = o.city; params['filter.tags'] = o.cuisine; }
  checkParams(domain, params);
  const rows = list(await qlooGet('/v2/insights', params, key, cache));
  const kind = KIND[domain], out: Candidate[] = [];
  for (const raw of rows) {
    if (!raw.entity_id || !raw.name) continue;
    const year = yearOf(raw, domain);
    if (domain !== 'destination' && domain !== 'place' && !year) continue;
    const tags = [...new Set((raw.tags ?? []).map(t => t.name).filter((n): n is string => !!n))].slice(0, 6);
    const p = raw.properties || {};
    const blurb = domain === 'destination' ? (typeof p.short_description === 'string' ? p.short_description : typeof p.description === 'string' ? p.description : undefined) : domain === 'book' ? (typeof p.description === 'string' ? p.description : undefined) : undefined;
    out.push({ id: raw.entity_id, title: raw.name, year: year ?? 0, kind, timeless: !year, image: image(p.image), blurb: blurb ? (blurb.length > 200 ? `${blurb.slice(0, 200).replace(/\s+\S*$/, '')}…` : blurb) : undefined, closest: closestTo(raw, o.names), names: strings([raw.name]), tags });
  }
  return out;
}

export async function findTags(query: string, key: string, cache?: Cache): Promise<{ id: string; name: string; kind: string }[]> {
  const data = await qlooGet('/v2/tags', { 'filter.query': query, take: '8' }, key, cache) as { results?: { tags?: Array<{ id?: string; tag_id?: string; name?: string; subtype?: string }> } };
  return (data.results?.tags ?? []).flatMap(t => { const id = t.id ?? t.tag_id; return id && t.name ? [{ id, name: t.name, kind: id.split(':').slice(2, 4).join(':') }] : []; });
}
export type { Culture };
