import { ApiError, type ArtistHit, type BuildInput, type Reaction, type SessionView, type Shelf, type Step } from './types';
import { ndjsonParser } from './ndjson';

async function json<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new ApiError(data.error || 'Something went wrong. Please try again.', response.status);
  return data as T;
}
const post = (path: string, body: unknown) => fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// Posts and reads a newline-delimited stream: each real step the agent takes as it happens, then the finished session.
async function streamSession(path: string, body: unknown, onStep: (step: Step) => void, signal?: AbortSignal): Promise<SessionView> {
  const response = await fetch(path, { method: 'POST', signal, headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' }, body: JSON.stringify(body) });
  if (!response.ok || !response.body) return json<SessionView>(response);
  let done: SessionView | undefined, failure: ApiError | undefined;
  const parser = ndjsonParser(line => {
    const value = line as { type: string; session?: SessionView; message?: string; status?: number } & Step;
    if (value.type === 'step') onStep({ text: value.text, kept: value.kept, dropped: value.dropped });
    else if (value.type === 'done' && value.session) done = value.session;
    else if (value.type === 'error') failure = new ApiError(value.message || 'Something went wrong.', value.status);
  });
  const reader = response.body.getReader(), decoder = new TextDecoder();
  for (;;) { const { value, done: finished } = await reader.read(); if (finished) break; parser.push(decoder.decode(value, { stream: true })); }
  if (failure) throw failure;
  if (!done) throw new ApiError('The connection dropped before the session was ready. Please try again.');
  return done;
}
export const buildSession = (input: BuildInput, onStep: (step: Step) => void, signal?: AbortSignal) => streamSession('/api/sessions', input, onStep, signal);
export const chatWithAgent = (id: string, message: string, onStep: (step: Step) => void) => streamSession(`/api/sessions/${id}/chat`, { message }, onStep);

export const getSession = (id: string) => fetch(`/api/sessions/${id}`).then(r => json<SessionView>(r));
export const react = (id: string, itemId: string, reaction: Reaction) => post(`/api/sessions/${id}/react`, { itemId, reaction }).then(r => json<SessionView>(r));
export const saveNote = (id: string, itemId: string, note: string) => post(`/api/sessions/${id}/note`, { itemId, note }).then(r => json<SessionView>(r));
export const deleteSession = (id: string) => fetch(`/api/sessions/${id}`, { method: 'DELETE' }).then(r => json<{ deleted: boolean }>(r));
export const searchArtists = (q: string, signal?: AbortSignal) => fetch(`/api/artists?q=${encodeURIComponent(q)}`, { signal }).then(r => json<ArtistHit[]>(r));
export const getShelf = () => fetch('/api/shelf').then(r => json<Shelf>(r));
