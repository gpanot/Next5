/**
 * "Perfect Ads" scoring. Client-safe: the admin UI shows these weights next to every score.
 *
 * Principle: the market picks winners, the rubric explains them.
 * - Winner score (0-100) is computed from what advertisers DO with their money, read from the Meta Ad Library:
 *   an ad that outlives the advertiser's usual kill window and gets duplicated is one they keep paying for.
 * - Craft score (0-100) is the Hormozi copy rubric plus a vision read of the image. It never decides a pick; it ranks
 *   ads with equal evidence and tells the playbook what to copy.
 *
 * Every run stores SCORING_VERSION, so the feedback loop (later) can recalibrate these numbers against real results.
 * Changing a weight means bumping the version.
 */

export const SCORING_VERSION = 'v2.1-2026-09-28';

export const WINNER_WEIGHTS = {
  /** Outlived the advertiser's own kill window (age ÷ 2× median life of their stopped ads). */
  survival: 40,
  /** Duplicated: copies of the same creative the advertiser runs, or Meta's collation count. */
  scale: 30,
  /** Absolute days live, capped. */
  age: 20,
  /** Position in the advertiser's impression-sorted ad list (first = most reach). */
  reach: 10,
} as const;

export const WINNER_RULES = {
  /** Days at which the age component maxes out. */
  ageCapDays: 90,
  /** Copies at which the scale component maxes out (1 copy = 0). */
  scaleCapCopies: 5,
  /** Kill window used when an advertiser has fewer than MIN_STOPPED_FOR_BASELINE stopped ads to measure. */
  defaultKillDays: 14,
  minStoppedForBaseline: 3,
  /** A proven winner is still running, at least this old, and either outlived the kill window or was duplicated. */
  provenMinDays: 14,
  /** Without a measured kill window, age alone must be this high to count (copies still qualify on their own). */
  provenMinDaysNoBaseline: 60,
  provenMinCopies: 3,
  /** A stopped ad cannot score above this: the advertiser turned it off. */
  stoppedCap: 30,
} as const;

/** Craft = copy rubric and image read, when the ad has an image that was read. */
export const CRAFT_WEIGHTS = { copy: 60, visual: 40 } as const;

/** Two gradings per ad; a criterion whose two scores differ by more than this is unstable and scored at the lower one. */
export const MAX_GRADE_SPREAD = 1;
