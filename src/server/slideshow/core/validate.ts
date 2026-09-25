// server-only — never import from a 'use client' file.
// Format validator: given any ShotPlan, returns all Issues.
// Shared across both engines; engines call this plus their own guardrails.

import {
  HOOK_NO_EXCLAMATION,
  INACTION_BRIDGE_PATTERN,
  SHOT_BY_ROLE,
  SHOT_ROLES,
  UGC_HOOK_MAX_WORDS,
} from './format';
import type { Issue, ShotPlan } from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const wordCount = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

// ── Core format validator ─────────────────────────────────────────────────────

/**
 * Validates a ShotPlan against the fixed 7-shot format rules.
 * Returns an array of Issues — empty means the plan is valid.
 *
 * Rules enforced:
 * 1. Exactly 7 roles present, in canonical order.
 * 2. Word limits per shot (hook: 8 on screen / 12 for UGC).
 * 3. No "!" on the hook text.
 * 4. Shot text must be non-empty.
 * 5. Inaction shot must end with a bridge colon ":".
 * 6. No asset with textSafeZone = 'none' (enforced by the library search, core/library.ts).
 */
export function validateShotPlan(plan: ShotPlan): Issue[] {
  const issues: Issue[] = [];

  const orderedShots = [
    plan.hook,
    plan.meat.pain,
    plan.meat.oldWay,
    plan.meat.mechanism,
    plan.meat.proof,
    plan.meat.inaction,
    plan.cta,
  ];

  // ── Rule 1: correct order ────────────────────────────────────────────────
  const actualRoles = orderedShots.map((s) => s.role);
  SHOT_ROLES.forEach((expected, i) => {
    if (actualRoles[i] !== expected) {
      issues.push({
        level: 'error',
        code: 'WRONG_SHOT_ORDER',
        message: `Shot ${i + 1} must be "${expected}", got "${actualRoles[i] ?? 'missing'}"`,
        shotRole: expected,
      });
    }
  });

  // ── Per-shot rules ───────────────────────────────────────────────────────
  orderedShots.forEach((shot) => {
    const def = SHOT_BY_ROLE[shot.role];

    // Rule 4: non-empty
    if (!shot.text.trim()) {
      issues.push({
        level: 'error',
        code: 'EMPTY_SHOT_TEXT',
        message: `Shot "${shot.role}" has empty text.`,
        shotRole: shot.role,
      });
      return; // skip further checks on empty
    }

    // Rule 2: word limit
    const isUgcHook = shot.role === 'hook' && shot.media.kind === 'ugc';
    const limit = isUgcHook ? UGC_HOOK_MAX_WORDS : def.maxWords;
    const words = wordCount(shot.text);
    if (words > limit) {
      issues.push({
        level: 'error',
        code: 'WORD_LIMIT_EXCEEDED',
        message: `Shot "${shot.role}" has ${words} words (limit ${limit}).`,
        shotRole: shot.role,
      });
    }

    // Rule 3: no "!" on hook
    if (HOOK_NO_EXCLAMATION && shot.role === 'hook' && shot.text.includes('!')) {
      issues.push({
        level: 'error',
        code: 'HOOK_EXCLAMATION',
        message: 'Hook text must not contain "!". Remove it.',
        shotRole: 'hook',
      });
    }
  });

  // ── Rule 5: inaction bridge ──────────────────────────────────────────────
  const inactionText = plan.meat.inaction.text.trim();
  if (inactionText && !INACTION_BRIDGE_PATTERN.test(inactionText)) {
    issues.push({
      level: 'warning',
      code: 'MISSING_INACTION_BRIDGE',
      message: 'Inaction shot should end with a colon ":" to bridge into the CTA.',
      shotRole: 'inaction',
    });
  }

  // ── Rule: CTA must not repeat the pain ──────────────────────────────────
  // (overlap check happens in core/meatCheck.ts at generation time)

  return issues;
}

/** Convenience: returns true when there are no error-level issues. */
export function isPlanValid(plan: ShotPlan): boolean {
  return validateShotPlan(plan).every((i) => i.level !== 'error');
}
