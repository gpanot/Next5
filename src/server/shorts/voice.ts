// server-only — never import from a 'use client' file.
// Narration: one Gemini 3.8 Flash TTS call per sentence (treg). Each sentence: long pauses trimmed, re-recorded once if
// Gemini drags it out, then sped up on its own to ~160 wpm (capped at 1.4×, where it still sounds natural), then joined.
// Word timings come from Whisper listening to the final voice (wordTiming.ts); syllable spread is the fallback.
// The voice is one of Gemini's prebuilt voices; `direction` goes with every sentence as director's notes. A plain
// "Say in a warm tone:" prefix is read out loud by this model (checked 2026-10-06); the notes block is not.

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { CostMeter } from '../metaAds/cost';
import type { WordTiming } from '../../types/admin/shorts';
import { ffmpeg, pcmSeconds, pcmToWav, wavToPcm, withTempDir } from './ffmpeg';
import { tregJson, withRetry } from './treg';
import { heardWordTimings } from './wordTiming';

/** The voice before per-short voice planning (and the fallback when planning fails). */
export const VOICE = 'Kore';
/**
 * Per-sentence speed-up so every sentence lands at the same pace: voices, delivery notes and even sentences of one take
 * read at very different speeds (one 2026-10-06 Porsche sentence ran 9 words in 12 s raw). 160 wpm keeps a 45-52 word
 * script at ~20 s. Above ~1.4× it sounds rushed (reels-af found 1.5× already too fast).
 */
const TARGET_WPM = 160;
const MIN_TEMPO = 1.0;
const MAX_TEMPO = 1.4;
/** A sentence of 4+ words read slower than this (after pause trimming) is a dragged-out take: record it again once. */
const DRAGGED_WPM = 85;

const tempoFor = (words: number, rawSeconds: number): number =>
  words === 0 ? 1 : Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, rawSeconds / ((words / TARGET_WPM) * 60)));

/** Leading silence cut, and every pause (inside and after the sentence) capped at 0.25 s. */
const TRIM_PAUSES = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04:stop_periods=-1:stop_duration=0.3:stop_threshold=-45dB:stop_silence=0.25';
const TAG = /\[[^\]]*\]/g;

export const stripTags = (text: string): string => text.replace(TAG, ' ').split(/\s+/).filter(Boolean).join(' ');

/** Split on . ! ? only; inline tags stay with the sentence they precede. */
export const splitSentences = (narration: string): string[] => {
  const out: string[] = [];
  let current: string[] = [];
  for (const token of narration.split(/\s+/).filter(Boolean)) {
    current.push(token);
    if (/[.!?]+["'’”]?$/.test(token)) {
      out.push(current.join(' '));
      current = [];
    }
  }
  if (current.length) out.push(current.join(' '));
  return out;
};

const syllables = (word: string): number => {
  const caps = word.replace(/[^A-Z]/g, '');
  if (word === word.toUpperCase() && caps.length >= 2) return caps.length;
  const groups = word.toLowerCase().replace(/[^a-z]/g, '').match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 1);
};

type TtsResponse = {
  candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[];
};

export type VoiceChoice = { voice: string; direction?: string };

const withNotes = (text: string, direction?: string): string =>
  direction ? `### DIRECTOR'S NOTES\nStyle: ${direction}\n### TRANSCRIPT\n${text}` : text;

const speak = async (text: string, { voice, direction }: VoiceChoice, meter: CostMeter): Promise<Buffer> => {
  const { data, costMicros } = await withRetry(() =>
    tregJson<TtsResponse>('google-ai.voice-gen.gemini-3-8-flash-tts', {
      query: { model: 'gemini-3.8-flash-tts' },
      body: {
        contents: [{ parts: [{ text: withNotes(text, direction) }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
      },
      timeoutMs: 90_000,
    }),
  );
  meter.add('Gemini 3.8 Flash TTS (treg)', costMicros);
  const b64 = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
  if (!b64) throw new Error('TTS returned no audio');
  return wavToPcm(Buffer.from(b64, 'base64'));
};

const filterPcm = (pcm: Buffer, filter: string, dir: string, name: string): Promise<Buffer> => {
  const src = path.join(dir, `${name}.wav`);
  const out = path.join(dir, `${name}-out.wav`);
  return writeFile(src, pcmToWav(pcm))
    .then(() => ffmpeg(['-i', src, '-filter:a', filter, '-ac', '1', '-ar', '24000', '-c:a', 'pcm_s16le', out]))
    .then(() => readFile(out))
    .then(wavToPcm);
};

/** Words a number is read as: 113000 → "one hundred thirteen thousand" (4). Rough, on the generous side. */
const numberWords = (n: number): number => {
  if (n < 20) return 1;
  if (n < 100) return n % 10 ? 2 : 1;
  if (n < 1000) return 2 + (n % 100 ? numberWords(n % 100) : 0);
  for (const [size, label] of [[1e9, 1], [1e6, 1], [1e3, 1]] as const) {
    if (n >= size) return numberWords(Math.floor(n / size)) + label + (n % size ? numberWords(n % size) : 0);
  }
  return 1;
};

/** One script token as words read aloud: "$135,500" → 7 (+1 for "dollars"), "40%" → 2, "2026" → 2, others 1. */
const tokenWords = (token: string): number => {
  const digits = token.replace(/[^0-9.]/g, '');
  const n = Math.round(Number.parseFloat(digits));
  if (!digits || !Number.isFinite(n)) return 1;
  const year = /^(19|20)\d\d$/.test(digits) ? 2 : numberWords(n);
  return year + (/[$%€£]/.test(token) ? 1 : 0);
};

/** How many words the voice actually says (numbers and prices read in full), which is what pace is measured on. */
const spokenCount = (text: string) => stripTags(text).split(' ').filter(Boolean).reduce((sum, t) => sum + tokenWords(t), 0);
const wpmOf = (words: number, pcm: Buffer) => (words / Math.max(0.1, pcmSeconds(pcm))) * 60;

/** One sentence recorded, its pauses trimmed; recorded once more when Gemini dragged it out (the faster take wins). */
const recordSentence = async (text: string, choice: VoiceChoice, meter: CostMeter, dir: string, idx: number): Promise<Buffer> => {
  const words = spokenCount(text);
  const take = async (n: number) => filterPcm(await speak(text, choice, meter), TRIM_PAUSES, dir, `s${idx}-t${n}`);
  const first = await take(1);
  if (words < 4 || wpmOf(words, first) >= DRAGGED_WPM) return first;
  const second = await take(2);
  return wpmOf(words, second) > wpmOf(words, first) ? second : first;
};

/** The sentence at the target pace. */
const paced = (pcm: Buffer, words: number, dir: string, idx: number): Promise<Buffer> => {
  const tempo = tempoFor(words, pcmSeconds(pcm));
  return tempo === 1 ? Promise.resolve(pcm) : filterPcm(pcm, `atempo=${tempo.toFixed(3)}`, dir, `s${idx}-paced`);
};

const timeWords = (sentences: string[], pcms: Buffer[]): WordTiming[] => {
  const words: WordTiming[] = [];
  let cursor = 0;
  sentences.forEach((sentence, i) => {
    const span = pcmSeconds(pcms[i]);
    const spoken = stripTags(sentence).split(' ').filter(Boolean);
    const weights = spoken.map(syllables);
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    let t = cursor;
    spoken.forEach((word, w) => {
      const d = (span * weights[w]) / total;
      words.push({ word, startS: t, endS: t + d });
      t += d;
    });
    cursor += span;
  });
  return words;
};

/** The whole narration as one WAV, its length and per-word timings. */
export const synthesize = async (
  narration: string,
  choice: VoiceChoice,
  meter: CostMeter,
): Promise<{ wav: Buffer; durationS: number; words: WordTiming[]; sentences: number }> => {
  const sentences = splitSentences(narration);
  const fast = await withTempDir((dir) => Promise.all(sentences.map(async (s, i) =>
    paced(await recordSentence(s, choice, meter, dir, i), spokenCount(s), dir, i))));
  const pcm = Buffer.concat(fast);
  const wav = pcmToWav(pcm);
  const durationS = pcmSeconds(pcm);
  const heard = await heardWordTimings(wav, stripTags(narration).split(' ').filter(Boolean), durationS, meter);
  return { wav, durationS, words: heard ?? timeWords(sentences, fast), sentences: sentences.length };
};

/** One line read at the narration's speed: the sample a voice option is judged by. */
export const sampleLine = async (text: string, choice: VoiceChoice, meter: CostMeter): Promise<Buffer> => {
  const fast = await withTempDir(async (dir) => paced(await filterPcm(await speak(text, choice, meter), TRIM_PAUSES, dir, 's0'), spokenCount(text), dir, 0));
  return pcmToWav(fast);
};
