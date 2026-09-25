// Client-safe copy of the fixed 7-shot format (source of truth: src/server/slideshow/core/format.ts).
// Used by the deck editor for shot labels, live word limits and the render check.

export type ShotFormat = { label: string; durationSec: number; maxWords: number };

export const SHOT_FORMAT: readonly ShotFormat[] = [
  { label: 'Hook', durationSec: 3, maxWords: 8 },
  { label: 'Pain', durationSec: 4, maxWords: 10 },
  { label: 'Old way', durationSec: 4, maxWords: 10 },
  { label: 'Mechanism', durationSec: 4, maxWords: 10 },
  { label: 'Proof', durationSec: 4, maxWords: 10 },
  { label: 'Cost of waiting', durationSec: 4, maxWords: 10 },
  { label: 'Call to action', durationSec: 3, maxWords: 7 },
];

export const countWords = (text: string): number =>
  text.trim() ? text.trim().split(/\s+/).length : 0;

/** First format problem in a 7-shot draft, as a short button label; null when it can render. */
export function shotFormatError(texts: string[]): string | null {
  for (let i = 0; i < SHOT_FORMAT.length; i++) {
    const f = SHOT_FORMAT[i]!;
    const n = countWords(texts[i] ?? '');
    if (n === 0) return `${f.label} is empty`;
    if (n > f.maxWords) return `${f.label}: ${n}/${f.maxWords} words`;
  }
  if ((texts[0] ?? '').includes('!')) return 'Remove "!" from the hook';
  return null;
}

/** One media choice for a shot: a library clip (already in R2) or a listing photo. */
export type MediaChoice = {
  mediaUrl: string;
  mediaKind: 'image' | 'video';
  mediaLabel: string;
  /** R2 key of a library asset. Absent for listing photos (imported when the editor opens). */
  assetKey?: string;
  trimStart?: number;
  positionY?: number;
};

/** What the editor needs per deck shot beyond the text. */
export type ShotEditData = {
  source: 'library' | 'listing';
  assetKey?: string;
  trimStart?: number;
  positionY?: number;
  durationSec: number;
  /** Runner-up media for one-tap swap. */
  alternatives: MediaChoice[];
};
