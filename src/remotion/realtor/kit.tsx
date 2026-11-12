/**
 * Shared pieces for the voiced templates added 2026-11-12 (POV, Day, Top 3, Alert, Luxe):
 * beat timing, phrase captions with keyword colour, line wrapping and the end-card cue times.
 */
import type { CSSProperties } from 'react';
import { useCurrentFrame } from 'remotion';
import { FPS } from './shared';
import { VOICE_OFFSET_S, chunkWords, toFrame, wordAt, type VoicedProps } from './voiced';

/** Frame where each beat starts, where the end card starts, and the total. */
export const beatTiming = ({ beats, endStartS, durationS }: Pick<VoicedProps, 'beats' | 'endStartS' | 'durationS'>) => {
  const starts = beats.map((b) => toFrame(b.startS + VOICE_OFFSET_S));
  const endF = toFrame(endStartS + VOICE_OFFSET_S);
  const total = toFrame(durationS);
  const lenOf = (i: number) => (starts[i + 1] ?? endF) - starts[i];
  return { starts, endF, total, lenOf };
};

/** Frame (relative to the end card) where a spoken word in the end lines starts. */
export const endCue = (props: VoicedProps, re: RegExp, endF: number) =>
  Math.max(0, toFrame(wordAt(props.words, re, props.endStartS) + VOICE_OFFSET_S) - endF);

/** Greedy wrap into lines of at most `max` characters. */
export const wrapLines = (text: string, max = 18): string[] => {
  const lines: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
};

const clean = (w: string) => w.replace(/[.,!?]+$/, '');
const norm = (w: string) => clean(w).toLowerCase().replace(/[^a-z0-9']/g, '');

type PhraseProps = {
  words: VoicedProps['words'];
  maxWords?: number;
  /** Words drawn in the accent colour (beat titles). */
  keywords?: string[];
  accent?: string;
  style: CSSProperties;
  /** Words appear as they are spoken (C1), instead of the whole phrase at once. */
  reveal?: boolean;
  hideDuring?: [number, number][];
  upper?: boolean;
};

/** One short phrase at a time, keywords in the accent colour. */
export const PhraseCaptions = ({ words, maxWords = 4, keywords = [], accent = '#FFD43B', style, reveal = true, hideDuring = [], upper = false }: PhraseProps) => {
  const t = useCurrentFrame() / FPS - VOICE_OFFSET_S;
  if (hideDuring.some(([a, b]) => t >= a && t < b)) return null;
  const keys = new Set(keywords.flatMap((k) => k.split(/\s+/)).map(norm).filter((k) => k.length > 2));
  const chunks = chunkWords(words, maxWords);
  const idx = chunks.findIndex((c, i) => t >= c.startS && t < (chunks[i + 1]?.startS ?? c.endS + 0.4));
  if (idx < 0) return null;
  return (
    <div style={style}>
      {chunks[idx].words.map((w) => {
        const spoken = t >= w.startS;
        const text = clean(w.word);
        return (
          <span key={`${w.word}${w.startS}`} style={{ color: keys.has(norm(w.word)) ? accent : undefined, opacity: reveal && !spoken ? 0 : 1 }}>
            {upper ? text.toUpperCase() : text}{' '}
          </span>
        );
      })}
    </div>
  );
};

/** "$525,000" → "$525K", "$1,250,000" → "$1.25M". */
export const shortPrice = (label: string): string => {
  const n = Number(label.replace(/[^0-9]/g, ''));
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  return `$${Math.round(n / 1000)}K`;
};
