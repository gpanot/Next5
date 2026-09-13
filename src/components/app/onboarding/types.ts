import type { MeDto, ProductLineDto } from '../../../types/business/me';

export type StepProps = {
  product: ProductLineDto;
  me: MeDto;
  /** Marks `step` complete on the server, refreshes `me`, and moves on. */
  advance: (step: number, options?: { completed?: boolean }) => Promise<void>;
};

export const STEP_LABELS = ['Account', 'Consent', 'Your photos', 'Your look', 'Free photos', 'Plan'] as const;

export const stepError = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback;
