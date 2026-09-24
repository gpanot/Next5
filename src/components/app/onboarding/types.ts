import type { MeDto, ProductLineDto } from '../../../types/business/me';

export type StepProps = {
  product: ProductLineDto;
  me: MeDto;
  /** Marks `step` complete on the server, refreshes `me`, and moves on.
   *  Pass `data` to persist B2B qualification fields alongside the step advance. */
  advance: (step: number, options?: { completed?: boolean; data?: Record<string, unknown> }) => Promise<void>;
};

export const STEP_LABELS = ['Account', 'Your Business', 'Team', 'Role', 'Goals', 'Source', 'Reviews', 'Start'] as const;

export const stepError = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback;
