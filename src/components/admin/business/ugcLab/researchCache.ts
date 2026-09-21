'use client';

import type { ResearchVideo } from './ResearchCard';

// ── Current-session cache ──────────────────────────────────────────────────────
// Keeps the last active search across page reloads / tab switches so you don't
// have to re-run a search just because you navigated away.

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

const slimVideos = (videos: ResearchVideo[], maxChars: number): ResearchVideo[] =>
  videos.map((v) => ({ ...v, raw_transcript: (v.raw_transcript ?? '').slice(0, maxChars) }));

/** Transcripts capped at 8 KB so "See script" still works in the current session. */
export const writeResearch = (cache: ResearchCache): void => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...cache, videos: slimVideos(cache.videos, 8_000) }));
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

// ── Permanent search history ───────────────────────────────────────────────────
// Every successful search is appended here so you can recall past results
// without re-running the same query.  Grouped by day in the UI.

const HISTORY_KEY = 'ugc_lab_research_history';
const MAX_HISTORY = 40;
/** Keep transcripts shorter in history to stay well within the 5 MB localStorage cap. */
const HISTORY_TRANSCRIPT_CHARS = 3_000;

export type SearchEntry = {
  /** Unique ID — ISO timestamp at creation, used as React key and expand toggle. */
  id: string;
  /** ISO datetime when the search ran. */
  at: string;
  industry: string;
  videos: ResearchVideo[];
};

const isEntry = (v: unknown): v is SearchEntry =>
  typeof v === 'object' && v !== null
  && typeof (v as SearchEntry).id === 'string'
  && typeof (v as SearchEntry).industry === 'string'
  && Array.isArray((v as SearchEntry).videos);

export const readHistory = (): SearchEntry[] => {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter(isEntry);
  } catch {
    return [];
  }
};

/** Prepend a completed search to the permanent history (most-recent-first). */
export const addToHistory = (partial: { at: string; industry: string; videos: ResearchVideo[] }): void => {
  try {
    const existing = readHistory();
    const entry: SearchEntry = {
      id: partial.at,
      at: partial.at,
      industry: partial.industry,
      videos: slimVideos(partial.videos, HISTORY_TRANSCRIPT_CHARS),
    };
    // Newest first, capped at MAX_HISTORY entries total.
    const next = [entry, ...existing].slice(0, MAX_HISTORY);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // History is best-effort; don't let a full store break the search.
  }
};

export const clearHistory = (): void => {
  try {
    window.localStorage.removeItem(HISTORY_KEY);
  } catch {}
};

// ── Grouping helpers ───────────────────────────────────────────────────────────

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate();

export const formatDay = (iso: string): string => {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d, today)) return 'Today';
  if (isSameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export type DayGroup = { day: string; searches: SearchEntry[] };

/** Group a flat history (most-recent-first) into calendar-day buckets. */
export const groupByDay = (entries: SearchEntry[]): DayGroup[] => {
  const map = new Map<string, SearchEntry[]>();
  for (const entry of entries) {
    const day = formatDay(entry.at);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(entry);
  }
  return Array.from(map.entries()).map(([day, searches]) => ({ day, searches }));
};

// ── Formatting helpers ─────────────────────────────────────────────────────────

/** "2 min ago", "3 h ago", "yesterday". */
export const ago = (iso: string): string => {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return hours < 48 ? 'yesterday' : `${Math.round(hours / 24)} days ago`;
};
