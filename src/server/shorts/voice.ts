// server-only — never import from a 'use client' file.
// Narration: one Gemini 3.8 Flash TTS call per sentence (treg), each sped up 1.35× with ffmpeg atempo, then joined.
// Sentence boundaries are exact on the final audio; words inside a sentence are spread by syllable count. No ASR.

import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { CostMeter } from '../metaAds/cost';
import type { WordTiming } from '../../types/admin/shorts';
import { ffmpeg, pcmSeconds, pcmToWav, wavToPcm, withTempDir } from './ffmpeg';
import { tregJson, withRetry } from './treg';

export const VOICE = 'Kore';
/** Gemini reads at ~110-130 WPM; 1.35× lands a 55-60 word script at ~20-25 s without sounding rushed. */
const SPEED = 1.35;
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

const speak = async (text: string, meter: CostMeter): Promise<Buffer> => {
  const { data, costMicros } = await withRetry(() =>
    tregJson<TtsResponse>('google-ai.voice-gen.gemini-3-8-flash-tts', {
      query: { model: 'gemini-3.8-flash-tts' },
      body: {
        contents: [{ parts: [{ text }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
      },
      timeoutMs: 90_000,
    }),
  );
  meter.add('Gemini 3.8 Flash TTS (treg)', costMicros);
  const b64 = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
  if (!b64) throw new Error('TTS returned no audio');
  return wavToPcm(Buffer.from(b64, 'base64'));
};

const speedUp = (pcm: Buffer, dir: string, idx: number): Promise<Buffer> => {
  const src = path.join(dir, `s${idx}.wav`);
  const out = path.join(dir, `s${idx}-fast.wav`);
  return writeFile(src, pcmToWav(pcm))
    .then(() => ffmpeg(['-i', src, '-filter:a', `atempo=${SPEED}`, '-ac', '1', '-ar', '24000', '-c:a', 'pcm_s16le', out]))
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
export const synthesize = async (narration: string, meter: CostMeter): Promise<{ wav: Buffer; durationS: number; words: WordTiming[]; sentences: number }> => {
  const sentences = splitSentences(narration);
  const raw = await Promise.all(sentences.map((s) => speak(s, meter)));
  const fast = await withTempDir((dir) => Promise.all(raw.map((pcm, i) => speedUp(pcm, dir, i))));
  const pcm = Buffer.concat(fast);
  return { wav: pcmToWav(pcm), durationS: pcmSeconds(pcm), words: timeWords(sentences, fast), sentences: sentences.length };
};
