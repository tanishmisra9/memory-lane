import { generateText, stepCountIs, tool } from 'ai';
import { createWorkersAI } from 'workers-ai-provider';
import { z } from 'zod';
import { eraWindow, inWindow, safety, type Artist, type CulturalProfile, type Media, type Pool } from './engine';
import { explore, findTags, type Candidate } from './domains';
import { runAgent, type Cache, type Step } from './qloo';

export type CapsuleInput = { born: number; name?: string; anchors: string[]; city?: string; message?: string; banned?: string[]; loved?: string[]; avoid?: string[] };
export type CapsuleResult = { anchors: { id: string; name: string }[]; unresolved: string[]; pool: Pool; trace: Step[]; why?: string; agent: 'llm' | 'scripted' };
type Env = { AI?: Ai; QLOO_API_KEY: string };
type Slots = { film: Candidate[]; show: Candidate[]; book: Candidate[]; place: Candidate[]; meal: Candidate[] };
type Evidence = { anchors: { id: string; name: string }[]; unresolved: string[]; artists: Artist[]; culture: CulturalProfile; cands: Slots; trace: Step[] };

const MODEL = '@cf/openai/gpt-oss-120b';
// Qloo cuisine tags are keyed by a cuisine word, not a country name.
const DEMONYM: Record<string, string> = { Greece: 'Greek', Mexico: 'Mexican', India: 'Indian', Italy: 'Italian', France: 'French', Brazil: 'Brazilian', Jamaica: 'Jamaican', 'South Korea': 'Korean', Korea: 'Korean', Nigeria: 'Nigerian', Philippines: 'Filipino', 'United States': 'American', USA: 'American', 'United Kingdom': 'British', England: 'British', Spain: 'Spanish', Germany: 'German', Turkey: 'Turkish', Egypt: 'Egyptian', Pakistan: 'Indian' };

// ---- Step 1, always: the Qloo calls that gather evidence across domains. Code does this part so it is fast and cannot be skipped.
export async function gather(input: CapsuleInput, env: Env, cache: Cache | undefined, announce: (s: Step) => void): Promise<Evidence> {
  const trace: Step[] = [], say = (s: Step) => { trace.push(s); announce(s); }, key = env.QLOO_API_KEY;
  const base = await runAgent({ born: input.born, anchors: input.anchors }, key, cache, say);
  const [from, to] = eraWindow(input.born), names = new Map(base.pool.artists.map(a => [a.id, a.name]));
  const fitting = base.pool.artists.filter(a => (inWindow(a, input.born) || a.known) && safety(a).safe);
  const signals = [...base.anchors.map(a => a.id), ...fitting.filter(a => !base.anchors.some(x => x.id === a.id)).slice(0, 4).map(a => a.id)];
  const cuisineWord = base.pool.culture?.origins.map(o => DEMONYM[o]).find(Boolean);
  const [film, show, book, place, meal] = await Promise.all([
    explore('movie', { signals, names, from, to, take: 10 }, key, cache).catch(() => []),
    explore('tv_show', { signals, names, from, to, take: 10 }, key, cache).catch(() => []),
    explore('book', { signals, names, from, to, take: 10 }, key, cache).catch(() => []),
    explore('destination', { signals, names, take: 10 }, key, cache).catch(() => []),
    input.city && cuisineWord ? findTags(cuisineWord, key, cache).then(t => (t.find(x => x.id.includes('genre:place:restaurant:')) ?? t.find(x => x.id.includes(':cuisine:')))?.id).then(tag => tag ? explore('place', { signals, names, city: input.city, cuisine: tag, take: 8 }, key, cache) : []).catch(() => []) : Promise.resolve([] as Candidate[]),
  ]);
  say({ text: `Asked Qloo across film, TV, books, places${input.city ? ' and dining' : ''}, each ranked by closeness to what you named.`, kept: film.length + show.length + book.length + place.length + meal.length });
  return { anchors: base.anchors, unresolved: base.unresolved, artists: base.pool.artists, culture: base.pool.culture ?? { scenes: [], influences: [], origins: [], fans: [] }, cands: { film, show, book, place, meal }, trace };
}

const firstWithArt = (rows: Candidate[]) => rows.find(r => r.image) ?? rows[0];
const asPool = (ev: Evidence, songs: string[], pick: Media[]): Pool => {
  const chosen = songs.flatMap(id => ev.artists.filter(a => a.id === id)), rest = ev.artists.filter(a => !songs.includes(a.id));
  return { artists: [...chosen, ...rest], media: pick, culture: ev.culture };
};

// ---- The scripted planner: take the closest result in every domain. It is the fallback, and the baseline the agent has to beat.
export function scripted(ev: Evidence): CapsuleResult {
  const pick = [firstWithArt(ev.cands.film), firstWithArt(ev.cands.show), firstWithArt(ev.cands.book), firstWithArt(ev.cands.place), firstWithArt(ev.cands.meal)].filter((c): c is Candidate => !!c);
  return { anchors: ev.anchors, unresolved: ev.unresolved, pool: asPool(ev, [], pick), trace: ev.trace, agent: 'scripted' };
}

// ---- Step 2: the agent. An LLM reads the evidence and chooses, through a tool whose checks live in code. It cannot name anything Qloo did not return.
export async function agentPlan(input: CapsuleInput, ev: Evidence, env: Env & { AI: Ai }, announce: (s: Step) => void, timeoutMs = 50_000, cache?: Cache): Promise<CapsuleResult> {
  const [from, to] = eraWindow(input.born), artists = new Map(ev.artists.map(a => [a.id, a]));
  const banned = new Set(input.banned ?? []), allowed = (a: Artist) => (inWindow(a, input.born) || !!a.known) && safety(a).safe && !banned.has(a.id);
  const slot = (rows: Candidate[]) => rows.slice(0, 6).map(r => ({ id: r.id, title: r.title, year: r.timeless ? undefined : r.year, tags: r.tags.slice(0, 4), closest_to: r.closest?.map(c => `${c.name} ${c.pct}%`) }));
  const musicRows = ev.artists.filter(allowed).slice(0, 20).map(a => ({ id: a.id, name: a.name, named_by_caregiver: ev.anchors.some(x => x.id === a.id), scene: a.culture?.scene, origin: a.culture?.origin, influences: a.culture?.influences?.slice(0, 2), themes: a.themes.slice(0, 3), closest_to: a.culture?.closest?.map(c => `${c.name} ${c.pct}%`) }));
  let submitted: { songs: string[]; film?: string; show?: string; book?: string; destination?: string; dining?: string; why: string } | undefined;
  const ok = (rows: Candidate[], id?: string) => !id || rows.some(r => r.id === id);

  const evidence = JSON.stringify({ cultural_profile: ev.culture, artists: musicRows, films: slot(ev.cands.film), shows: slot(ev.cands.show), books: slot(ev.cands.book), destinations: slot(ev.cands.place), dining: slot(ev.cands.meal) });
  const system = `You curate a cultural time capsule for ONE person, for a family caregiver to use in a reminiscence activity (not therapy).
Born ${input.born}; formative years ${from} to ${to}. The caregiver named: ${input.anchors.join(', ')}.${input.city ? ` City: ${input.city}.` : ''}
${input.message ? `The caregiver says: "${input.message}". This is a hard instruction.` : ''}
${input.loved?.length ? `They already smiled at: ${input.loved.join('; ')}. Include more in that spirit.` : ''}${input.avoid?.length ? ` They were upset by: ${input.avoid.join('; ')}. Avoid anything like it.` : ''}
Qloo's taste graph returned the evidence below. Choose from it only. Never name anything that is not in the evidence.
How to choose: stay inside THEIR culture. The cultural_profile shows the scenes and origins Qloo read from the named artists. Prefer candidates whose scene, origin, tags or closest_to shares fit that profile, and reject ones that clearly belong to another culture even if they rank high. Pick six songs from at least four different artists, including the named ones. Pick at most one of each other kind, and skip a kind if nothing fits. For dining, choose a restaurant only if its tags show the person's home cuisine; otherwise skip dining. Explain your cultural reasoning in "why", using only facts in the evidence (scenes, origins, closest_to shares).
Call submit_plan exactly once. If it returns an error, fix exactly that and call it again.
EVIDENCE: ${evidence}`;

  const tools = {
    submit_plan: tool({
      description: 'Submit the final plan using ids from the evidence.',
      inputSchema: z.object({ songs: z.array(z.string()).min(4).max(6), film: z.string().optional(), show: z.string().optional(), book: z.string().optional(), destination: z.string().optional(), dining: z.string().optional(), why: z.string().max(700) }),
      execute: async plan => {
        const bad = plan.songs.filter(id => { const a = artists.get(id); return !a || !allowed(a); });
        if (bad.length) return { error: `Not allowed (unknown, outside their years, or not safe): ${bad.join(', ')}. Choose ids from "artists".` };
        if (new Set(plan.songs).size !== plan.songs.length) return { error: 'Song ids must be distinct.' };
        for (const [k, rows, id] of [['film', ev.cands.film, plan.film], ['show', ev.cands.show, plan.show], ['book', ev.cands.book, plan.book], ['destination', ev.cands.place, plan.destination], ['dining', ev.cands.meal, plan.dining]] as const) if (!ok(rows, id)) return { error: `${k} id ${id} is not in the evidence.` };
        submitted = plan; return { ok: true };
      },
    }),
  };
  // The same question gets the same answer: reuse a stored decision instead of spending model time and the free daily allowance again.
  const memoKey = `agentplan2:${JSON.stringify([input.born, [...input.anchors].map(a => a.toLowerCase()).sort(), input.city?.toLowerCase(), input.message, input.banned, input.loved, input.avoid])}`;
  const memo = await cache?.get(memoKey) as typeof submitted | null | undefined;
  if (memo && memo.songs.every(id => artists.has(id))) { submitted = memo; announce({ text: 'The agent had already answered this exact question; reusing it.' }); }
  else announce({ text: 'The agent is reading what Qloo returned and choosing.' });
  const model = createWorkersAI({ binding: env.AI })(MODEL);
  for (let attempt = 0; attempt < 2 && !submitted; attempt++) {
    const t0 = Date.now(); const r = await generateText({ model, system, prompt: attempt ? 'You have not submitted yet. Call submit_plan now.' : 'Choose and call submit_plan.', tools, stopWhen: stepCountIs(4), maxRetries: 0, maxOutputTokens: 4000, providerOptions: { 'workers-ai': { reasoning_effort: 'medium' } }, abortSignal: AbortSignal.timeout(timeoutMs) });
    console.log('agent attempt', attempt, `${Date.now() - t0}ms`, 'steps', r.steps.length, 'finish', r.finishReason, 'tools', r.steps.flatMap(st => st.toolResults.map(x => JSON.stringify(x.output).slice(0, 120))).join(' | '));
  }
  if (!submitted) throw new Error('The agent did not submit a plan.');
  if (!memo) await cache?.set(memoKey, submitted, 7 * 24 * 3600_000);
  const pick = [submitted.film && ev.cands.film.find(r => r.id === submitted!.film), submitted.show && ev.cands.show.find(r => r.id === submitted!.show), submitted.book && ev.cands.book.find(r => r.id === submitted!.book), submitted.destination && ev.cands.place.find(r => r.id === submitted!.destination), submitted.dining && ev.cands.meal.find(r => r.id === submitted!.dining)].filter((c): c is Candidate => !!c);
  announce({ text: 'The agent made its choices. Every one is checked against the rules in code.' });
  return { anchors: ev.anchors, unresolved: ev.unresolved, pool: asPool(ev, submitted.songs, pick), trace: ev.trace, why: submitted.why, agent: 'llm' };
}

// With `requireAgent` (used when the caregiver gave an instruction) a failure is reported instead of quietly ignoring what they said.
export async function buildCapsule(input: CapsuleInput, env: Env, cache: Cache | undefined, onStep: (s: Step) => void, o: { requireAgent?: boolean; timeoutMs?: number } = {}): Promise<CapsuleResult> {
  const ev = await gather(input, env, cache, onStep);
  if (env.AI && ev.artists.some(a => (inWindow(a, input.born) || a.known) && safety(a).safe)) {
    try { return await agentPlan(input, ev, env as Env & { AI: Ai }, onStep, o.timeoutMs, cache); }
    catch (error) { console.error('agent failed', error); if (o.requireAgent) throw new Error(/4006|neurons/.test(String(error)) ? 'The agent has used its free daily allowance on Cloudflare. Try again tomorrow.' : 'The agent took too long to re-plan. Try a shorter instruction.'); onStep({ text: 'The agent could not finish, so the closest Qloo result in every domain was used.' }); }
  }
  return scripted(ev);
}
