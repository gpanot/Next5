// Shot boundaries for Copy Viral Post: scene cuts in, an ordered list of shots out. Pure, so it is unit tested.

import type { CopyViralShot, CopyViralShotEdit } from '../../types/admin/copyViral';

/** A shot with nothing read, written or recorded yet. */
export const emptyShot = (index: number, startMs: number, endMs: number, targetMs = endMs - startMs, sequence = index): CopyViralShot => ({
  index, sequence, startMs, endMs, targetMs, frame: null, transcript: '', reading: null, myLine: '', myOnScreenText: '', clip: null, background: null, backgroundText: '',
});

/** Cuts closer than this to each other (or to the ends) are flashes, not shots. */
export const MIN_SHOT_MS = 400;

/** Cut times (ms) into contiguous shots covering the whole video; cuts too close to another or to an end are dropped. */
export const boundsToShots = (cutsMs: number[], durationMs: number): CopyViralShot[] => {
  const bounds = [0];
  for (const ms of [...cutsMs].sort((a, b) => a - b)) {
    if (ms - bounds[bounds.length - 1] >= MIN_SHOT_MS && durationMs - ms >= MIN_SHOT_MS) bounds.push(ms);
  }
  bounds.push(durationMs);
  return bounds.slice(0, -1).map((startMs, index) => emptyShot(index, startMs, bounds[index + 1]));
};

/** Scene-cut times (seconds, as ffmpeg prints them) into shots. */
export const cutsToShots = (cutsSec: number[], durationMs: number): CopyViralShot[] =>
  boundsToShots(cutsSec.map((s) => Math.round(s * 1000)), durationMs);

/** A picture cut moves to a sentence end at most this far away; farther (no speech around) it stays. */
const MAX_SNAP_MS = 5000;
/** A shot by sentences holds 1 or 2 sentences and, past one sentence, at most this long. */
const MAX_SENTENCE_SHOT_MS = 8000;

/** Cuts between whole sentences inside one shot [from, to]: 1 or 2 sentences a shot, about 8 s at most. */
const splitBySentences = (from: number, to: number, breaks: number[]): number[] => {
  const ends = breaks.filter((b) => b > from + MIN_SHOT_MS && b < to - MIN_SHOT_MS);
  const cuts: number[] = [];
  let start = from;
  let count = 0;
  ends.forEach((end, i) => {
    count += 1;
    const next = ends[i + 1] ?? to;
    if (count >= 2 || next - start > MAX_SENTENCE_SHOT_MS) {
      cuts.push(end);
      start = end;
      count = 0;
    }
  });
  return cuts;
};

/**
 * Shots you can record one at a time: each picture cut moves to the nearest sentence end (the picture runs a little
 * longer or shorter so the sentence is whole), then a long shot is split into shots of 1 or 2 sentences.
 * `breaks` = sentence ends in ms. Without speech the picture cuts stay as they are.
 */
export const sentenceShots = (cutsSec: number[], breaks: number[], durationMs: number): CopyViralShot[] => {
  if (breaks.length === 0) return cutsToShots(cutsSec, durationMs);
  const snapped = cutsSec.map((s) => {
    const ms = Math.round(s * 1000);
    const near = breaks.reduce((best, b) => (Math.abs(b - ms) < Math.abs(best - ms) ? b : best), breaks[0]);
    return Math.abs(near - ms) <= MAX_SNAP_MS ? near : ms;
  });
  const scenes = boundsToShots(snapped, durationMs);
  const cuts = scenes.flatMap((s, i) => [...(i > 0 ? [s.startMs] : []), ...splitBySentences(s.startMs, s.endMs, breaks)]);
  // each shot keeps the picture scene it comes from
  return boundsToShots(cuts, durationMs).map((s) => ({ ...s, sequence: scenes.findIndex((sc) => s.startMs >= sc.startMs && s.startMs < sc.endMs) }));
};

/** Middle of the shot, where its still is taken. */
export const frameTimeMs = (shot: Pick<CopyViralShot, 'startMs' | 'endMs'>) => Math.round((shot.startMs + shot.endMs) / 2);

/**
 * Checks an edited shot list from the editor: in order, contiguous, from 0 to the end of the video, none too short.
 * Returns the shots renumbered. A shot whose boundaries did not move keeps its still, reading, lines and clip.
 */
export const applyShotEdits = (edits: CopyViralShotEdit[], durationMs: number, previous: CopyViralShot[]): CopyViralShot[] => {
  if (edits.length === 0) throw new Error('At least one shot is needed');
  if (edits[0].startMs !== 0) throw new Error('The first shot must start at 0');
  if (edits[edits.length - 1].endMs !== durationMs) throw new Error('The last shot must end at the end of the video');
  return edits.map((e, index) => {
    if (index > 0 && e.startMs !== edits[index - 1].endMs) throw new Error(`Shot ${index + 1} must start where shot ${index} ends`);
    if (e.endMs - e.startMs < MIN_SHOT_MS) throw new Error(`Shot ${index + 1} is shorter than ${MIN_SHOT_MS} ms`);
    if (!(e.targetMs > 0)) throw new Error(`Shot ${index + 1} needs a target duration`);
    const same = previous.find((p) => p.startMs === e.startMs && p.endMs === e.endMs);
    // a new shot belongs to the sequence its start was in
    const sequence = previous.find((p) => e.startMs >= p.startMs && e.startMs < p.endMs)?.sequence ?? index;
    const base = same ?? emptyShot(index, e.startMs, e.endMs, e.targetMs, sequence);
    return { ...base, index, targetMs: Math.round(e.targetMs) };
  });
};
