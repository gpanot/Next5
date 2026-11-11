'use client';

import { useCallback } from 'react';
import { STEPS } from '../../../lib/blueprint/schema';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonCard, SkeletonText } from '../../ui/Skeleton';
import { SHELL } from './copy';
import { ResetButton } from './ResetButton';
import { SaveStatus } from './SaveStatus';
import { StepBar } from './StepBar';
import { BrandStep } from './steps/BrandStep';
import { ChecksStep } from './steps/ChecksStep';
import { FormatsStep } from './steps/FormatsStep';
import { PlanStep } from './steps/PlanStep';
import { SummaryStep } from './steps/SummaryStep';
import { TopicsStep } from './steps/TopicsStep';
import { useBlueprint } from './useBlueprint';
import { useScriptGeneration } from './useScriptGeneration';

type Blueprint = ReturnType<typeof useBlueprint>;

const Loading = () => (
  <div className="mx-auto flex w-full max-w-[968px] flex-col gap-4" aria-busy="true">
    <SkeletonText lines={1} />
    <SkeletonCard />
    <SkeletonCard />
  </div>
);

const Notice = ({ text, onDismiss }: { text: string; onDismiss: () => void }) => (
  <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-app-warning/40 bg-app-warning/10 px-4 py-2 text-[14px] text-app-ink">
    {text}
    <button type="button" onClick={onDismiss} className="min-h-11 px-2 font-medium underline underline-offset-2">{SHELL.dismiss}</button>
  </div>
);

type Generation = ReturnType<typeof useScriptGeneration>;

/** The visible step. */
const CurrentStep = ({ bp, generation, go }: { bp: Blueprint; generation: Generation; go: (step: number) => void }) => {
  const blueprint = bp.blueprint;
  if (!blueprint) return null;
  const step = blueprint.step;
  const nav = { onBack: step > 0 ? () => go(step - 1) : undefined, onNext: step < STEPS - 1 ? () => go(step + 1) : undefined };
  switch (step) {
    case 0:
      return <BrandStep topics={blueprint.topics} {...nav} />;
    case 1:
      return <TopicsStep topics={blueprint.topics} onChange={bp.setTopics} {...nav} />;
    case 2:
      return <FormatsStep {...nav} />;
    case 3:
      return <ChecksStep {...nav} />;
    case 4:
      return <PlanStep blueprint={blueprint} generation={generation} onAbout={bp.setAbout} onDay={bp.setDay} {...nav} />;
    default:
      return <SummaryStep blueprint={blueprint} {...nav} />;
  }
};


/** Brand Blueprint (Admin › Jun Yuh › My Blueprint): six steps, one visible at a time, progress saved on the server. */
export const BlueprintPage = ({ token }: { token: string }) => {
  const bp = useBlueprint(token);
  const { setStep } = bp;
  const generation = useScriptGeneration({ token, flush: bp.flush, onSaved: bp.acceptServerDay });

  const go = useCallback(
    (step: number) => {
      setStep(step);
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    },
    [setStep],
  );

  if (bp.loadError) return <ErrorState message={bp.loadError} onRetry={bp.retryLoad} />;
  if (!bp.blueprint) return <Loading />;

  return (
    <div className="mx-auto flex w-full max-w-[968px] flex-col gap-5">
      <div className="flex min-h-6 justify-end">
        <SaveStatus state={bp.saveState} onRetry={() => void bp.flush()} />
      </div>
      <StepBar step={bp.blueprint.step} onSelect={go}  />
      {bp.notice && <Notice text={bp.notice} onDismiss={bp.clearNotice} />}
      <CurrentStep bp={bp} generation={generation} go={go} />
      <ResetButton onReset={() => void bp.reset()} />
    </div>
  );
};
