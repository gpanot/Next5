// server-only — never import from a 'use client' file.
// Converts a ShotPlan into the SlideshowRenderPayload the blitz-worker expects.
// No browser values: durations are fixed, trims come from the plan, text positions from textZone.

import { SHOT_BY_ROLE } from './format';
import type { Shot, ShotPlan, SlideshowRenderPayload } from './types';

// ── Shot ordering ─────────────────────────────────────────────────────────────

/** Extract all 7 shots from a ShotPlan in canonical order. */
function orderedShots(plan: ShotPlan): Shot[] {
  return [
    plan.hook,
    plan.meat.pain,
    plan.meat.oldWay,
    plan.meat.mechanism,
    plan.meat.proof,
    plan.meat.inaction,
    plan.cta,
  ];
}

// ── Render payload builder ────────────────────────────────────────────────────

/**
 * Build the SlideshowRenderPayload from a kept/edited ShotPlan.
 *
 * Rules:
 * - Durations are read from the canonical SHOT_BY_ROLE table — never from client state.
 * - Trims come from the media's trimStart / trimEnd (set during asset selection).
 * - Text position comes from textZone.
 * - Audio startAt comes from the plan's audio object.
 */
export function buildRenderPayload(plan: ShotPlan): SlideshowRenderPayload {
  const shots = orderedShots(plan);

  return {
    compositionId: 'Slideshow7',
    fps: 30,
    shots: shots.map((shot) => ({
      role: shot.role,
      durationSec: SHOT_BY_ROLE[shot.role].durationSec,
      media: shot.media,
      text: shot.text,
      textZone: shot.textZone,
    })),
    audio: plan.audio
      ? { key: plan.audio.key, startAt: plan.audio.startAt }
      : null,
    style: plan.style,
  };
}
