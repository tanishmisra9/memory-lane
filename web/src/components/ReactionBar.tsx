import { useEffect, useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import type { Item, Reaction } from '../lib/types';
import { springFirm } from '../lib/motion';

const OPTIONS: { key: Reaction; label: string; key2: string }[] = [{ key: 'smiled', label: 'Smiled', key2: '1' }, { key: 'neutral', label: 'Okay', key2: '2' }, { key: 'upset', label: 'Upset', key2: '3' }];

// How did it land? Smiled and Okay open a one-line note; Upset swaps the song right away.
export function ReactionBar({ item, busy, attention, onReact, onNote, onNext, isLast }: { item: Item; busy: boolean; attention: boolean; onReact: (r: Reaction) => void; onNote: (text: string) => Promise<void>; onNext: () => void; isLast: boolean }) {
  const [draft, setDraft] = useState(item.note ?? '');
  const first = useRef<HTMLButtonElement>(null), sent = useRef(item.note ?? ''), pending = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => { setDraft(item.note ?? ''); sent.current = item.note ?? ''; }, [item.id, item.note]);
  useEffect(() => { if (attention) first.current?.focus(); }, [attention, item.id]);
  const showNote = item.reaction === 'smiled' || item.reaction === 'neutral';
  const prompt = item.kind === 'song' && item.ages && item.ages[0] === item.ages[1] ? `What does this bring up? Where were they in ${item.year}?` : 'What does this bring up?';
  // Blur and the Save button both flush; send each distinct text once, and let the second wait for the first.
  const flush = async () => {
    const text = draft.trim();
    if (text !== sent.current) { sent.current = text; pending.current = onNote(text); }
    await pending.current;
  };
  return (
    <div>
      <p className="label" id="how">How did it land?</p>
      <div role="group" aria-labelledby="how" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 8 }}>
        {OPTIONS.map((o, i) => (
          <m.button key={o.key} ref={i === 0 ? first : undefined} type="button" whileTap={{ scale: 0.97 }} disabled={busy} aria-pressed={item.reaction === o.key} onClick={() => onReact(o.key)}
            className={`btn small ${item.reaction === o.key ? '' : 'quiet'}`} style={{ background: item.reaction === o.key ? 'var(--color-ink)' : undefined, color: item.reaction === o.key ? 'var(--color-bg)' : undefined, minHeight: 56 }}>
            {o.label}<span className="kbd" aria-hidden="true" style={{ marginLeft: 4, color: 'inherit', opacity: .6 }}>{o.key2}</span>
          </m.button>
        ))}
      </div>
      <AnimatePresence initial={false}>
        {showNote && (
          <m.div key="note" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={springFirm} style={{ overflow: 'hidden' }}>
            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="note">{prompt} <span className="hint">(optional)</span></label>
              <textarea id="note" className="input" rows={2} maxLength={280} value={draft} onChange={e => setDraft(e.target.value)} onBlur={flush} placeholder="Danced to it at their wedding" aria-describedby="note-help" style={{ resize: 'vertical' }} />
              <p className="hint" id="note-help">{draft.length}/280. Please don't enter medical details.</p>
            </div>
            <div style={{ marginTop: 16 }}>
              <button type="button" className="btn" onClick={async () => { await flush(); onNext(); }} disabled={busy}>{isLast ? 'Save and finish' : 'Save and continue'}</button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
