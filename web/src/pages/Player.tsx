import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { AlbumCard } from '../components/AlbumCard';
import { EraTimeline } from '../components/EraTimeline';
import { Queue } from '../components/Queue';
import { ReactionBar } from '../components/ReactionBar';
import { Transport } from '../components/Transport';
import { WhyDrawer } from '../components/WhyDrawer';
import { getSession, react as reactApi, saveNote } from '../lib/api';
import { useAudio } from '../lib/audio';
import { ageSpan, label } from '../lib/era';
import { spring } from '../lib/motion';
import { ApiError, playable, type Reaction, type SessionView } from '../lib/types';
import { Gone } from './Gone';

export function Player() {
  const { id = '' } = useParams(), navigate = useNavigate(), location = useLocation(), reduce = useReducedMotion();
  const seeded = (location.state as { session?: SessionView } | null)?.session;
  const [session, setSession] = useState<SessionView | null>(seeded?.id === id ? seeded : null);
  const [gone, setGone] = useState(false), [loadError, setLoadError] = useState('');
  const [index, setIndex] = useState(0), [busy, setBusy] = useState(false), [why, setWhy] = useState(false), [finished, setFinished] = useState(false), [notice, setNotice] = useState('');
  const dir = useRef(1), chain = useRef<Promise<unknown>>(Promise.resolve());
  // Every change to the session is sent one after another, so two quick taps can never collide on the server.
  const serial = useCallback(<T,>(task: () => Promise<T>): Promise<T> => { const run = chain.current.then(task, task); chain.current = run.catch(() => {}); return run; }, []);

  useEffect(() => { // A reload or a shared link has no session in memory; fetch it.
    if (session) return;
    getSession(id).then(setSession).catch(e => (e instanceof ApiError && e.status === 404 ? setGone(true) : setLoadError(e.message)));
  }, [id, session]);

  const plan = useMemo(() => (session ? playable(session.plan) : []), [session]);
  const item = plan[Math.min(index, plan.length - 1)];
  const next = plan[index + 1];
  const audio = useAudio(item?.previewUrl, next?.previewUrl);
  const last = index >= plan.length - 1;

  const go = useCallback((to: number) => { dir.current = to >= index ? 1 : -1; setIndex(Math.max(0, Math.min(to, plan.length - 1))); setFinished(false); setNotice(''); }, [index, plan.length]);
  const advance = useCallback(() => { if (last) { audio.stop(); setFinished(true); } else go(index + 1); }, [last, go, index, audio]);

  const doReact = useCallback(async (reaction: Reaction) => {
    if (!session || !item || busy) return;
    setBusy(true); setNotice('');
    try {
      const updated = await serial(() => reactApi(session.id, item.id, reaction));
      setSession(updated);
      if (reaction === 'upset') setNotice('Swapped for a different song.');
    } catch (e) { setNotice(e instanceof Error ? e.message : 'That did not save. Try again.'); }
    finally { setBusy(false); }
  }, [session, item, busy, serial]);

  const doNote = useCallback(async (text: string) => {
    if (!session || !item) return;
    try { setSession(await serial(() => saveNote(session.id, item.id, text))); } catch (e) { setNotice(e instanceof Error ? e.message : 'The note did not save.'); }
  }, [session, item, serial]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (why || e.metaKey || e.ctrlKey || e.altKey || t?.closest('input, textarea, select, [contenteditable], [role="slider"]')) return;
      if (e.key === ' ' && t?.closest('button, a')) return;
      if (e.key === ' ') { e.preventDefault(); audio.toggle(); }
      else if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
      else if (e.key === '1') void doReact('smiled');
      else if (e.key === '2') void doReact('neutral');
      else if (e.key === '3') void doReact('upset');
      else if (e.key.toLowerCase() === 'w') setWhy(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [why, audio, go, index, doReact]);

  if (gone) return <Gone />;
  if (loadError) return <main className="wrap" id="app-main" style={{ paddingTop: 64 }}><p className="error" role="alert">{loadError}</p><p style={{ marginTop: 16 }}><button className="btn" onClick={() => location.state ? navigate(0) : window.location.reload()}>Try again</button></p></main>;
  if (!session || !item) return <main className="wrap" id="app-main" style={{ paddingTop: 64 }}><p role="status">Loading the session…</p></main>;

  const span = item.kind === 'song' || item.kind === 'film' || item.kind === 'show' ? ageSpan(item) : null;
  const name = session.name;
  return (
    <main id="app-main" className="wrap" style={{ paddingTop: 8, paddingBottom: 56 }}>
      <p className="sr-only" aria-live="polite">{`Song ${index + 1} of ${plan.length}: ${item.title}${item.by ? ` by ${item.by}` : ''}`}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <p className="label">{name ? `${name}, born ${session.born}` : `Born ${session.born}`}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn quiet small" onClick={() => setWhy(true)}>Why this</button>
          <Link className="btn quiet small" to={`/book/${session.id}`}>Memory Book</Link>
        </div>
      </div>
      <div style={{ marginTop: 12 }}><Queue plan={plan} index={index} onJump={go} /></div>

      <AnimatePresence mode="wait" custom={dir.current} initial={false}>
        {finished ? (
          <m.section key="done" className="card" initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring} style={{ marginTop: 32, padding: 'clamp(24px, 6vw, 56px)' }}>
            <h1 style={{ fontSize: 'clamp(40px, 8vw, 72px)', lineHeight: .95 }}>Your Memory Book is ready</h1>
            <p style={{ marginTop: 16, maxWidth: '44ch' }}>{plan.filter(i => i.reaction === 'smiled').length} songs and shows made them smile. It lists what worked, what to avoid, and the words you wrote, ready to print or share.</p>
            <div style={{ marginTop: 24, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link className="btn" to={`/book/${session.id}`}>Open the Memory Book</Link>
              <button className="textbtn" onClick={() => { setFinished(false); go(0); }}>Go back through the songs</button>
            </div>
          </m.section>
        ) : (
          <m.section key={item.id} aria-label={item.title} custom={dir.current}
            initial={reduce ? false : { opacity: 0, x: dir.current * 48 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: -dir.current * 48 }} transition={spring}
            className="stage" style={{ marginTop: 24 }}>
            <div className="stage-art"><AlbumCard item={item} playing={audio.playing} /></div>
            <div className="stage-info">
              <div>
                <h1 style={{ fontSize: 'clamp(40px, 8vw, 72px)', lineHeight: .95 }}>{item.title}</h1>
                {item.by && <p style={{ marginTop: 8, font: '600 24px var(--font-body)' }}>{item.by}</p>}
                <p className="hint" style={{ marginTop: 4 }}>{label(item, name)}</p>
                {item.culture?.scene.length ? <p style={{ marginTop: 6, fontWeight: 600 }}>{item.culture.scene.join(' · ')}</p> : null}
              </div>
              <div className="p-timeline"><EraTimeline born={session.born} span={span} /></div>
              <Transport audio={audio} canPlay={!!item.previewUrl} onToggle={audio.toggle} onSeek={audio.seek} onPrev={() => go(index - 1)} onNext={() => go(index + 1)} hasPrev={index > 0} hasNext={!last} />
              <ReactionBar item={item} busy={busy} attention={audio.ended} onReact={doReact} onNote={doNote} onNext={advance} isLast={last} />
              {notice && <p className="hint" role="status">{notice}</p>}
              <p className="hint noprint kbdhint" aria-hidden="true"><span className="kbd">Space</span> play <span className="kbd">←</span> <span className="kbd">→</span> songs <span className="kbd">1</span> <span className="kbd">2</span> <span className="kbd">3</span> react <span className="kbd">W</span> why</p>
            </div>
          </m.section>
        )}
      </AnimatePresence>
      {why && <WhyDrawer item={item} born={session.born} onClose={() => setWhy(false)} />}
    </main>
  );
}
