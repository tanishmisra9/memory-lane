import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BlurFade } from '../components/BlurFade';
import { BookTimeline } from '../components/BookTimeline';
import { deleteSession, getSession } from '../lib/api';
import { ageSpan, apple, label, spotify } from '../lib/era';
import { ApiError, playable, type Item, type SessionView } from '../lib/types';
import { Gone } from './Gone';

const WORD: Record<string, string> = { smiled: 'Smiled', neutral: 'Okay', upset: 'Upset' };
const names = (items: { title: string; by?: string }[]) => items.map(i => (i.by ? `${i.title} by ${i.by}` : i.title));
const sentence = (list: string[]) => list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;

export function Book() {
  const { id = '' } = useParams(), navigate = useNavigate();
  const [s, setS] = useState<SessionView | null>(null), [gone, setGone] = useState(false), [error, setError] = useState(''), [copied, setCopied] = useState(false), [confirm, setConfirm] = useState(false);
  useEffect(() => { getSession(id).then(setS).catch(e => (e instanceof ApiError && e.status === 404 ? setGone(true) : setError(e.message))); }, [id]);
  if (gone) return <Gone />;
  if (error) return <main className="wrap" id="app-main" style={{ paddingTop: 48 }}><p className="error" role="alert">{error}</p></main>;
  if (!s) return <main className="wrap" id="app-main" style={{ paddingTop: 48 }}><p role="status">Opening the Memory Book…</p></main>;

  const plan = playable(s.plan), who = s.name || 'They', was = s.name ? 'was' : 'were', owner = s.name ? `${s.name}'s` : 'A';
  const by = (r: Item['reaction']) => plan.filter(i => i.reaction === r), tried = plan.filter(i => i.reaction);
  const smiled = by('smiled'), okay = by('neutral'), pending = plan.filter(i => !i.reaction);
  const ordered = [...plan].sort((a, b) => (ageSpan(a)[0] + ageSpan(a)[1]) - (ageSpan(b)[0] + ageSpan(b)[1]));
  const copy = async () => { try { await navigator.clipboard.writeText(location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); } };
  return (
    <main id="app-main" className="wrap" style={{ paddingTop: 16, paddingBottom: 96, maxWidth: 900 }}>
      <BlurFade>
        <h1 style={{ fontSize: 'clamp(44px, 9vw, 96px)', lineHeight: .92 }}>{owner} Memory Book</h1>
        <p style={{ marginTop: 12, fontSize: 20 }}>Born {s.born}. Music, films and shows from {s.born + 10} to {s.born + 30}, the years that matter most.</p>
      </BlurFade>
      <div className="noprint" style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn small" onClick={() => print()}>Print or save as PDF</button>
        <button className="btn quiet small" onClick={copy}>{copied ? 'Link copied' : 'Copy link'}</button>
        <Link className="btn quiet small" to={`/app/${s.id}`}>Back to the songs</Link>
      </div>

      <section aria-labelledby="staff" className="card" style={{ marginTop: 40, padding: 'clamp(20px, 4vw, 32px)' }}>
        <h2 id="staff" style={{ fontSize: 36 }}>For family and care staff</h2>
        <div style={{ marginTop: 12, display: 'grid', gap: 12, maxWidth: '62ch' }}>
          {tried.length === 0 && <p>No reactions were recorded yet. Play the songs and tap how each one lands to fill this in.</p>}
          {smiled.length > 0 && <p><strong>Worked:</strong> {who} smiled at {sentence(names(smiled))}.</p>}
          {okay.length > 0 && <p><strong>Neutral:</strong> {sentence(names(okay))}.</p>}
          {s.avoid.length > 0 && <p><strong>Avoid:</strong> {sentence(names(s.avoid))} upset {s.name || 'them'}. They were swapped out.</p>}
          {pending.length > 0 && tried.length > 0 && <p><strong>Not tried yet:</strong> {sentence(names(pending))}.</p>}
          <p className="hint">Chosen from {s.born + 10} to {s.born + 30}, when {who.toLowerCase() === 'they' ? 'they' : who} {was} 10 to 30. Every song passed a check for upsetting lyrical themes and familiarity. Not medical advice.</p>
        </div>
      </section>

      <h2 style={{ marginTop: 56, fontSize: 40 }}>Their years, from {s.born + 10} to {s.born + 30}</h2>
      <div className="card" style={{ marginTop: 16, padding: '24px 12px 12px' }}><BookTimeline born={s.born} items={ordered} /></div>
      <ol style={{ listStyle: 'none', margin: '24px 0 0', padding: 0, display: 'grid', gap: 16 }}>
        {ordered.map((item, i) => (
          <BlurFade as="li" key={item.id} delay={Math.min(i, 6) * 0.04}>
            <article className="card" style={{ padding: 'clamp(16px, 3vw, 24px)', display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span className={`code stock-${item.kind === 'song' ? 'red' : item.kind === 'film' ? 'cobalt' : 'green'}`} aria-hidden="true">{item.code}</span>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ font: '700 30px/1.05 var(--font-display)' }}>{item.title}</h3>
                  {item.by && <p style={{ fontWeight: 600 }}>{item.by}</p>}
                  <p className="hint">{label(item, s.name)}</p>
                </div>
                <p className="label" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>{item.reaction ? WORD[item.reaction] : ''}</p>
              </div>
              {item.note && <blockquote style={{ margin: 0, padding: '8px 14px', borderLeft: '1px solid var(--color-ink)', fontStyle: 'italic' }}>"{item.note}"</blockquote>}
              {item.kind === 'song' && <p className="hint noprint">Keep playing: <a href={spotify(item)} target="_blank" rel="noreferrer">Spotify</a> · <a href={apple(item)} target="_blank" rel="noreferrer">Apple Music</a></p>}
            </article>
          </BlurFade>
        ))}
      </ol>

      <div className="noprint" style={{ marginTop: 48, borderTop: '1px solid var(--color-line)', paddingTop: 20 }}>
        {!confirm ? <button className="textbtn" onClick={() => setConfirm(true)}>Delete this Memory Book</button> : (
          <div role="alertdialog" aria-label="Confirm delete" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <p>Delete it for good? The link stops working.</p>
            <button className="btn small" onClick={async () => { await deleteSession(s.id).catch(() => {}); navigate('/', { replace: true }); }}>Delete</button>
            <button className="btn quiet small" onClick={() => setConfirm(false)}>Keep it</button>
          </div>)}
      </div>
    </main>
  );
}
