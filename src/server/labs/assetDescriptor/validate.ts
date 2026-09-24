/**
 * src/server/labs/assetDescriptor/validate.ts
 *
 * Validation and timestamp clamping for model-returned descriptors.
 *
 * Design rules:
 *  - Timestamp validation only targets LLM-returned fields (timeline, peakAt,
 *    bestTrim, dropAt, bestStart). ffmpeg-measured scene cuts are never re-validated.
 *  - Numeric scores (slotScores.*, nicheScores.*, energyLevel) must be [0,1].
 *    Out-of-range → validation error → repair call. No silent clamping.
 *  - Timestamps are clamped to [0, durationSec] BEFORE validation so minor
 *    floating-point overshoot doesn't cause spurious failures.
 */

import type { VideoDescriptor, MusicDescriptor } from './types';

const TOLERANCE = 0.2; // seconds of float slop we forgive at boundaries

// ── Helpers ───────────────────────────────────────────────────────────────────

function inRange01(v: unknown, label: string, errs: string[]): void {
  if (typeof v !== 'number' || v < 0 || v > 1) {
    errs.push(`${label}=${v} out of [0, 1]`);
  }
}

function okTime(v: number, dur: number, label: string, errs: string[]): void {
  if (typeof v !== 'number' || v < -TOLERANCE || v > dur + TOLERANCE) {
    errs.push(`${label}=${v} out of [0, ${dur.toFixed(2)}]`);
  }
}

// ── Timestamp clamping ────────────────────────────────────────────────────────

const clampT = (v: number, max: number): number => Math.min(Math.max(v ?? 0, 0), max);

export function clampVideo(d: VideoDescriptor, dur: number): VideoDescriptor {
  return {
    ...d,
    peakAt:   clampT(d.peakAt, dur),
    bestTrim: {
      start: clampT(d.bestTrim?.start ?? 0, dur),
      end:   clampT(d.bestTrim?.end   ?? dur, dur),
    },
    timeline: (d.timeline ?? []).map(s => ({
      ...s,
      start: clampT(s.start, dur),
      end:   clampT(s.end,   dur),
    })),
  };
}

export function clampMusic(d: MusicDescriptor, dur: number): MusicDescriptor {
  return {
    ...d,
    dropAt:    d.dropAt !== null ? clampT(d.dropAt ?? 0, dur) : null,
    bestStart: clampT(d.bestStart ?? 0, Math.max(0, dur - 12)),
    sections:  (d.sections ?? []).map(s => ({
      ...s,
      start: clampT(s.start, dur),
      end:   clampT(s.end,   dur),
    })),
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateVideo(d: VideoDescriptor, dur: number): string[] {
  const errs: string[] = [];

  d.timeline?.forEach((seg, i) => {
    okTime(seg.start, dur, `timeline[${i}].start`, errs);
    okTime(seg.end,   dur, `timeline[${i}].end`,   errs);
  });
  okTime(d.peakAt, dur, 'peakAt', errs);

  if (d.bestTrim) {
    okTime(d.bestTrim.start, dur, 'bestTrim.start', errs);
    okTime(d.bestTrim.end,   dur, 'bestTrim.end',   errs);
    const trimLen = (d.bestTrim.end ?? 0) - (d.bestTrim.start ?? 0);
    const minLen  = Math.min(1.5, dur);
    if (trimLen < minLen - TOLERANCE)
      errs.push(`bestTrim too short: ${trimLen.toFixed(2)}s (min ${minLen}s)`);
    if (trimLen > 6 + TOLERANCE)
      errs.push(`bestTrim too long: ${trimLen.toFixed(2)}s (max 6s)`);
    if (
      d.peakAt < (d.bestTrim.start ?? 0) - TOLERANCE ||
      d.peakAt > (d.bestTrim.end   ?? dur) + TOLERANCE
    ) {
      errs.push(`peakAt=${d.peakAt} not inside bestTrim [${d.bestTrim.start}, ${d.bestTrim.end}]`);
    }
  }

  if (!['none', 'low', 'high'].includes(d.rightsRisk))
    errs.push(`bad rightsRisk: ${d.rightsRisk}`);
  if (!['slow', 'medium', 'fast'].includes(d.pacing))
    errs.push(`bad pacing: ${d.pacing}`);

  // Scores must be [0, 1] — fail + repair, no clamping
  inRange01(d.energyLevel, 'energyLevel', errs);
  for (const [k, v] of Object.entries(d.slotScores ?? {}))  inRange01(v, `slotScores.${k}`, errs);
  for (const [k, v] of Object.entries(d.nicheScores ?? {})) inRange01(v, `nicheScores.${k}`, errs);

  // Slot scores must be differentiated
  const scores = Object.values(d.slotScores ?? {});
  if (scores.length === 5) {
    const spread = Math.max(...scores) - Math.min(...scores);
    if (spread < 0.3)
      errs.push(`slotScores flat (spread=${spread.toFixed(2)} < 0.3) — rank roles first`);
  }

  return errs;
}

export function validateMusic(
  d: MusicDescriptor,
  dur: number,
  /** True when the loudness curve was omitted (flat or no audio). */
  loudnessWasOmitted: boolean,
): string[] {
  const errs: string[] = [];

  const okMaybeTime = (v: number | null | undefined, label: string) => {
    if (v === null || v === undefined) return; // nullable OK
    if (typeof v !== 'number' || v < -TOLERANCE || v > dur + TOLERANCE)
      errs.push(`${label}=${v} out of [0, ${dur.toFixed(2)}]`);
  };

  d.sections?.forEach((s, i) => {
    okMaybeTime(s.start, `sections[${i}].start`);
    okMaybeTime(s.end,   `sections[${i}].end`);
  });
  okMaybeTime(d.dropAt,    'dropAt');   // null is valid
  okMaybeTime(d.bestStart, 'bestStart');

  if (!['none', 'low', 'high'].includes(d.rightsRisk))
    errs.push(`bad rightsRisk: ${d.rightsRisk}`);

  inRange01(d.energyLevel, 'energyLevel', errs);
  for (const [k, v] of Object.entries(d.nicheScores ?? {})) inRange01(v, `nicheScores.${k}`, errs);

  // Require ≥ 2 sections for tracks > 20 s when the loudness curve was sent
  if (dur > 20 && !loudnessWasOmitted && (d.sections?.length ?? 0) < 2) {
    errs.push(
      `only ${d.sections?.length ?? 0} section(s) for a ${dur.toFixed(0)}s track with loudness data — need ≥ 2`,
    );
  }

  return errs;
}
