// Qloo-grounded agent vs an LLM with no Qloo: how many of each plan's picks are real, in their years, and in their culture?
// The same Workers AI model writes both; only the evidence differs. Run: npx wrangler dev, then `BASE_URL=http://localhost:8787 node --import tsx scripts/baseline.mts`
// (needs Workers AI allowance and QLOO_API_KEY in .dev.vars). Prints aggregates only; Qloo's terms keep raw responses out of the repo.
import { readFileSync } from 'node:fs';
import { datedSongs, qlooGet, list, norm } from '../src/qloo';

const base = process.env.BASE_URL || 'http://localhost:8787';
const key = readFileSync('.dev.vars', 'utf8').match(/QLOO_API_KEY=(.+)/)![1].trim();
const personas = [
  { name: 'Greece 1947', born: 1947, anchors: ['Nana Mouskouri', 'Mikis Theodorakis'], culture: /greek|greece|laiko|entehno|rebetiko/i },
  { name: 'Mexico 1950', born: 1950, anchors: ['Vicente Fernández', 'José José'], culture: /mexic|ranchera|mariachi|norte|bolero|latin/i },
  { name: 'India 1948', born: 1948, anchors: ['Lata Mangeshkar', 'Kishore Kumar'], culture: /hindi|india|bollywood|ghazal|playback|hindustani/i },
  { name: 'US 1946', born: 1946, anchors: ['Frank Sinatra', 'Elvis Presley'], culture: /american|pop|rock|jazz|soul|country|swing/i },
];

// The LLM-only arm: the same model, told the same facts and asked the same thing, with no Qloo tools or evidence.
async function llmOnly(p: typeof personas[number]): Promise<{ songs: { artist: string; title: string }[]; films: string[] }> {
  const r = await fetch(`${base}/api/_baseline`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ born: p.born, anchors: p.anchors }) });
  if (!r.ok) throw new Error(`baseline endpoint ${r.status}`);
  return r.json() as Promise<{ songs: { artist: string; title: string }[]; films: string[] }>;
}
async function groundedArm(p: typeof personas[number]) {
  const r = await fetch(`${base}/api/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ born: p.born, anchors: p.anchors }) });
  const s = await r.json() as { plan: { kind: string; title: string; by?: string; year: number; culture?: { scene: string[]; origin?: string } }[]; agent?: string };
  return { songs: s.plan.filter(i => i.kind === 'song').map(i => ({ artist: i.by!, title: i.title, scene: i.culture?.scene ?? [], origin: i.culture?.origin })), films: s.plan.filter(i => i.kind === 'film').map(i => i.title), agent: s.agent };
}
// A named artist is real if Qloo finds an artist with that name; a song is dated if iTunes has it inside their years.
async function real(artist: string) { const res = list(await qlooGet('/search', { query: artist, take: '3', types: 'urn:entity:artist' }, key)); return res.some(e => norm(e.name ?? '') === norm(artist) || norm(e.name ?? '').includes(norm(artist))); }
async function inYears(artist: string, title: string, born: number) { const d = await datedSongs(artist, born + 10, born + 30); return d.some(x => norm(x.title).includes(norm(title)) || norm(title).includes(norm(x.title))); }

const rows: string[] = [];
for (const p of personas) {
  const [grounded, plain] = await Promise.all([groundedArm(p), llmOnly(p)]);
  for (const [arm, songs] of [['qloo-grounded agent', grounded.songs], ['llm only', plain.songs]] as const) {
    const exist = await Promise.all(songs.map(s => real(s.artist))), dated = await Promise.all(songs.map(s => inYears(s.artist, s.title, p.born)));
    const cultural = songs.filter(s => p.culture.test(`${(s as { scene?: string[] }).scene?.join(' ') ?? ''} ${(s as { origin?: string }).origin ?? ''} ${s.artist}`)).length;
    const beyond = songs.filter(x => !p.anchors.some(n => norm(n) === norm(x.artist))).length; rows.push(JSON.stringify({ persona: p.name, arm, songs: songs.length, beyondNamed: `${beyond}/${songs.length}`, artistExists: `${exist.filter(Boolean).length}/${songs.length}`, songDatedInTheirYears: `${dated.filter(Boolean).length}/${songs.length}`, culturalMarkers: arm === 'llm only' ? 'n/a' : `${cultural}/${songs.length}` }));
  }
}
console.log(rows.join('\n'));
