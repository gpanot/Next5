// Merge and split from the recording step: one take for 2-3 sentences in a row, or back to one take per sentence.
// Unlike the cut editor (src/server/copyViral/shots.ts applyShotEdits), lines, on-screen text and the reading are kept.
// Takes of the changed shots are dropped: the caller deletes their files. Pure, so it is unit tested.

import type { CopyViralShot } from '../../types/admin/copyViral';
import { MIN_SHOT_MS } from './shots';

export type ShotChange = { shots: CopyViralShot[]; droppedClips: string[] };

const renumber = (shots: CopyViralShot[]) => shots.map((s, index) => ({ ...s, index }));

const joinText = (a: string, b: string, sep: string) => [a.trim(), b.trim()].filter(Boolean).join(sep);

/** Shot `i` and the next one become one shot: texts joined, the first one's reading and background kept. */
export const joinWithNext = (shots: CopyViralShot[], i: number): ShotChange => {
  const a = shots[i], b = shots[i + 1];
  if (!a || !b) throw new Error('No shot after this one');
  const merged: CopyViralShot = {
    ...a,
    endMs: b.endMs,
    targetMs: a.targetMs + b.targetMs,
    frame: null,
    transcript: joinText(a.transcript, b.transcript, ' '),
    myLine: joinText(a.myLine, b.myLine, ' '),
    myOnScreenText: joinText(a.myOnScreenText, b.myOnScreenText, '\n'),
    clip: null,
  };
  return {
    shots: renumber([...shots.slice(0, i), merged, ...shots.slice(i + 2)]),
    droppedClips: [a.clip?.file, b.clip?.file].filter((f): f is string => !!f),
  };
};

/** Where to split a shot: the sentence end nearest its middle, else its middle. */
export const splitPointMs = (shot: Pick<CopyViralShot, 'startMs' | 'endMs'>, breaks: number[]) => {
  const middle = Math.round((shot.startMs + shot.endMs) / 2);
  const inside = breaks.filter((b) => b - shot.startMs >= MIN_SHOT_MS && shot.endMs - b >= MIN_SHOT_MS);
  return inside.reduce((best, b) => (Math.abs(b - middle) < Math.abs(best - middle) ? b : best), inside[0] ?? middle);
};

/** "One. Two! Three" → ["One.", "Two!", "Three"] */
export const sentencesOf = (text: string) => (text.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g) ?? []).map((s) => s.trim()).filter(Boolean);

/** My line cut in two at `share` of its sentences (at least one each side when it has two or more). */
const splitLine = (line: string, share: number): [string, string] => {
  const parts = sentencesOf(line);
  if (parts.length < 2) return [line, ''];
  const k = Math.min(parts.length - 1, Math.max(1, Math.round(parts.length * share)));
  return [parts.slice(0, k).join(' '), parts.slice(k).join(' ')];
};

/**
 * Splits shot `i` at `atMs`. `said` gives each half its reference words. My line is shared by sentences, the
 * on-screen text stays on the first half, both keep the reading and the background.
 */
export const splitInTwo = (shots: CopyViralShot[], i: number, atMs: number, said: (s: { startMs: number; endMs: number }) => string): ShotChange => {
  const s = shots[i];
  if (!s) throw new Error('No such shot');
  if (atMs - s.startMs < MIN_SHOT_MS || s.endMs - atMs < MIN_SHOT_MS) throw new Error('This shot is too short to split');
  const share = (atMs - s.startMs) / (s.endMs - s.startMs);
  const firstTarget = Math.round(s.targetMs * share);
  const [lineA, lineB] = splitLine(s.myLine, share);
  const a: CopyViralShot = { ...s, endMs: atMs, targetMs: firstTarget, frame: null, transcript: said({ startMs: s.startMs, endMs: atMs }), myLine: lineA, clip: null };
  const b: CopyViralShot = { ...s, startMs: atMs, targetMs: s.targetMs - firstTarget, frame: null, transcript: said({ startMs: atMs, endMs: s.endMs }), myLine: lineB, myOnScreenText: '', clip: null };
  return {
    shots: renumber([...shots.slice(0, i), a, b, ...shots.slice(i + 1)]),
    droppedClips: s.clip ? [s.clip.file] : [],
  };
};
