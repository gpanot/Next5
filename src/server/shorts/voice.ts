// server-only — never import from a 'use client' file.
// Narration: one Gemini 3.8 Flash TTS call per sentence (treg), sped up to ~175 wpm with ffmpeg atempo, then joined.
// Sentence boundaries are exact on the final audio; words inside a sentence are spread by syllable count. No ASR.
// The voice is one of Gemini's prebuilt voices; `direction` goes with every sentence as director's notes. A plain
// "Say in a warm tone:" prefix is read out loud by this model (checked 2026-10-06); the notes block is not.

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { CostMeter } from '../metaAds/cost';
import type { WordTiming } from '../../types/admin/shorts';
import { ffmpeg, pcmSeconds, pcmToWav, wavToPcm, withTempDir } from './ffmpeg';
import { tregJson, withRetry } from './treg';

/** The voice before per-short voice planning (and the fallback when planning fails). */
export const VOICE = 'Kore';
/**
 * Speed-up so every voice lands at the same pace: voices and delivery notes read at very different natural speeds
 * (131 to 191 wpm after a fixed 1.35×, 2026-10-06). 175 wpm keeps a 55-62 word script at ~20 s.
 */
const TARGET_WPM = 175;
const MIN_TEMPO = 1.1;
const MAX_TEMPO = 1.6;

const tempoFor = (words: number, rawSeconds: number): number =>
  Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, rawSeconds / ((words / TARGET_WPM) * 60)));
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

const speedUp = (pcm: Buffer, tempo: number, dir: string, idx: number): Promise<Buffer> => {
  const src = path.join(dir, `s${idx}.wav`);
  const out = path.join(dir, `s${idx}-fast.wav`);
  return writeFile(src, pcmToWav(pcm))
    .then(() => ffmpeg(['-i', src, '-filter:a', `atempo=${tempo.toFixed(3)}`, '-ac', '1', '-ar', '24000', '-c:a', 'pcm_s16le', out]))
    .then(() => readFile(out))
    .then(wavToPcm);
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
  const raw = await Promise.all(sentences.map((s) => speak(s, choice, meter)));
  const words = stripTags(narration).split(' ').filter(Boolean).length;
  const tempo = tempoFor(words, raw.reduce((sum, pcm) => sum + pcmSeconds(pcm), 0));
  const fast = await withTempDir((dir) => Promise.all(raw.map((pcm, i) => speedUp(pcm, tempo, dir, i))));
  const pcm = Buffer.concat(fast);
  return { wav: pcmToWav(pcm), durationS: pcmSeconds(pcm), words: timeWords(sentences, fast), sentences: sentences.length };
};

/** One line read at the narration's speed: the sample a voice option is judged by. */
export const sampleLine = async (text: string, choice: VoiceChoice, meter: CostMeter): Promise<Buffer> => {
  const pcm = await speak(text, choice, meter);
  const tempo = tempoFor(stripTags(text).split(' ').filter(Boolean).length, pcmSeconds(pcm));
  const [fast] = await withTempDir((dir) => Promise.all([speedUp(pcm, tempo, dir, 0)]));
  return pcmToWav(fast);
};
