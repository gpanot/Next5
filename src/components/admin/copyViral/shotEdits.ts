// Shot list edits made in the tab before saving: merge, split, move a boundary, set a target. Pure, unit tested.
// The server checks the result again (src/server/copyViral/shots.ts).

import type { CopyViralShotEdit } from '../../../types/admin/copyViral';

export const MIN_SHOT_MS = 400;

const length = (s: CopyViralShotEdit) => s.endMs - s.startMs;

/** Shot `i` and the one after it become one shot; its target is the sum of both. */
export const mergeWithNext = (shots: CopyViralShotEdit[], i: number): CopyViralShotEdit[] => {
  if (i < 0 || i >= shots.length - 1) return shots;
  const a = shots[i], b = shots[i + 1];
  return [...shots.slice(0, i), { startMs: a.startMs, endMs: b.endMs, targetMs: a.targetMs + b.targetMs }, ...shots.slice(i + 2)];
};

/** Splits shot `i` at `atMs` (its middle when `atMs` is outside it or too close to an edge). Targets follow the split. */
export const splitShot = (shots: CopyViralShotEdit[], i: number, atMs?: number): CopyViralShotEdit[] => {
  const s = shots[i];
  if (!s || length(s) < 2 * MIN_SHOT_MS) return shots;
  const inside = atMs !== undefined && atMs - s.startMs >= MIN_SHOT_MS && s.endMs - atMs >= MIN_SHOT_MS;
  const at = Math.round(inside ? atMs : (s.startMs + s.endMs) / 2);
  const share = (at - s.startMs) / length(s);
  const first = Math.round(s.targetMs * share);
  return [...shots.slice(0, i), { startMs: s.startMs, endMs: at, targetMs: first }, { startMs: at, endMs: s.endMs, targetMs: s.targetMs - first }, ...shots.slice(i + 1)];
};

/**
 * Moves the cut between shot `i` and shot `i + 1` by `deltaMs`, keeping both at least MIN_SHOT_MS long.
 * A target that matched the old length follows the new one; a target set by hand stays.
 */
export const moveCut = (shots: CopyViralShotEdit[], i: number, deltaMs: number): CopyViralShotEdit[] => {
  const a = shots[i], b = shots[i + 1];
  if (!a || !b) return shots;
  const at = Math.min(Math.max(a.endMs + deltaMs, a.startMs + MIN_SHOT_MS), b.endMs - MIN_SHOT_MS);
  if (at === a.endMs) return shots;
  const na = { ...a, endMs: at, targetMs: a.targetMs === length(a) ? at - a.startMs : a.targetMs };
  const nb = { ...b, startMs: at, targetMs: b.targetMs === length(b) ? b.endMs - at : b.targetMs };
  return [...shots.slice(0, i), na, nb, ...shots.slice(i + 2)];
};

export const setTarget = (shots: CopyViralShotEdit[], i: number, targetMs: number): CopyViralShotEdit[] =>
  shots.map((s, j) => (j === i ? { ...s, targetMs: Math.max(100, Math.round(targetMs)) } : s));

export const sameShots = (a: CopyViralShotEdit[], b: CopyViralShotEdit[]) =>
  a.length === b.length && a.every((s, i) => s.startMs === b[i].startMs && s.endMs === b[i].endMs && s.targetMs === b[i].targetMs);
