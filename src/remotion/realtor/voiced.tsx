/**
 * Voiced presets (25 s): voiceover + music bed + SFX, beats cut on sentence starts, word-synced captions.
 * Word timings come from the Shorts TTS pipeline (Whisper-aligned), see scripts/realtor-test/make-audio.ts.
 */
import type { CSSProperties } from 'react';
import { Audio, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { FPS, photoSrc } from './shared';
import type { ListingBeat, ListingFacts } from './types';

export type SpokenWord = { word: string; startS: number; endS: number };

/** startS / checkAtS are voice times (before VOICE_OFFSET_S). checkAtS: when this room gets ticked (Rate preset). */
export type VoicedBeat = ListingBeat & { startS: number; checkAtS?: number };

export type SfxCue = { atS: number; file: string; volume?: number };

export type VoicedProps = {
  facts: ListingFacts;
  beats: VoicedBeat[];
  /** When the end beat (price / CTA) starts. */
  endStartS: number;
  endPhoto: string;
  voice: string;
  music: string;
  words: SpokenWord[];
  sfx: SfxCue[];
  durationS: number;
};

export const VOICED_DURATION_S = 25;

export const toFrame = (s: number) => Math.round(s * FPS);

/** Voice at full level, music ducked under it, music fades out over the last second. */
export const Soundtrack = ({ voice, music, sfx, durationS, musicLevel = 0.16 }: Pick<VoicedProps, 'voice' | 'music' | 'sfx' | 'durationS'> & { musicLevel?: number }) => {
  const total = toFrame(durationS);
  return (
    <>
      <Sequence from={6}><Audio src={photoSrc(voice)} /></Sequence>
      <Audio
        src={photoSrc(music)}
        volume={(f) => interpolate(f, [0, 8, total - 30, total], [0, musicLevel, musicLevel, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
      />
      {sfx.map((cue) => (
        <Sequence key={`${cue.file}${cue.atS}`} from={toFrame(cue.atS)}>
          <Audio src={photoSrc(cue.file)} volume={cue.volume ?? 0.35} />
        </Sequence>
      ))}
    </>
  );
};

/** The voice starts 6 frames in (Soundtrack), so word times are shifted by the same amount. */
export const VOICE_OFFSET_S = 6 / FPS;

type Chunk = { words: SpokenWord[]; startS: number; endS: number };

/** Groups words into short phrases: a break after . ? ! , or every `max` words. */
export const chunkWords = (words: SpokenWord[], max = 3): Chunk[] => {
  const chunks: Chunk[] = [];
  let cur: SpokenWord[] = [];
  const flush = () => {
    if (cur.length) chunks.push({ words: cur, startS: cur[0].startS, endS: cur[cur.length - 1].endS });
    cur = [];
  };
  for (const w of words) {
    cur.push(w);
    if (/[.?!,]$/.test(w.word) || cur.length >= max) flush();
  }
  flush();
  return chunks;
};

const clean = (w: string) => w.replace(/[.,!?]+$/, '');

type CaptionProps = {
  words: SpokenWord[];
  maxWords?: number;
  style: CSSProperties;
  wordStyle: (active: boolean, spoken: boolean) => CSSProperties;
  /** Hide captions in these windows (seconds), e.g. while a big title owns the frame. */
  hideDuring?: [number, number][];
};

/** One phrase on screen at a time; the word being said is highlighted. */
export const SpokenCaptions = ({ words, maxWords = 3, style, wordStyle, hideDuring = [] }: CaptionProps) => {
  const frame = useCurrentFrame();
  const t = frame / FPS - VOICE_OFFSET_S;
  if (hideDuring.some(([a, b]) => t >= a && t < b)) return null;
  const chunks = chunkWords(words, maxWords);
  const idx = chunks.findIndex((c, i) => t >= c.startS && t < (chunks[i + 1]?.startS ?? c.endS + 0.4));
  if (idx < 0) return null;
  return (
    <div style={style}>
      {chunks[idx].words.map((w) => (
        <span key={`${w.word}${w.startS}`} style={wordStyle(t >= w.startS && t < w.endS + 0.05, t >= w.startS)}>
          {clean(w.word)}{' '}
        </span>
      ))}
    </div>
  );
};

/** Start time (s) of the first word matching `re` at or after `fromS`; falls back to `fromS`. */
export const wordAt = (words: SpokenWord[], re: RegExp, fromS = 0): number =>
  words.find((w) => w.startS >= fromS && re.test(w.word))?.startS ?? fromS;
