'use client';

import type { ResearchVideo } from './ResearchPanel';

/** The last hook search, kept in this browser so leaving the tab does not cost another search. */
const KEY = 'ugc_lab_research';

export type ResearchCache = {
  industry: string;
  videos: ResearchVideo[];
  selectedId: string;
  editedHook: string;
  at: string;
};

const isCache = (value: unknown): value is ResearchCache =>
  typeof value === 'object' && value !== null
  && typeof (value as ResearchCache).industry === 'string'
  && Array.isArray((value as ResearchCache).videos);

export const readResearch = (): ResearchCache | null => {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isCache(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/** Transcripts are dropped: they are long, and only the hook is used after the search. */
export const writeResearch = (cache: ResearchCache): void => {
  try {
    const slim = { ...cache, videos: cache.videos.map((v) => ({ ...v, raw_transcript: '' })) };
    window.localStorage.setItem(KEY, JSON.stringify(slim));
  } catch {
    // A full or blocked store only costs the shortcut, never the search itself.
  }
};

export const clearResearch = (): void => {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to do: the next search overwrites it anyway.
  }
};

/** "2 min ago", "3 h ago", "yesterday". */
export const ago = (iso: string): string => {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return hours < 48 ? 'yesterday' : `${Math.round(hours / 24)} days ago`;
};
