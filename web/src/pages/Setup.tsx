import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { buildSession, getShelf, searchArtists } from '../lib/api';
import { PRESETS } from '../lib/presets';
import { spring } from '../lib/motion';
import type { ArtistHit, BuildInput, Shelf, Step } from '../lib/types';

const MIN = 1920, MAX = 1975;
type Phase = 'ask' | 'tuning' | 'failed';

export function Setup() {
  const navigate = useNavigate(), [params] = useSearchParams(), reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('ask'), [step, setStep] = useState(0);
  const [name, setName] = useState(''), [city, setCity] = useState(''), [born, setBorn] = useState(''), [anchors, setAnchors] = useState<string[]>([]);
  const [steps, setSteps] = useState<Step[]>([]), [error, setError] = useState(''), [problem, setProblem] = useState('');
  const alive = useRef(true), started = useRef(false), last = useRef<BuildInput | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const run = useCallback(async (input: BuildInput) => {
    last.current = input; setPhase('tuning'); setSteps([]); setError('');
    try {
      const session = await buildSession(input, s => alive.current && setSteps(prev => [...prev, s]));
      if (session.culture?.scenes.length) await new Promise(r => setTimeout(r, 1800)); // let the cultural reading land
      if (alive.current) navigate(`/app/${session.id}`, { state: { session }, replace: true });
    } catch (e) { if (alive.current) { setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.'); setPhase('failed'); } }
  }, [navigate]);

  useEffect(() => { // /app?preset=greece starts straight away: the one-tap demo.
    const preset = PRESETS[params.get('preset') ?? ''];
    if (preset && !started.current) { started.current = true; void run(preset); }
  }, [params, run]);

  const bornNumber = Number(born), bornValid = /^\d{4}$/.test(born) && bornNumber >= MIN && bornNumber <= MAX;
  const next = (e?: FormEvent) => {
    e?.preventDefault(); setProblem('');
    if (step === 1 && !bornValid) { setProblem(`Enter a year from ${MIN} to ${MAX}.`); return; }
    if (step === 2) { if (!anchors.length) { setProblem('Add at least one artist they loved.'); return; } void run({ born: bornNumber, name: name.trim() || undefined, anchors, city: city.trim() || undefined }); return; }
    setStep(s => s + 1);
  };

  if (phase !== 'ask') return <Tuning phase={phase} steps={steps} error={error} onRetry={() => last.current && run(last.current)} onBack={() => { setPhase('ask'); setStep(2); }} />;
  const titles = ['Who is it for?', 'When were they born?', 'Which artists did they love?'];
  return (
    <main id="app-main" className="wrap" style={{ paddingTop: 24, paddingBottom: 80 }}>
      <div className="col" style={{ maxWidth: 760 }}>
      <p className="hint" aria-live="polite" aria-label={`Step ${step + 1} of 3`}>{step + 1}/3</p>
      <AnimatePresence mode="wait" initial={false}>
        <m.form key={step} onSubmit={next} noValidate initial={reduce ? false : { opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: -40 }} transition={spring} style={{ marginTop: 16 }}>
          <h1 style={{ fontSize: 'clamp(40px, 8vw, 72px)', lineHeight: .95 }} tabIndex={-1} ref={el => el?.focus({ preventScroll: true })}>{titles[step]}</h1>
          {step === 0 && <NameStep value={name} onChange={setName} />}
          {step === 1 && <BornStep value={born} onChange={setBorn} valid={bornValid} />}
          {step === 2 && <ArtistsStep anchors={anchors} onChange={setAnchors} born={bornValid ? bornNumber : undefined} city={city} onCity={setCity} />}
          <p className="error" role="alert" style={{ marginTop: 12, minHeight: '1.5em' }}>{problem}</p>
          <div style={{ marginTop: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="submit" className="btn">{step === 2 ? 'Find their music' : step === 0 && !name ? 'Skip' : 'Next'}</button>
            {step > 0 ? <button type="button" className="textbtn" onClick={() => { setProblem(''); setStep(s => s - 1); }}>Back</button> : <Link className="textbtn" to="/">Cancel</Link>}
          </div>
        </m.form>
      </AnimatePresence>
      </div>
    </main>
  );
}

function NameStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="field" style={{ marginTop: 24 }}>
      <label htmlFor="name">First name <span className="hint">(optional, used only on their pages)</span></label>
      <input id="name" className="input" value={value} maxLength={40} autoComplete="off" onChange={e => onChange(e.target.value)} style={{ fontSize: 28, minHeight: 72 }} />
    </div>
  );
}

function BornStep({ value, onChange, valid }: { value: string; onChange: (v: string) => void; valid: boolean }) {
  const n = Number(value);
  return (
    <div className="field" style={{ marginTop: 24 }}>
      <label htmlFor="born">Year they were born</label>
      <input id="born" className="input" value={value} inputMode="numeric" maxLength={4} placeholder="1946" autoComplete="off" onChange={e => onChange(e.target.value.replace(/\D/g, ''))} aria-describedby="born-help" style={{ fontSize: 44, minHeight: 88, fontFamily: 'var(--font-display)' }} />
      <input type="range" aria-label="Pick a birth year" min={MIN} max={MAX} value={valid ? n : 1946} onChange={e => onChange(e.target.value)} style={{ width: '100%', minHeight: 44 }} />
      <p id="born-help" className="hint" aria-live="polite">{valid ? `Their years from 10 to 30 were ${n + 10} to ${n + 30}. That is where we look.` : `From ${MIN} to ${MAX}.`}</p>
    </div>
  );
}

function ArtistsStep({ anchors, onChange, born, city, onCity }: { anchors: string[]; onChange: (a: string[]) => void; born?: number; city: string; onCity: (c: string) => void }) {
  const [q, setQ] = useState(''), [hits, setHits] = useState<ArtistHit[]>([]), [active, setActive] = useState(-1), [shelf, setShelf] = useState<Shelf>({});
  useEffect(() => { getShelf().then(setShelf).catch(() => {}); }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const ctl = new AbortController(), t = setTimeout(() => searchArtists(q.trim(), ctl.signal).then(setHits).catch(() => {}), 250);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);
  const add = (n: string) => { if (anchors.length < 3 && !anchors.some(a => a.toLowerCase() === n.toLowerCase())) onChange([...anchors, n]); setQ(''); setHits([]); setActive(-1); };
  const full = anchors.length >= 3;
  return (
    <div style={{ marginTop: 24, display: 'grid', gap: 20 }}>
      <div className="field" style={{ position: 'relative' }}>
        <label htmlFor="artist">{full ? 'Three is plenty. Remove one to change it.' : 'Type a name, then pick from the list'}</label>
        <input id="artist" className="input" role="combobox" aria-expanded={hits.length > 0} aria-controls="artist-list" aria-autocomplete="list" aria-activedescendant={active >= 0 ? `hit-${active}` : undefined}
          value={q} disabled={full} autoComplete="off" onChange={e => { setQ(e.target.value); setActive(-1); }} style={{ fontSize: 24, minHeight: 64 }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, hits.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
            else if (e.key === 'Enter' && (active >= 0 || hits.length === 1)) { e.preventDefault(); const h = hits[active >= 0 ? active : 0]; if (h) add(h.name); }
            else if (e.key === 'Escape') { setHits([]); }
          }} />
        {hits.length > 0 && (
          <ul id="artist-list" role="listbox" className="card" style={{ listStyle: 'none', margin: 0, padding: 0, position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, zIndex: 10 }}>
            {hits.map((h, i) => (
              <li key={h.id} id={`hit-${i}`} role="option" aria-selected={i === active} onMouseDown={e => { e.preventDefault(); add(h.name); }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '6px 12px', cursor: 'pointer', background: i === active ? 'color-mix(in oklab, var(--color-action) 40%, transparent)' : undefined }}>
                {h.image ? <img src={h.image} alt="" width={40} height={40} style={{ objectFit: 'cover', border: '1px solid var(--color-ink)' }} /> : <span style={{ width: 40, height: 40, background: 'var(--color-line)' }} />}
                <span style={{ fontWeight: 600 }}>{h.name}</span>
              </li>))}
          </ul>)}
      </div>
      {anchors.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: 10, flexWrap: 'wrap' }} aria-label="Chosen artists">
          {anchors.map(a => (
            <li key={a} className="card" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 0 0 14px', minHeight: 48, boxShadow: '2px 2px 0 var(--color-shadow)' }}>
              <span style={{ fontWeight: 600 }}>{a}</span>
              <button type="button" onClick={() => onChange(anchors.filter(x => x !== a))} aria-label={`Remove ${a}`} style={{ minWidth: 44, minHeight: 46, border: 0, borderLeft: '1.5px solid var(--color-ink)', background: 'transparent', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
              </button>
            </li>))}
        </ul>)}
      <div className="field">
        <label htmlFor="shelf">Don't know names?</label>
        <select id="shelf" className="input" value="" onChange={e => { const s = shelf[e.target.value]; if (s) onChange(s.artists.slice(0, 3)); }}>
          <option value="">Start from a country</option>
          {Object.entries(shelf).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
        <p className="hint">{born ? 'Fills in well-known artists from that country. Change them freely.' : 'Fills in well-known artists. Change them freely.'}</p>
      </div>
      <div className="field">
        <label htmlFor="city">Where do they live now? <span className="hint">(optional)</span></label>
        <input id="city" className="input" value={city} maxLength={60} autoComplete="off" placeholder="Chicago" onChange={e => onCity(e.target.value)} />
        <p className="hint">A city name, never an address. It lets Qloo find a taste-of-home restaurant nearby.</p>
      </div>
    </div>
  );
}

function Tuning({ phase, steps, error, onRetry, onBack }: { phase: Phase; steps: Step[]; error: string; onRetry: () => void; onBack: () => void }) {
  const reduce = useReducedMotion(), current = steps[steps.length - 1];
  return (
    <main id="app-main" className="wrap" style={{ paddingTop: 48, paddingBottom: 80, minHeight: '70dvh' }}>
      <div className="col" style={{ maxWidth: 900 }}>
      <p className="label">{phase === 'failed' ? 'Something stopped' : 'Looking through Qloo'}</p>
      {phase === 'failed' ? (
        <div style={{ marginTop: 16 }}>
          <h1 style={{ fontSize: 'clamp(40px, 8vw, 72px)', lineHeight: .95 }}>It did not work</h1>
          <p className="error" role="alert" style={{ marginTop: 16 }}>{error}</p>
          <div style={{ marginTop: 24, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn" onClick={onRetry}>Try again</button><button className="textbtn" onClick={onBack}>Change the artists</button>
          </div>
        </div>
      ) : (
        <div role="status" aria-live="polite" style={{ marginTop: 16 }}>
          <AnimatePresence mode="popLayout" initial={false}>
            <m.h1 key={current?.text ?? 'start'} initial={reduce ? false : { opacity: 0, y: 24, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={reduce ? undefined : { opacity: 0, y: -24 }} transition={spring}
              style={{ fontSize: 'clamp(40px, 8vw, 72px)', lineHeight: 1, minHeight: '2.2em' }}>{current?.text ?? 'Starting'}</m.h1>
          </AnimatePresence>
          {current?.kept !== undefined && <p style={{ marginTop: 8, font: '600 22px var(--font-body)' }}>Kept {current.kept}{current.dropped ? `, set aside ${current.dropped}` : ''}.</p>}
          <ol style={{ marginTop: 32, padding: 0, listStyle: 'none', display: 'grid', gap: 6, color: 'var(--color-muted)' }}>
            {steps.slice(0, -1).map((s, i) => <li key={i}>{s.text}</li>)}
          </ol>
        </div>)}
      </div>
    </main>
  );
}
