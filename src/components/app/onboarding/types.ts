import type { MeDto, ProductLineDto } from '../../../types/business/me';

export type StepProps = {
  product: ProductLineDto;
  me: MeDto;
  /** Marks `step` complete on the server, refreshes `me`, and moves on.
   *  Pass `data` to persist B2B qualification fields alongside the step advance. */
  advance: (step: number, options?: { completed?: boolean; data?: Record<string, unknown> }) => Promise<void>;
};

export const STEP_LABELS = ['Account', 'Your Business', 'About You', 'Start'] as const;

/**
 * Maps each server-side onboarding step (1-indexed) to the visual stepper
 * step that should be highlighted. Server steps 3–6 all map to display step 3
 * ("About You"). Server step 7 (Reviews) has no dedicated stepper slot — we
 * pass `null` so the wizard can hide the back button and leave step 3 completed.
 * Server step 8 maps to display step 4 ("Start").
 */
export const SERVER_TO_DISPLAY_STEP: Record<number, number | null> = {
  1: 1,
  2: 2,
  3: 3,
  4: 3,
  5: 3,
  6: 3,
  7: null, // Reviews: shown inline, not a stepper step
  8: 4,
};

export const stepError = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback;
