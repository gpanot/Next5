// server-only — never import from a 'use client' file.
// What is said in the reference, with word times (whisper-1, $0.006/min), split by shot, and where its sentences end.

import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { promisify } from 'util';
import { transcribeWithText } from '../shorts/wordTiming';
import type { CopyViralShot } from '../../types/admin/copyViral';
import { projectFile } from './store';

const execFileAsync = promisify(execFile);

export type HeardWord = { word: string; start: number; end: number };
/** Whisper's punctuated text + its word times (the words carry no punctuation). */
export type Transcript = { text: string; words: HeardWord[] };

const FILE = 'transcript.json';

/** Transcribes the reference and keeps it in transcript.json; empty when the reel has no speech. */
export const transcribeReference = async (id: string, reference: string): Promise<Transcript> => {
  const wavFile = projectFile(id, 'voice.wav');
  await execFileAsync(process.env.FFMPEG_PATH ?? 'ffmpeg', ['-y', '-v', 'error', '-i', projectFile(id, reference), '-vn', '-ac', '1', '-ar', '16000', wavFile], { timeout: 120_000 });
  const transcript = await transcribeWithText(await readFile(wavFile), '');
  await writeFile(projectFile(id, FILE), JSON.stringify(transcript));
  return transcript;
};

/**
 * The saved transcript (the reference never changes), transcribed when missing. Projects from before the punctuated
 * text kept only the words: they are transcribed again once, so their sentences can be found.
 */
export const loadTranscript = async (id: string, reference: string): Promise<Transcript> => {
  const file = projectFile(id, FILE);
  if (existsSync(file)) {
    const saved = JSON.parse(await readFile(file, 'utf8')) as Transcript | HeardWord[];
    if (!Array.isArray(saved) && (saved.text || saved.words.length === 0)) return saved;
  }
  return transcribeReference(id, reference);
};

/** The words whose middle falls inside the shot, joined. */
export const shotTranscript = (words: HeardWord[], shot: Pick<CopyViralShot, 'startMs' | 'endMs'>) =>
  words
    .filter((w) => {
      const mid = ((w.start + w.end) / 2) * 1000;
      return mid >= shot.startMs && mid < shot.endMs;
    })
    .map((w) => w.word.trim())
    .join(' ');

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Where sentences end, in ms: halfway between a sentence's last word and the next word. The punctuated text is walked
 * alongside the words (both in order; a text token that matches no nearby word is skipped). Pure, so it is unit tested.
 */
export const sentenceBreaks = ({ text, words }: Transcript): number[] => {
  const tokens = text.split(/\s+/).filter(Boolean);
  const breaks: number[] = [];
  let wi = 0;
  for (const token of tokens) {
    const t = norm(token);
    if (!t) continue;
    const k = words.slice(wi, wi + 4).findIndex((w) => norm(w.word) === t);
    if (k < 0) continue;
    wi += k + 1;
    const next = words[wi];
    if (/[.!?]["')\]]*$/.test(token) && next) breaks.push(Math.round(((words[wi - 1].end + next.start) / 2) * 1000));
  }
  return breaks;
};
