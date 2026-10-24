import { useCallback, useEffect, useRef, useState } from 'react';

export type AudioState = { playing: boolean; progress: number; duration: number; error: string | null; ended: boolean };
// One <audio> for the whole player. After the caregiver's first press of play, later songs start on their own;
// before that nothing plays, because browsers require a tap first.
export function useAudio(url: string | null | undefined, preload?: string | null) {
  const el = useRef<HTMLAudioElement | null>(null), warm = useRef<HTMLAudioElement | null>(null), wantPlay = useRef(false);
  const [state, setState] = useState<AudioState>({ playing: false, progress: 0, duration: 30, error: null, ended: false });
  const patch = useCallback((p: Partial<AudioState>) => setState(s => ({ ...s, ...p })), []);

  useEffect(() => {
    const audio = new Audio(); audio.preload = 'auto'; el.current = audio;
    audio.addEventListener('timeupdate', () => patch({ progress: audio.duration ? audio.currentTime / audio.duration : 0 }));
    audio.addEventListener('loadedmetadata', () => patch({ duration: audio.duration || 30 }));
    audio.addEventListener('play', () => patch({ playing: true, ended: false }));
    audio.addEventListener('pause', () => patch({ playing: false }));
    audio.addEventListener('ended', () => patch({ playing: false, ended: true, progress: 1 }));
    audio.addEventListener('error', () => patch({ playing: false, error: 'This preview would not load.' }));
    return () => { audio.pause(); audio.removeAttribute('src'); audio.load(); el.current = null; };
  }, [patch]);

  useEffect(() => {
    const audio = el.current; if (!audio) return;
    audio.pause(); setState({ playing: false, progress: 0, duration: 30, error: null, ended: false });
    if (!url) { audio.removeAttribute('src'); return; }
    audio.src = url;
    if (wantPlay.current) audio.play().catch(() => patch({ error: 'Your browser blocked the audio. Press play.' }));
  }, [url, patch]);

  useEffect(() => { // Warm the next preview so skipping ahead is instant.
    if (!preload) { warm.current = null; return; }
    const next = new Audio(); next.preload = 'auto'; next.src = preload; warm.current = next;
    return () => { next.removeAttribute('src'); };
  }, [preload]);

  const toggle = useCallback(() => {
    const audio = el.current; if (!audio || !url) return;
    wantPlay.current = true; patch({ error: null });
    if (audio.paused) { if (audio.ended) audio.currentTime = 0; audio.play().catch(() => patch({ error: 'Your browser blocked the audio. Press play.' })); } else audio.pause();
  }, [url, patch]);
  const seek = useCallback((fraction: number) => { const audio = el.current; if (audio && audio.duration) audio.currentTime = Math.min(Math.max(fraction, 0), 1) * audio.duration; }, []);
  const stop = useCallback(() => { wantPlay.current = false; el.current?.pause(); }, []);
  return { ...state, toggle, seek, stop };
}
