'use client';

import { CheckCircle2 } from 'lucide-react';
import { DAY_STATUS_LABEL, dayStatus, type DayPatch, type PlanDay, type Topics } from '../../../lib/blueprint/schema';
import type { HookOption } from '../../../lib/scriptGenerator/types';
import { Checkbox } from '../../ui/Checkbox';
import { CHECKS, FORMAT_COPY, PILLAR_COPY } from './copy';
import { DayFields } from './DayFields';
import { DAY_CARD } from './planCopy';
import { ScriptPanel } from './ScriptPanel';
import type { DayRun } from './useScriptGeneration';

type DayActions = {
  write: (day: number, hook?: HookOption) => void;
  change: (day: number, instruction: string) => void;
  loadHooks: (day: number) => void;
  hideHooks: (day: number) => void;
  stop: (day: number) => void;
};

type Props = { index: number; day: PlanDay; topics: Topics; run: DayRun; actions: DayActions; onChange: (patch: DayPatch) => void };

/** One day of the plan: its fields, its script, its three checks and its status. */
export const DayCard = ({ index, day, topics, run, actions, onChange }: Props) => {
  const status = dayStatus(day);
  const ready = status === 'ready';
  return (
    <article className={['flex flex-col gap-4 rounded-2xl border bg-app-panel p-4 shadow-sm transition-colors duration-200 sm:p-5', ready ? 'border-app-success' : 'border-app-line'].join(' ')}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[16px] font-semibold text-app-ink">
          {DAY_CARD.day(index + 1)} <span className="font-normal text-app-muted">· {PILLAR_COPY[day.pillar].short} · {FORMAT_COPY[day.format].short}</span>
        </h3>
        <span className={['flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium', ready ? 'bg-app-success/15 text-app-success' : 'bg-app-sunken text-app-muted'].join(' ')}>
          {ready && <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />}
          {DAY_STATUS_LABEL[status]}
        </span>
      </header>
      <DayFields day={day} topics={topics} onChange={onChange} locked={run.busy !== null} />
      <ScriptPanel
        day={day}
        run={run}
        actions={{
          write: (hook) => actions.write(index, hook),
          change: (instruction) => actions.change(index, instruction),
          loadHooks: () => actions.loadHooks(index),
          hideHooks: () => actions.hideHooks(index),
          stop: () => actions.stop(index),
        }}
      />
      {day.script && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-app-muted">{DAY_CARD.checksTitle}</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {CHECKS.map((check, c) => (
              <Checkbox
                key={check.name}
                className="min-h-11 items-center"
                label={check.name}
                checked={day.checks[c]}
                onChange={(checked) => onChange({ checks: day.checks.map((v, k) => (k === c ? checked : v)) as PlanDay['checks'] })}
              />
            ))}
          </div>
        </fieldset>
      )}
    </article>
  );
};
