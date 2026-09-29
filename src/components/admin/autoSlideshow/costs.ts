import { AUTO_STEPS, type AutoRunDto } from '../../../types/admin/autoSlideshow';

/** Everything the run has paid so far, micro-USD. */
export const runCostMicros = (run: AutoRunDto): number => AUTO_STEPS.reduce((sum, step) => sum + (run.stepCosts[step]?.usdMicros ?? 0), 0);

/** Run cost spread over the slideshows that came out ready (null until one is ready). */
export const costPerSlideshow = (run: AutoRunDto): number | null => {
  const ready = run.slideshows.filter((s) => s.status === 'ready').length;
  return ready > 0 ? runCostMicros(run) / ready : null;
};

export const dollars = (micros: number): string => `$${(micros / 1e6).toFixed(micros >= 1_000_000 ? 2 : 3)}`;

export const seconds = (ms: number): string => (ms >= 60_000 ? `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s` : `${Math.round(ms / 1000)}s`);
