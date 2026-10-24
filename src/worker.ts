import { alternates, applyReaction, buildPlan, prompts, refill, validate, validateNote, type Item, type Pool, type Profile, type Reaction } from './engine';
import { previewFor, searchArtists, type Cache, type Step } from './qloo';
import { buildCapsule } from './capsule';
import { SHELVES } from './shelves';

type Env = { DB: D1Database; ASSETS: Fetcher; AI?: Ai; QLOO_API_KEY?: string };
type Avoid = { title: string; by?: string };
type Session = { id: string; version: number; why?: string; agent?: 'llm' | 'scripted'; city?: string; profile: Profile; pool: Pool; plan: Item[]; trace: Step[]; unresolved: string[]; createdAt: number; avoid?: Avoid[] };
const DAY = 24 * 3600_000, KEEP = 30 * DAY;
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
const bad = (message: string, status = 400) => json({ error: message }, status);
const REACTIONS = ['smiled', 'neutral', 'upset'];

const dbCache = (db: D1Database): Cache => ({
  async get(key) { const row = await db.prepare('SELECT body FROM qloo_cache WHERE key = ? AND expires_at > ?').bind(key, Date.now()).first<{ body: string }>(); return row ? JSON.parse(row.body) : null; },
  async set(key, value, ttl) { await db.prepare('INSERT OR REPLACE INTO qloo_cache (key, body, expires_at) VALUES (?,?,?)').bind(key, JSON.stringify(value), Date.now() + ttl).run(); },
});
const view = (s: Session) => ({ id: s.id, version: s.version, name: s.profile.name, born: s.profile.born, plan: s.plan, prompts: prompts(s.plan, s.profile), trace: s.trace, unresolved: s.unresolved, avoid: s.avoid ?? [], culture: s.pool.culture, why: s.why, agent: s.agent, city: s.city });

async function read(db: D1Database, id: string): Promise<Session | null> {
  const row = await db.prepare('SELECT body FROM sessions WHERE id = ? AND expires_at > ?').bind(id, Date.now()).first<{ body: string }>();
  return row ? JSON.parse(row.body) : null;
}
// Qloo's notable_songs can name an album or a track iTunes lacks, so try the artist's other songs until one has audio.
async function withPreviews(plan: Item[], pool: Pool, cache: Cache): Promise<Item[]> {
  return Promise.all(plan.map(async item => {
    if (item.kind !== 'song' || !item.by || item.previewUrl !== undefined) return item;
    for (const title of [item.title, ...alternates(pool, item)]) {
      const found = await previewFor(title, item.by, cache);
      if (found) return { ...item, title, id: `${item.artistId}:${title}`, previewUrl: found.url, art: found.art };
    }
    return { ...item, previewUrl: null };
  }));
}

// A song nobody can press play on defeats the point, so an artist with no audio is swapped for the next eligible one (up to three rounds).
async function playable(plan: Item[], pool: Pool, profile: Profile, cache: Cache): Promise<{ plan: Item[]; profile: Profile }> {
  let current = await withPreviews(plan, pool, cache);
  for (let round = 0; round < 3; round++) {
    const dead = current.filter(i => i.kind === 'song' && i.previewUrl === null && i.artistId);
    if (!dead.length) break;
    profile = { ...profile, banned: [...profile.banned, ...dead.map(i => i.artistId!)] };
    current = await withPreviews(refill(current.map(i => dead.includes(i) ? { ...i, reaction: 'upset' as const } : i), pool, profile), pool, cache);
  }
  return { plan: current, profile };
}

type Built = { session: Session } | { error: string; status: number };
async function build(raw: unknown, env: Env, onStep?: (step: Step) => void): Promise<Built> {
  if (!env.QLOO_API_KEY) return { error: 'Qloo is not configured.', status: 503 };
  let input; try { input = validate(raw); } catch (error) { return { error: error instanceof Error ? error.message : 'Invalid request.', status: 400 }; }
  const cache = dbCache(env.DB);
  let result; try { result = await buildCapsule(input, { AI: env.AI, QLOO_API_KEY: env.QLOO_API_KEY }, cache, onStep ?? (() => {})); } catch (error) { return { error: error instanceof Error ? error.message : 'Qloo failed.', status: 502 }; }
  const profile: Profile = { born: input.born, name: input.name, anchors: result.anchors, weights: {}, banned: [] };
  const { plan, profile: finalProfile } = await playable(buildPlan(result.pool, profile), result.pool, profile, cache);
  if (!plan.some(item => item.kind === 'song')) return { error: 'Qloo found no gentle, familiar songs from those years. Try different artists.', status: 422 };
  const session: Session = { id: crypto.randomUUID(), version: 0, why: result.why, agent: result.agent, city: input.city, profile: finalProfile, pool: result.pool, plan, trace: result.trace, unresolved: result.unresolved, createdAt: Date.now() };
  await env.DB.prepare('INSERT INTO sessions (id, version, body, expires_at) VALUES (?,?,?,?)').bind(session.id, 0, JSON.stringify(session), Date.now() + KEEP).run();
  return { session };
}

// With Accept: application/x-ndjson the build streams its real trace as it runs, then the session (or an error) as the last line.
async function create(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const raw = await request.json().catch(() => null);
  if (!(request.headers.get('Accept') || '').includes('application/x-ndjson')) {
    const built = await build(raw, env);
    return 'error' in built ? bad(built.error, built.status) : json(view(built.session), 201);
  }
  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter(), encoder = new TextEncoder();
  const send = (line: object) => writer.write(encoder.encode(JSON.stringify(line) + '\n')).catch(() => {});
  ctx.waitUntil((async () => {
    try {
      const built = await build(raw, env, step => { void send({ type: 'step', ...step }); });
      await send('error' in built ? { type: 'error', message: built.error, status: built.status } : { type: 'done', session: view(built.session) });
    } catch (error) {
      console.error(error);
      await send({ type: 'error', message: 'Something went wrong. Please try again.', status: 503 });
    } finally { await writer.close().catch(() => {}); }
  })());
  return new Response(readable, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } });
}

// The caregiver talks to the agent: it re-plans from the same Qloo evidence, told what the person loved, what upset them, and what was just said.
async function chat(request: Request, env: Env, ctx: ExecutionContext, id: string): Promise<Response> {
  const session = await read(env.DB, id); if (!session) return bad('This session expired or was deleted.', 404);
  const body = await request.json().catch(() => ({})) as { message?: unknown };
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 280) : '';
  if (!message) return bad('Tell the agent something, in a sentence.');
  if (!env.AI || !env.QLOO_API_KEY) return bad('The agent is not available right now.', 503);
  const { readable, writable } = new TransformStream<Uint8Array>(), writer = writable.getWriter(), encoder = new TextEncoder();
  const send = (line: object) => writer.write(encoder.encode(JSON.stringify(line) + '\n')).catch(() => {});
  ctx.waitUntil((async () => {
    try {
      const cache = dbCache(env.DB), names = (i: Item) => (i.by ? `${i.title} (${i.by})` : i.title);
      const result = await buildCapsule({ born: session.profile.born, name: session.profile.name, anchors: session.profile.anchors.map(a => a.name), city: session.city, message,
        banned: session.profile.banned, loved: session.plan.filter(i => i.reaction === 'smiled').map(names), avoid: (session.avoid ?? []).map(a => (a.by ? `${a.title} (${a.by})` : a.title)) },
        { AI: env.AI, QLOO_API_KEY: env.QLOO_API_KEY! }, cache, step => { void send({ type: 'step', ...step }); }, { requireAgent: true, timeoutMs: 80_000 });
      const profile: Profile = { ...session.profile, anchors: result.anchors.length ? result.anchors : session.profile.anchors };
      const planned = await playable(buildPlan(result.pool, profile), result.pool, profile, cache);
      const next: Session = { ...session, profile: planned.profile, pool: result.pool, plan: planned.plan, why: result.why ?? session.why, agent: result.agent, version: session.version + 1 };
      const saved = await env.DB.prepare('UPDATE sessions SET version = ?, body = ? WHERE id = ? AND version = ?').bind(next.version, JSON.stringify(next), id, session.version).run();
      await send(saved.meta.changes === 1 ? { type: 'done', session: view(next) } : { type: 'error', message: 'The session changed. Try again.', status: 409 });
    } catch (error) { console.error(error); await send({ type: 'error', message: error instanceof Error ? error.message : 'The agent could not finish.', status: 502 }); }
    finally { await writer.close().catch(() => {}); }
  })());
  return new Response(readable, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store' } });
}

async function note(request: Request, env: Env, id: string): Promise<Response> {
  const session = await read(env.DB, id); if (!session) return bad('This session expired or was deleted.', 404);
  const body = await request.json().catch(() => ({})) as { itemId?: unknown; note?: unknown };
  const item = session.plan.find(i => i.id === body.itemId);
  if (!item) return bad('Unknown item.');
  let text; try { text = validateNote(body.note); } catch (error) { return bad(error instanceof Error ? error.message : 'Invalid note.'); }
  const next: Session = { ...session, plan: session.plan.map(i => i.id === item.id ? { ...i, note: text || undefined } : i), version: session.version + 1 };
  const saved = await env.DB.prepare('UPDATE sessions SET version = ?, body = ? WHERE id = ? AND version = ?').bind(next.version, JSON.stringify(next), id, session.version).run();
  return saved.meta.changes === 1 ? json(view(next)) : bad('The session changed. Try again.', 409);
}

async function react(request: Request, env: Env, id: string): Promise<Response> {
  const session = await read(env.DB, id); if (!session) return bad('This session expired or was deleted.', 404);
  const body = await request.json().catch(() => ({})) as { itemId?: unknown; reaction?: unknown };
  const item = session.plan.find(i => i.id === body.itemId);
  if (!item || typeof body.reaction !== 'string' || !REACTIONS.includes(body.reaction)) return bad('Unknown item or reaction.');
  const reaction = body.reaction as Reaction, cache = dbCache(env.DB);
  const profile = applyReaction(session.profile, item, reaction);
  const marked = session.plan.map(i => i.id === item.id ? { ...i, reaction } : i);
  const { plan, profile: nextProfile } = await playable(refill(marked, session.pool, profile), session.pool, profile, cache);
  // Songs marked Upset are replaced in the plan, so remember them for the care-staff page.
  const avoid = reaction === 'upset' && !(session.avoid ?? []).some(a => a.title === item.title && a.by === item.by) ? [...(session.avoid ?? []), { title: item.title, by: item.by }] : session.avoid;
  const next: Session = { ...session, profile: nextProfile, plan, avoid, version: session.version + 1 };
  const saved = await env.DB.prepare('UPDATE sessions SET version = ?, body = ? WHERE id = ? AND version = ?').bind(next.version, JSON.stringify(next), id, session.version).run();
  return saved.meta.changes === 1 ? json(view(next)) : bad('The session changed. Try again.', 409);
}

async function handleApi(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url), path = url.pathname;
  if (path === '/api/artists' && request.method === 'GET') {
    const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
    if (q.length < 2 || !env.QLOO_API_KEY) return json([]);
    return json(await searchArtists(q, env.QLOO_API_KEY, dbCache(env.DB)));
  }
  // Evaluation only: the same model with no Qloo, so scripts/baseline.mts can measure what Qloo adds. Local runs only.
  if (path === '/api/_baseline' && request.method === 'POST' && ['localhost', '127.0.0.1'].includes(url.hostname) && env.AI) {
    const { generateText } = await import('ai'); const { createWorkersAI } = await import('workers-ai-provider');
    const input = validate(await request.json());
    const { text } = await generateText({ model: createWorkersAI({ binding: env.AI })('@cf/openai/gpt-oss-120b'), maxOutputTokens: 3000, providerOptions: { 'workers-ai': { reasoning_effort: 'medium' } },
      system: 'You plan a reminiscence session for a person with dementia. Reply with JSON only: {"songs":[{"artist":"","title":""}],"films":[""]} with six songs and two films from the years the person was 10 to 30, in their own culture.',
      prompt: `Born ${input.born}. They loved: ${input.anchors.join(', ')}.` });
    const match = text.match(/\{[\s\S]*\}/); return json(match ? JSON.parse(match[0]) : { songs: [], films: [] });
  }
  if (path === '/api/shelf' && request.method === 'GET') return json(SHELVES);
  if (path === '/api/sessions' && request.method === 'POST') return create(request, env, ctx);
  const match = path.match(/^\/api\/sessions\/([a-f0-9-]{36})(?:\/(react|note|chat))?$/);
  if (match) {
    const [, id, action] = match;
    if (action === 'react' && request.method === 'POST') return react(request, env, id);
    if (action === 'note' && request.method === 'POST') return note(request, env, id);
    if (action === 'chat' && request.method === 'POST') return chat(request, env, ctx, id);
    if (!action && request.method === 'GET') { const s = await read(env.DB, id); return s ? json(view(s)) : bad('This session expired or was deleted.', 404); }
    if (!action && request.method === 'DELETE') { await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run(); return json({ deleted: true }); }
  }
  return bad('Not found', 404);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      if (new URL(request.url).pathname.startsWith('/api/')) return await handleApi(request, env, ctx);
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return bad('Something went wrong. Please try again.', 503);
    }
  },
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    const now = Date.now();
    await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now), env.DB.prepare('DELETE FROM qloo_cache WHERE expires_at <= ?').bind(now)]);
  },
} satisfies ExportedHandler<Env>;
