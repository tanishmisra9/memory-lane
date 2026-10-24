import type { Item } from '../../../src/engine';
export type { Item };
export type Step = { text: string; kept?: number; dropped?: number };
export type SessionView = { id: string; version: number; name?: string; born: number; plan: Item[]; prompts: string[]; trace: Step[]; unresolved: string[]; avoid: { title: string; by?: string }[] };
export type Reaction = 'smiled' | 'neutral' | 'upset';
export type ArtistHit = { id: string; name: string; image?: string };
export type Shelf = Record<string, { label: string; born: [number, number]; artists: string[] }>;
export type BuildInput = { born: number; name?: string; anchors: string[] };

export class ApiError extends Error { constructor(message: string, readonly status = 0) { super(message); } }
// Songs the engine could not replace stay in the plan as a placeholder; they are never shown as songs.
export const playable = (plan: Item[]) => plan.filter(item => item.kind !== 'song' || !!item.by);
