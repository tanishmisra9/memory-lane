import { useState } from 'react';
import { chatWithAgent } from '../lib/api';
import type { SessionView, Step } from '../lib/types';
import { Drawer } from './Drawer';

const IDEAS = ['She dislikes sad songs', 'More from the 1960s', 'Skip the film', 'Find something livelier'];

// The caregiver says what they see; the agent goes back to Qloo with it and re-plans. Its steps stream in as they happen.
export function ChatDrawer({ id, name, onClose, onPlan }: { id: string; name?: string; onClose: () => void; onPlan: (s: SessionView) => void }) {
  const [text, setText] = useState(''), [steps, setSteps] = useState<Step[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const send = async (message: string) => {
    if (!message.trim() || busy) return;
    setBusy(true); setError(''); setSteps([]);
    try { onPlan(await chatWithAgent(id, message.trim(), s => setSteps(prev => [...prev, s]))); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'The agent could not finish.'); setBusy(false); }
  };
  const them = name || 'them';
  return (
    <Drawer id="chat-title" title="Tell the agent" onClose={onClose}>
      <p style={{ marginTop: 8 }}>Say what you are seeing in the room. The agent goes back to Qloo and plans again, keeping what made {them} smile.</p>
      <form onSubmit={e => { e.preventDefault(); void send(text); }} style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        <div className="field"><label htmlFor="chat">What should change?</label>
          <textarea id="chat" className="input" rows={3} maxLength={280} value={text} disabled={busy} onChange={e => setText(e.target.value)} placeholder="She seems sad at slow songs" />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {IDEAS.map(i => <button key={i} type="button" className="btn quiet small" disabled={busy} onClick={() => void send(i)}>{i}</button>)}
        </div>
        <div><button type="submit" className="btn" disabled={busy || !text.trim()}>{busy ? 'Working' : 'Re-plan'}</button></div>
      </form>
      {error && <p className="error" role="alert" style={{ marginTop: 12 }}>{error}</p>}
      {steps.length > 0 && <ol aria-live="polite" style={{ marginTop: 16, padding: 0, listStyle: 'none', display: 'grid', gap: 6, color: 'var(--color-muted)' }}>{steps.map((s, i) => <li key={i}>{s.text}</li>)}</ol>}
    </Drawer>
  );
}
