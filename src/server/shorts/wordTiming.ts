// server-only — never import from a 'use client' file.
// Real word timings for the narration: Whisper (word timestamps) listens to the final voice, then each script word is
// matched to what Whisper heard, so captions and cuts follow what is actually said, pauses included. Script words
// Whisper missed get times between their matched neighbours. The words stay the script's (spelling, punctuation).

import type { CostMeter } from '../metaAds/cost';
import type { WordTiming } from '../../types/admin/shorts';

/** whisper-1: $0.006 per minute of audio. */
export const WHISPER_USD_PER_MIN = 0.006;

type Heard = { word: string; start: number; end: number };

/** Lowercase letters and digits only: "$135,500." → "135500", "Porsche's" → "porsches". */
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');

/** What Whisper heard, with word timestamps. `hint` (the script) steers names, numbers and prices. */
export async function transcribe(wav: Buffer, hint: string): Promise<Heard[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const form = new FormData();
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('language', 'en');
  form.append('prompt', hint.slice(0, 800));
  form.append('file', new Blob([new Uint8Array(wav)], { type: 'audio/wav' }), 'narration.wav');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Whisper ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { words?: Heard[] };
  return data.words ?? [];
}

/** Longest common subsequence of normalized words: script index → heard index, for the words both share. */
function match(script: string[], heard: string[]): Map<number, number> {
  const n = script.length;
  const m = heard.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = script[i] && script[i] === heard[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const pairs = new Map<number, number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (script[i] && script[i] === heard[j]) pairs.set(i++, j++);
    else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++;
    else j++;
  }
  return pairs;
}

/**
 * Script words timed on the audio. Matched words take Whisper's times; a run of unmatched words shares the gap between
 * its matched neighbours evenly. Null when Whisper heard too little of the script to trust (under 60% matched).
 */
export function alignWords(scriptWords: string[], heard: Heard[], audioS: number): WordTiming[] | null {
  const pairs = match(scriptWords.map(norm), heard.map((h) => norm(h.word)));
  if (scriptWords.length === 0 || pairs.size / scriptWords.length < 0.6) return null;
  const out: WordTiming[] = [];
  let i = 0;
  while (i < scriptWords.length) {
    const j = pairs.get(i);
    if (j !== undefined) {
      const h = heard[j]!;
      out.push({ word: scriptWords[i]!, startS: h.start, endS: Math.max(h.end, h.start + 0.05) });
      i++;
      continue;
    }
    // A run of unmatched words: spread between the previous word's end and the next matched word's start.
    let k = i;
    while (k < scriptWords.length && !pairs.has(k)) k++;
    const from = out.length ? out[out.length - 1]!.endS : 0;
    const to = k < scriptWords.length ? heard[pairs.get(k)!]!.start : audioS;
    const step = Math.max(0, to - from) / (k - i);
    for (let w = i; w < k; w++) out.push({ word: scriptWords[w]!, startS: from + step * (w - i), endS: from + step * (w - i + 1) });
    i = k;
  }
  // Keep times in order and inside the audio.
  let last = 0;
  return out.map((w) => {
    const startS = Math.min(audioS, Math.max(last, w.startS));
    const endS = Math.min(audioS, Math.max(startS + 0.01, w.endS));
    last = startS;
    return { ...w, startS, endS };
  });
}

/** Word timings heard on the final voice, or null (Whisper failed or did not match) so the caller keeps its estimate. */
export async function heardWordTimings(wav: Buffer, scriptWords: string[], audioS: number, meter: CostMeter): Promise<WordTiming[] | null> {
  try {
    const heard = await transcribe(wav, scriptWords.join(' '));
    meter.add('Word timing (Whisper)', Math.round((audioS / 60) * WHISPER_USD_PER_MIN * 1_000_000));
    const words = alignWords(scriptWords, heard, audioS);
    if (!words) console.warn('[shorts] Whisper matched under 60% of the script; keeping syllable timing');
    return words;
  } catch (err) {
    console.warn('[shorts] word timing failed; keeping syllable timing:', err instanceof Error ? err.message : err);
    return null;
  }
}

const NUMBER_WORDS = /^(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|percent|dollars?|k)$/;

/**
 * Words the voice said that are not in the script: a delivery tag read out loud ("Confident, contact…") or the
 * director's notes ("briskly and confidently") on 2026-10-08. Numbers (written "5", heard "five") and brand names split
 * by Whisper ("Goji Berry" for "Gojiberry") are not counted.
 */
export function extraWords(scriptText: string, heard: Heard[]): string[] {
  const scriptWords = scriptText.split(/\s+/).filter(Boolean).map(norm);
  const heardWords = heard.map((h) => norm(h.word));
  const matched = new Set(match(scriptWords, heardWords).values());
  const joined = scriptWords.join('');
  return heardWords.filter((w, j) => !matched.has(j) && w.length >= 3 && !/^\d+$/.test(w) && !NUMBER_WORDS.test(w) && !joined.includes(w));
}
