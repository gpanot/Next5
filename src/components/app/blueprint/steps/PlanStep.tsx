'use client';

import { dayStatus, DAYS, type About, type BlueprintDto, type DayPatch } from '../../../../lib/blueprint/schema';
import { AboutCard } from '../AboutCard';
import { SHELL } from '../copy';
import { DayCard } from '../DayCard';
import { PLAN_STEP } from '../planCopy';
import { StepHeading } from '../StepHeading';
import { StepNav } from '../StepNav';
import type { useScriptGeneration } from '../useScriptGeneration';
import type { StepNavProps } from './types';

type Props = StepNavProps & {
  blueprint: BlueprintDto;
  generation: ReturnType<typeof useScriptGeneration>;
  onAbout: (about: About) => void;
  onDay: (index: number, patch: DayPatch) => void;
};

/** Step 5: the About card once, then 7 day cards with scripts. */
export const PlanStep = ({ blueprint, generation, onAbout, onDay, onBack, onNext }: Props) => {
  const ready = blueprint.plan.filter((d) => dayStatus(d) === 'ready').length;
  return (
    <div className="flex flex-col gap-5">
      <StepHeading step={4} title={PLAN_STEP.title} accent={PLAN_STEP.accent}>{PLAN_STEP.body}</StepHeading>
      <AboutCard about={blueprint.about} onChange={onAbout} />
      <p role="status" className="text-[15px] font-semibold tabular-nums text-app-ink">{SHELL.readyCount(ready, DAYS)}</p>
      {blueprint.plan.map((day, i) => (
        <DayCard key={i} index={i} day={day} topics={blueprint.topics} run={generation.runOf(i)} actions={generation} onChange={(patch) => onDay(i, patch)} />
      ))}
      <StepNav onBack={onBack} onNext={onNext} nextLabel={PLAN_STEP.next} />
    </div>
  );
};
