// server-only — never import from a 'use client' file.
// The hook library (src/data/hooks.json, 420 patterns) narrowed to the ones a slideshow hook can use, best rated first.

import hooksData from '../../../data/hooks.json';

export type LibraryHook = { id: string; text: string; category: string; engagementRate: number };

const LIBRARY = (hooksData as { hooks: LibraryHook[] }).hooks;
const BY_ID = new Map(LIBRARY.map((h) => [h.id, h]));

/** Patterns kept per category: enough choice for 18 hooks across 11+ categories, small enough for a cheap prompt. */
const PER_CATEGORY = 4;
const MAX_PATTERN_WORDS = 12;

/**
 * A slideshow speaks for the business, so first-person stories ("I tested…") are out, and so are comment bait, numbers
 * (they become fake stats) and "The answer surprised everyone…" (it led the model to state the answer in the hook).
 */
const isUsable = (h: LibraryHook): boolean =>
  !/\b(I|I'm|I've|we|me|my)\b/.test(h.text)
  && !/competitor|comment|emoji|\bDM\b|link in bio|follow|answer surprised|\d|%/i.test(h.text)
  && h.text.trim().split(/\s+/).length <= MAX_PATTERN_WORDS;

const shortlist = (): LibraryHook[] => {
  const byCategory = new Map<string, LibraryHook[]>();
  for (const h of [...LIBRARY].sort((a, b) => b.engagementRate - a.engagementRate)) {
    if (!isUsable(h)) continue;
    const list = byCategory.get(h.category) ?? [];
    if (list.length < PER_CATEGORY) byCategory.set(h.category, [...list, h]);
  }
  return [...byCategory.values()].flat();
};

export const HOOK_SHORTLIST: LibraryHook[] = shortlist();

/** The shortlist as prompt lines: "hook_36 [bold_statement] Stop [doing X]. Here's why:". */
export const shortlistText = (): string => HOOK_SHORTLIST.map((h) => `${h.id} [${h.category}] ${h.text}`).join('\n');

/** The model sometimes writes "hook36" or "36" for "hook_36". */
export const toPatternId = (raw: unknown): string => {
  const n = String(raw ?? '').match(/\d+/)?.[0];
  return n ? `hook_${n}` : '';
};

export const libraryHook = (id: string): LibraryHook | undefined => BY_ID.get(id);

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/\byou're\b/g, 'you').replace(/\byour\b/g, 'you');

/** True when the hook kept at least half of the pattern's fixed words (the words that make the pattern work). */
export const keepsPattern = (text: string, pattern: string): boolean => {
  const fixed = (norm(pattern.replace(/\[[^\]]*\]/g, ' ')).match(/[a-z']+/g) ?? []).filter((w) => w.length > 2);
  if (fixed.length === 0) return true;
  const t = norm(text);
  return fixed.filter((w) => t.includes(w)).length / fixed.length >= 0.5;
};
