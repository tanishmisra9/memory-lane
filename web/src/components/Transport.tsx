import { useRef } from 'react';
import { m } from 'framer-motion';
import type { AudioState } from '../lib/audio';

const mmss = (s: number) => `0:${String(Math.floor(s)).padStart(2, '0')}`;
const Arrow = ({ flip }: { flip?: boolean }) => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ transform: flip ? 'scaleX(-1)' : undefined }}><path d="M5 4l10 8-10 8zM17 4h3v16h-3z" /></svg>;

export function Transport({ audio, canPlay, onToggle, onSeek, onPrev, onNext, hasPrev, hasNext }: { audio: AudioState; canPlay: boolean; onToggle: () => void; onSeek: (f: number) => void; onPrev: () => void; onNext: () => void; hasPrev: boolean; hasNext: boolean }) {
  const bar = useRef<HTMLDivElement>(null);
  const seekFromPointer = (clientX: number) => { const r = bar.current?.getBoundingClientRect(); if (r) onSeek((clientX - r.left) / r.width); };
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" className="btn quiet small" style={{ minWidth: 56 }} onClick={onPrev} disabled={!hasPrev} aria-label="Previous song"><Arrow flip /></button>
        {canPlay ? (
          <m.button type="button" whileTap={{ scale: 0.96 }} className="btn" style={{ width: 88, minHeight: 72, padding: 0 }} onClick={onToggle} aria-label={audio.playing ? 'Pause' : 'Play'}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{audio.playing ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M7 3l14 9-14 9z" />}</svg>
          </m.button>
        ) : <p className="hint" style={{ flex: 1 }}>No preview for this one. Open it in Spotify or Apple Music from the Memory Book.</p>}
        <button type="button" className="btn quiet small" style={{ minWidth: 56 }} onClick={onNext} disabled={!hasNext} aria-label="Next song"><Arrow /></button>
      </div>
      {canPlay && (
        <div style={{ marginTop: 14 }}>
          <div ref={bar} role="slider" tabIndex={0} aria-label="Song position" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(audio.progress * 100)} aria-valuetext={`${mmss(audio.progress * audio.duration)} of ${mmss(audio.duration)}`}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); seekFromPointer(e.clientX); }}
            onPointerMove={e => { if (e.buttons) seekFromPointer(e.clientX); }}
            onKeyDown={e => { if (e.key === 'ArrowRight') { e.stopPropagation(); onSeek(audio.progress + 0.1); } if (e.key === 'ArrowLeft') { e.stopPropagation(); onSeek(audio.progress - 0.1); } }}
            style={{ position: 'relative', height: 44, cursor: 'pointer', touchAction: 'none', display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '100%', height: 10, border: '1.5px solid var(--color-ink)', background: 'var(--color-surface)' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'var(--color-red)', transform: `scaleX(${audio.progress})`, transformOrigin: 'left' }} />
            </div>
          </div>
          <div className="hint" style={{ display: 'flex', justifyContent: 'space-between' }} aria-hidden="true"><span>{mmss(audio.progress * audio.duration)}</span><span>{mmss(audio.duration)}</span></div>
        </div>
      )}
      {audio.error && <p className="error" role="alert" style={{ marginTop: 8 }}>{audio.error}</p>}
    </div>
  );
}
