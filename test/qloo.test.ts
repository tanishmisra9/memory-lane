import test from 'node:test';
import assert from 'node:assert/strict';
import { bigArt, memoryCache, previewFor, resolveAnchor, runAgent, toArtist, type Cache } from '../src/qloo';

const fresh = (): Cache => { const m = new Map<string, unknown>(); return { async get(k) { return m.get(k) ?? null; }, async set(k, v) { m.set(k, v); } }; };
const ent = (id: string, name: string, p: Record<string, unknown> = {}) => ({ entity_id: id, name, properties: { start_year: 1962, obscurity_scale: ['1'], lyrical_themes: ['Love'], notable_songs: [`${name} Song`], primary_genres: ['Pop'], ...p } });
async function withFetch(handler: (url: string) => Response | Promise<Response>, run: () => Promise<void>) {
  const original = globalThis.fetch; globalThis.fetch = (async (input: unknown) => handler(String(input))) as typeof fetch;
  try { await run(); } finally { globalThis.fetch = original; }
}

test('toArtist reads Qloo field shapes (arrays, nulls) and drops entities without an id', () => {
  const a = toArtist({ entity_id: 'x', name: 'X', properties: { start_year: 1965, end_year: null, obscurity_scale: ['3'], complexity_scale: null, notable_songs: ['A', 'B', 'C', 'D', 'E'], image: { url: 'u' } } })!;
  assert.deepEqual([a.start, a.end, a.obscurity, a.complexity, a.songs.length, a.image], [1965, undefined, 3, undefined, 4, 'u']);
  assert.equal(toArtist({ name: 'no id' }), null);
});
test('anchor resolution rejects a fuzzy match whose name differs', async () => {
  await withFetch(() => Response.json({ results: [{ entity_id: '1', name: 'Totally Different Band' }] }), async () => {
    assert.equal(await resolveAnchor('Zzqxv Band 9000', 'k', fresh()), null);
  });
  await withFetch(() => Response.json({ results: [{ entity_id: '1', name: 'Nana Mouskouri' }] }), async () => {
    const hit = await resolveAnchor('nana mouskouri', 'k', fresh()); assert.deepEqual([hit?.id, hit?.name], ['1', 'Nana Mouskouri']);
  });
});
test('agent re-anchors until enough safe in-era artists, then stops at the hop limit', async () => {
  let insights = 0;
  await withFetch(url => {
    if (url.includes('itunes.apple.com')) return Response.json({ results: [{ trackName: 'Anchor Song', artistName: 'Anchor', previewUrl: 'p', releaseDate: '1964-05-01T00:00:00Z' }, { trackName: 'Too Late', artistName: 'Anchor', previewUrl: 'p', releaseDate: '1999-01-01T00:00:00Z' }, { trackName: 'Other Artist', artistName: 'Zed', previewUrl: 'p', releaseDate: '1964-01-01T00:00:00Z' }] });
    if (url.includes('/search?')) return Response.json({ results: [{ entity_id: 'anchor', name: 'Anchor' }] });
    if (url.includes('urn%3Aentity%3Aartist')) { insights++; const base = insights * 100; return Response.json({ results: { entities: Array.from({ length: 5 }, (_, i) => ent(`h${base + i}`, `Artist ${base + i}`)) } }); }
    return Response.json({ results: { entities: [{ ...ent('m1', 'A Film'), properties: { release_year: 1966, image: { url: 'i' } } }] } });
  }, async () => {
    const result = await runAgent({ born: 1946, anchors: ['Anchor', 'Missing'] }, 'k', fresh());
    assert.equal(insights, 3, 'three hops of five artists never reach fifteen safe, so it stops at the limit');
    assert.equal(result.pool.artists.length, 16, 'the named artist plus fifteen found');
    assert.deepEqual(result.unresolved, ['Missing']);
    const named = result.pool.artists.find(a => a.id === 'anchor')!;
    assert.deepEqual(named.known, [{ title: 'Anchor Song', year: 1964, previewUrl: 'p' }], 'only an in-window, name-matched song counts');
    assert.ok(result.trace.some(s => s.text.startsWith('Kept artists active 1956 to 1976')));
    assert.deepEqual(result.pool.media.map(m => m.kind), ['film', 'show']);
  });
});
test('agent fails clearly when no anchor resolves', async () => {
  await withFetch(() => Response.json({ results: [] }), async () => {
    await assert.rejects(runAgent({ born: 1946, anchors: ['Nobody'] }, 'k', fresh()), /could not find Nobody/);
  });
});
test('rate limiting retries, then reports Qloo busy without a generic fallback', async () => {
  let calls = 0;
  await withFetch(() => { calls++; return new Response('', { status: 429 }); }, async () => {
    await assert.rejects(runAgent({ born: 1946, anchors: ['X'] }, 'k-busy', fresh()), /busy/);
    assert.equal(calls, 3);
  });
});
test('preview requires the artist name to match and caches misses', async () => {
  let calls = 0;
  const cache = fresh();
  await withFetch(() => { calls++; return Response.json({ results: [{ previewUrl: 'wrong', artistName: 'Someone Else' }, { previewUrl: 'right', artistName: 'Nana Mouskouri' }] }); }, async () => {
    assert.deepEqual(await previewFor('Song', 'Nana Mouskouri', cache), { url: 'right', art: undefined });
    assert.deepEqual(await previewFor('Song', 'Nana Mouskouri', cache), { url: 'right', art: undefined }); assert.equal(calls, 1);
  });
  await withFetch(() => Response.json({ results: [{ previewUrl: 'wrong', artistName: 'Someone Else' }] }), async () => {
    assert.equal(await previewFor('Other', 'Nana Mouskouri', cache), null);
  });
  void memoryCache;
});

test('a named artist with no songs inside the window is left out, with the reason in the trace', async () => {
  await withFetch(url => {
    if (url.includes('itunes.apple.com')) return Response.json({ results: [{ trackName: 'Late', artistName: 'Anchor', previewUrl: 'p', releaseDate: '2010-01-01T00:00:00Z' }] });
    if (url.includes('/search?')) return Response.json({ results: [{ entity_id: 'anchor', name: 'Anchor' }] });
    return Response.json({ results: { entities: [] } });
  }, async () => {
    const result = await runAgent({ born: 1946, anchors: ['Anchor'] }, 'k-late', fresh());
    assert.ok(result.trace.some(s => s.text.includes('Left out Anchor')));
    assert.equal(result.pool.artists.length, 0);
  });
});

test('artwork URLs are upscaled and everything else is left alone', () => {
  assert.equal(bigArt('https://x/y/100x100bb.jpg'), 'https://x/y/600x600bb.jpg');
  assert.equal(bigArt('https://x/y/cover.png'), 'https://x/y/cover.png');
  assert.equal(bigArt(undefined), undefined);
});
test('agent announces each trace line as it happens, in order, matching the returned trace', async () => {
  const seen: string[] = [];
  await withFetch(url => {
    if (url.includes('itunes.apple.com')) return Response.json({ results: [{ trackName: 'S', artistName: 'Anchor', previewUrl: 'p', releaseDate: '1964-01-01T00:00:00Z', artworkUrl100: 'https://x/100x100bb.jpg' }] });
    if (url.includes('/search?')) return Response.json({ results: [{ entity_id: 'anchor', name: 'Anchor' }] });
    return Response.json({ results: { entities: [] } });
  }, async () => {
    const result = await runAgent({ born: 1946, anchors: ['Anchor'] }, 'k-steps', fresh(), s => seen.push(s.text));
    assert.deepEqual(seen, result.trace.map(s => s.text));
    assert.ok(seen.length >= 3);
    assert.equal(result.pool.artists[0].known?.[0].art, 'https://x/600x600bb.jpg');
  });
});

test('cultural reading: scenes come from genre tags, influences and origin from properties, closeness from explainability', async () => {
  const { cultureOf, closestTo, profileOf } = await import('../src/qloo');
  const raw = { entity_id: 'x', name: 'X', tags: [{ name: 'Laiko', type: 'urn:tag:genre:qloo' }, { name: 'Melodic', type: 'urn:tag:music:qloo' }, { name: 'Laiko', type: 'urn:tag:genre:qloo' }, { name: 'Entehno', type: 'urn:tag:genre:qloo' }], properties: { influenced_by: ['A', 'B', 'C', 'D'], place_of_birth: 'Athens, Attiki, Greece', cultural_impact: 'x'.repeat(300), adjectives_for_fans: ['Loyal', 'Passionate'] }, query: { explainability: { 'signal.interests.entities': [{ entity_id: 'a', score: 0.6 }, { entity_id: 'b', score: 0.4 }] } } };
  const names = new Map([['a', 'Nana'], ['b', 'Mikis']]);
  const closest = closestTo(raw, names);
  assert.deepEqual(closest, [{ name: 'Nana', pct: 60 }, { name: 'Mikis', pct: 40 }]);
  const c = cultureOf(raw, closest);
  assert.deepEqual([c.scene, c.influences, c.origin, c.fans], [['Laiko', 'Entehno'], ['A', 'B', 'C'], 'Greece', ['Loyal', 'Passionate']]);
  assert.ok(c.impact!.length <= 221 && c.impact!.endsWith('…'));
  assert.deepEqual(closestTo({}, names), [], 'no explainability, no shares');
  const profile = profileOf([{ id: '1', name: 'One', themes: [], songs: [], genres: [], culture: c }, { id: '2', name: 'Two', themes: [], songs: [], genres: [], culture: { ...c, influences: ['A', 'Two'] } }]);
  assert.deepEqual([profile.scenes[0], profile.influences[0], profile.origins], ['Laiko', 'A', ['Greece']]);
  assert.ok(!profile.influences.includes('Two'), 'an artist is not listed as its own influence');
});

test('domain calls are checked against an allowlist because Qloo silently ignores strays', async () => {
  const { checkParams } = await import('../src/domains');
  assert.doesNotThrow(() => checkParams('movie', { 'filter.type': 'urn:entity:movie', 'filter.release_year.min': '1957', take: '5' }));
  assert.throws(() => checkParams('destination', { 'filter.type': 'urn:entity:destination', 'filter.release_year.min': '1957' }), /does not apply to destination/);
  assert.throws(() => checkParams('book', { 'filter.release_year.min': '1957' }), /does not apply to book/);
});
test('scripted capsule takes the closest result per domain, preferring one with artwork', async () => {
  const { scripted } = await import('../src/capsule');
  const c = (id: string, kind: 'film' | 'book', image?: string) => ({ id, title: id, year: 1965, kind, image, names: [], tags: [] });
  const ev = { anchors: [], unresolved: [], artists: [], culture: { scenes: [], influences: [], origins: [], fans: [] }, trace: [], cands: { film: [c('no-art', 'film'), c('has-art', 'film', 'u')], show: [], book: [c('b1', 'book')], place: [], meal: [] } };
  const out = scripted(ev as never);
  assert.deepEqual(out.pool.media.map(m => m.id), ['has-art', 'b1']);
  assert.equal(out.agent, 'scripted');
});
