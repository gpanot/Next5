// server-only — never import from a 'use client' file.
// Fixed format definition: 7 shots, 26 seconds.
// This file is the single source of truth for shot order, durations, and word limits.

import type { ShotRole } from './types';

// ── Shot definitions ──────────────────────────────────────────────────────────

export type ShotDef = {
  role: ShotRole;
  /** Display label shown to the user. */
  label: string;
  /** Fixed duration in seconds. */
  durationSec: number;
  /** Maximum words allowed on screen. */
  maxWords: number;
  /** Which descriptor slot column this shot maps to for asset selection. */
  slotColumn: 'slot_hook' | 'slot_problem' | 'slot_payoff' | 'slot_proof' | 'slot_cta';
  /**
   * Block grouping: hook | meat | cta.
   * The hook and CTA are 3 s; the 5 meat shots are 4 s each.
   */
  block: 'hook' | 'meat' | 'cta';
};

/**
 * The canonical 7-shot sequence.
 * Total: 3 + 4 + 4 + 4 + 4 + 4 + 3 = 26 s.
 * The 4 s of margin under 30 s is reserved for an optional end hold on the CTA.
 */
export const SHOTS: readonly ShotDef[] = [
  {
    role: 'hook',
    label: 'Hook',
    durationSec: 3,
    maxWords: 8,     // 12 if spoken in a UGC clip — enforced by the validator per media kind
    slotColumn: 'slot_hook',
    block: 'hook',
  },
  {
    role: 'pain',
    label: 'Pain',
    durationSec: 4,
    maxWords: 10,
    slotColumn: 'slot_problem',
    block: 'meat',
  },
  {
    role: 'old_way',
    label: 'Old Way',
    durationSec: 4,
    maxWords: 10,
    slotColumn: 'slot_problem',
    block: 'meat',
  },
  {
    role: 'mechanism',
    label: 'Mechanism',
    durationSec: 4,
    maxWords: 10,
    slotColumn: 'slot_payoff',
    block: 'meat',
  },
  {
    role: 'proof',
    label: 'Proof',
    durationSec: 4,
    maxWords: 10,
    slotColumn: 'slot_proof',
    block: 'meat',
  },
  {
    role: 'inaction',
    label: 'Cost of Inaction',
    durationSec: 4,
    maxWords: 10,
    slotColumn: 'slot_problem',
    block: 'meat',
  },
  {
    role: 'cta',
    label: 'CTA',
    durationSec: 3,
    maxWords: 7,
    slotColumn: 'slot_cta',
    block: 'cta',
  },
] as const;

/** Total video duration in seconds. */
export const TOTAL_DURATION_SEC = SHOTS.reduce((acc, s) => acc + s.durationSec, 0); // 26

/** Segmented progress bar proportions (0–1) sized to durations. Used by SwipeCard. */
export const SHOT_PROGRESS_WEIGHTS = SHOTS.map((s) => s.durationSec / TOTAL_DURATION_SEC);

/** The ordered shot roles in canonical sequence. */
export const SHOT_ROLES = SHOTS.map((s) => s.role) as ShotRole[];

/** Lookup by role. */
export const SHOT_BY_ROLE = Object.fromEntries(SHOTS.map((s) => [s.role, s])) as Record<ShotRole, ShotDef>;

// ── Format rules (narrative) ──────────────────────────────────────────────────

/**
 * Word limit for a hook delivered in a UGC clip (spoken, not just on screen).
 * The validator applies this looser limit when shot.media.kind === 'ugc'.
 */
export const UGC_HOOK_MAX_WORDS = 12;

/**
 * The inaction shot must end with a bridge phrase (a colon ":" followed by nothing,
 * or a sentence ending in ":") that the CTA closes.
 * Validated by checking the last character of the trimmed text is ":".
 */
export const INACTION_BRIDGE_PATTERN = /:$/;

/**
 * Hard limit: no "!" on the hook text.
 */
export const HOOK_NO_EXCLAMATION = true;
