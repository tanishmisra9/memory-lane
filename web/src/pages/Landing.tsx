import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { BlurFade } from '../components/BlurFade';
import { EraTimeline } from '../components/EraTimeline';
import { PRESETS } from '../lib/presets';

const DEMO_BORN = 1946;
// The marker visits a few ages inside the window: the whole idea in one picture.
function Sweep() {
  const reduce = useReducedMotion(), ages = [13, 19, 24, 28], [i, setI] = useState(1);
  useEffect(() => { if (reduce) return; const t = setInterval(() => setI(n => (n + 1) % ages.length), 2200); return () => clearInterval(t); }, [reduce]);
  const age = ages[i] ?? 19;
  return <EraTimeline born={DEMO_BORN} span={[age, age]} flag={`Age ${age}, ${DEMO_BORN + age}`} caption={`Born ${DEMO_BORN}. Their music is from ${DEMO_BORN + 10} to ${DEMO_BORN + 30}.`} />;
}

export function Landing() {
  return (
    <main id="app-main" className="wrap" style={{ paddingTop: 32, paddingBottom: 72 }}>
      <section className="hero2">
        <div>
          <BlurFade>
            <h1 style={{ fontSize: 'clamp(42px, 6.4vw, 92px)', lineHeight: .94 }}>
              <span className="ghost">The right song isn't the popular one.</span>{' '}
              <span>It's the one from when they were 19.</span>
            </h1>
          </BlurFade>
          <BlurFade delay={0.1}><p style={{ marginTop: 24, maxWidth: '40ch', fontSize: 20 }}>Play songs, films and shows from the years someone with dementia was young. Tap how each one lands. Keep a Memory Book for family and care staff.</p></BlurFade>
          <BlurFade delay={0.2}>
            <div style={{ marginTop: 32, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link to="/app" className="btn">Start a session</Link>
              <span className="hint">Takes about a minute. No login.</span>
            </div>
          </BlurFade>
          <BlurFade delay={0.3}>
            <div style={{ marginTop: 28 }}>
              <p className="label">Or try an example</p>
              <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {Object.entries(PRESETS).map(([k, p]) => <Link key={k} className="btn quiet small" to={`/app?preset=${k}`}>{p.label}</Link>)}
              </div>
            </div>
          </BlurFade>
        </div>
        <BlurFade delay={0.25} className="card"><div style={{ padding: 'clamp(20px, 4vw, 36px)' }}><Sweep /></div></BlurFade>
      </section>

      <BlurFade as="section" className="">
        <p style={{ marginTop: 48, maxWidth: '58ch', textWrap: 'pretty' }}>
          A plain "popular music" list fits a person's youth 17% of the time, and 83% of its top picks carry an upsetting lyrical theme. Memory Lane builds from their own years, in their own culture, and screens every song.{' '}
          <a href="https://github.com/tanishmisra9/memory-lane/blob/master/docs/evaluation.md">How we measured it</a>.
        </p>
      </BlurFade>
    </main>
  );
}
