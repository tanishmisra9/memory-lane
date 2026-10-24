import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BlurFade } from '../components/BlurFade';
import { BookTimeline } from '../components/BookTimeline';
import { Cover } from '../components/AlbumCard';
import { deleteSession, getSession } from '../lib/api';
import { ageSpan, apple, label, spotify, stockOf } from '../lib/era';
import { ApiError, playable, type Item, type SessionView } from '../lib/types';
import { Gone } from './Gone';

const WORD: Record<string, string> = { smiled: 'Smiled', neutral: 'Okay', upset: 'Upset' };
const names = (items: { title: string; by?: string }[]) => items.map(i => (i.by ? `${i.title} (${i.by})` : i.title));
const sentence = (list: string[]) => list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;

export function Book() {
  const { id = '' } = useParams(), navigate = useNavigate();
  const [s, setS] = useState<SessionView | null>(null), [gone, setGone] = useState(false), [error, setError] = useState(''), [copied, setCopied] = useState(false), [confirm, setConfirm] = useState(false);
  useEffect(() => { getSession(id).then(setS).catch(e => (e instanceof ApiError && e.status === 404 ? setGone(true) : setError(e.message))); }, [id]);
  if (gone) return <Gone />;
  if (error) return <main className="wrap" id="app-main" style={{ paddingTop: 48 }}><p className="error" role="alert">{error}</p></main>;
  if (!s) return <main className="wrap" id="app-main" style={{ paddingTop: 48 }}><p role="status">Opening the Memory Book…</p></main>;

  const plan = playable(s.plan), who = s.name || 'They', owner = s.name ? `${s.name}'s` : 'A';
  const by = (r: Item['reaction']) => plan.filter(i => i.reaction === r);
  const smiled = by('smiled'), okay = by('neutral'), pending = plan.filter(i => !i.reaction), tried = plan.length - pending.length;
  const ordered = [...plan].sort((a, b) => (a.timeless ? 1e3 : ageSpan(a)[0] + ageSpan(a)[1]) - (b.timeless ? 1e3 : ageSpan(b)[0] + ageSpan(b)[1]));
  const songs = ordered.filter(i => i.kind === 'song');
  const rows: [string, string][] = [];
  if (smiled.length) rows.push(['Worked', `${who} smiled at ${sentence(names(smiled))}.`]);
  if (okay.length) rows.push(['Neutral', `${sentence(names(okay))}.`]);
  if (s.avoid.length) rows.push(['Avoid', `${sentence(names(s.avoid))} upset ${s.name || 'them'}. They were swapped out.`]);
  if (pending.length && tried) rows.push(['Not tried', `${pending.length} more, listed below.`]);
  const copy = async () => { try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); } };
  const hero = ordered.find(i => i.reaction === 'smiled') ?? ordered[0];
  return (
    <main id="app-main" className="wrap" style={{ paddingTop: 16, paddingBottom: 96 }}>
      <div>
        <BlurFade>
          <div style={{ display: 'flex', gap: 'clamp(16px, 4vw, 32px)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {hero && <Cover item={hero} size={168} />}
            <div style={{ minWidth: 0, flex: '1 1 320px' }}>
              <h1 style={{ fontSize: 'clamp(40px, 8vw, 72px)', lineHeight: .95 }}>{owner} Memory Book</h1>
              <p style={{ marginTop: 10, fontSize: 20 }}>Born {s.born}. Music, films and shows from {s.born + 10} to {s.born + 30}, in the order of their years. Dashed cards have not been tried yet.</p>
            </div>
          </div>
        </BlurFade>
        <div className="noprint" style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn small" onClick={() => print()}>Print or save as PDF</button>
          <button className="btn quiet small" onClick={copy}>{copied ? 'Link copied' : 'Copy link'}</button>
          <Link className="btn quiet small" to={`/app/${s.id}`}>Back to the songs</Link>
        </div>

        <section aria-labelledby="staff" className="card" style={{ marginTop: 40, padding: 'clamp(20px, 4vw, 32px)' }}>
          <h2 id="staff" style={{ fontSize: 36 }}>For family and care staff</h2>
          {rows.length === 0 ? <p style={{ marginTop: 12 }}>No reactions yet. Play the songs and tap how each one lands to fill this in.</p> : (
            <dl style={{ margin: '16px 0 0', display: 'grid', gap: 10, gridTemplateColumns: 'max-content 1fr', columnGap: 20 }}>
              {rows.map(([k, v]) => <div key={k} style={{ display: 'contents' }}><dt className="label">{k}</dt><dd style={{ margin: 0 }}>{v}</dd></div>)}
            </dl>)}
          <p className="hint" style={{ marginTop: 16 }}>Every song passed a check for upsetting lyrical themes and familiarity. This is an activity record, not medical advice.</p>
        </section>

        {s.culture && (s.culture.scenes.length > 0 || s.culture.influences.length > 0) && (
          <section aria-labelledby="culture" className="card" style={{ marginTop: 24, padding: 'clamp(20px, 4vw, 32px)' }}>
            <h2 id="culture" style={{ fontSize: 36 }}>Their cultural profile</h2>
            <dl style={{ margin: '16px 0 0', display: 'grid', gap: 10, gridTemplateColumns: 'max-content 1fr', columnGap: 20 }}>
              {s.culture.scenes.length > 0 && <div style={{ display: 'contents' }}><dt className="label">Music</dt><dd style={{ margin: 0 }}>{s.culture.scenes.join(', ')}</dd></div>}
              {s.culture.influences.length > 0 && <div style={{ display: 'contents' }}><dt className="label">Shaped by</dt><dd style={{ margin: 0 }}>{s.culture.influences.join(', ')}</dd></div>}
              {s.culture.origins.length > 0 && <div style={{ display: 'contents' }}><dt className="label">From</dt><dd style={{ margin: 0 }}>{s.culture.origins.join(', ')}</dd></div>}
              {s.culture.fans.length > 0 && <div style={{ display: 'contents' }}><dt className="label">Listeners</dt><dd style={{ margin: 0 }}>{s.culture.fans.join(', ').toLowerCase()}</dd></div>}
            </dl>
            <p className="hint" style={{ marginTop: 16 }}>Read by Qloo's taste graph from the artists you named. Nothing about heritage was asked.</p>
          </section>)}

        <section aria-labelledby="how" className="card" style={{ marginTop: 24, padding: 'clamp(20px, 4vw, 32px)' }}>
          <h2 id="how" style={{ fontSize: 36 }}>How it was chosen</h2>
          <p style={{ marginTop: 12, maxWidth: '70ch' }}>{s.agent === 'llm' && s.why ? s.why : 'The closest result from Qloo in every domain, ranked by cultural closeness to the artists you named.'}</p>
          <p className="hint" style={{ marginTop: 12 }}>{s.agent === 'llm' ? 'An AI agent chose from what Qloo returned, using only that evidence. Every song was then checked in code for their years, familiarity and gentle themes.' : 'The agent was not used for this one; the ranking above was.'}</p>
        </section>

        <h2 style={{ marginTop: 56, fontSize: 36 }}>Their years, {s.born + 10} to {s.born + 30}</h2>
        <div className="card" style={{ marginTop: 16, padding: '24px 12px 12px' }}><BookTimeline born={s.born} items={ordered} /></div>

        <ol style={{ listStyle: 'none', margin: '24px 0 0', padding: 0, display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))' }}>
          {ordered.map((item, i) => (
            <BlurFade as="li" key={item.id} delay={Math.min(i, 6) * 0.04}>
              <article className="card" style={{ padding: 'clamp(12px, 3vw, 20px)', display: 'flex', gap: 'clamp(12px, 3vw, 20px)', alignItems: 'flex-start', height: '100%', borderStyle: item.reaction ? 'solid' : 'dashed' }}>
                <Cover item={item} size={96} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <h3 style={{ font: '700 28px/1.05 var(--font-display)' }}>{item.title}</h3>
                    {item.reaction && <p className="label" style={{ whiteSpace: 'nowrap' }}>{WORD[item.reaction]}</p>}
                  </div>
                  {item.by && <p style={{ fontWeight: 600 }}>{item.by}</p>}
                  <p className="hint" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><span className={`code stock-${stockOf(item.kind)}`} style={{ minWidth: 30, height: 24, fontSize: 15 }}>{item.code}</span>{label(item, s.name)}</p>
                  {item.note && <blockquote style={{ margin: '10px 0 0', padding: '4px 14px', borderLeft: '1px solid var(--color-ink)', fontStyle: 'italic' }}>"{item.note}"</blockquote>}
                </div>
              </article>
            </BlurFade>
          ))}
        </ol>

        <section className="noprint" aria-labelledby="keep" style={{ marginTop: 48 }}>
          <h2 id="keep" style={{ fontSize: 36 }}>Keep playing</h2>
          <p className="hint" style={{ marginTop: 4 }}>Previews are 30 seconds. These open the full songs.</p>
          <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))' }}>
            {songs.map(item => <li key={item.id} style={{ padding: '6px 0', display: 'grid', gap: 2 }}><span><span style={{ fontWeight: 600 }}>{item.title}</span> <span className="hint">{item.by}</span></span><span style={{ display: 'flex', gap: 16 }}><a href={spotify(item)} target="_blank" rel="noreferrer" style={{ minHeight: 28 }}>Spotify</a><a href={apple(item)} target="_blank" rel="noreferrer" style={{ minHeight: 28 }}>Apple Music</a></span></li>)}
          </ul>
        </section>

        <div className="noprint" style={{ marginTop: 48, borderTop: '1px solid var(--color-line)', paddingTop: 20 }}>
          {!confirm ? <button className="textbtn" onClick={() => setConfirm(true)}>Delete this Memory Book</button> : (
            <div role="alertdialog" aria-label="Confirm delete" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <p>Delete it for good? The link stops working.</p>
              <button className="btn small" onClick={async () => { await deleteSession(s.id).catch(() => {}); navigate('/', { replace: true }); }}>Delete</button>
              <button className="btn quiet small" onClick={() => setConfirm(false)}>Keep it</button>
            </div>)}
        </div>
      </div>
    </main>
  );
}
