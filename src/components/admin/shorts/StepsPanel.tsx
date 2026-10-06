'use client';

import { SHORT_STEP_LABELS, type ShortDetailDto, type ShortStep } from '../../../types/admin/shorts';
import { Section } from './Section';
import { seconds, usd } from './useShorts';

const STEPS: ShortStep[] = [1, 2, 3, 4, 5];

const stepState = (short: ShortDetailDto, step: ShortStep): 'done' | 'running' | 'failed' | 'waiting' => {
  if (short.status === `STEP_${step}_RUNNING`) return 'running';
  if (short.failedStep === step) return 'failed';
  return short.stepTimings[step] !== undefined ? 'done' : 'waiting';
};

const DOT: Record<ReturnType<typeof stepState>, string> = {
  done: 'bg-emerald-500',
  running: 'animate-pulse bg-amber-500',
  failed: 'bg-rose-500',
  waiting: 'bg-app-line',
};

/** Each step: time, cost and the cost lines behind it. Totals on top. */
export function StepsPanel({ short }: { short: ShortDetailDto }) {
  return (
    <Section title="Steps, time & cost" aside={`${usd(short.totalUsdMicros)} · ${seconds(short.totalMs)} total`}>
      <ol className="space-y-2">
        {STEPS.map((step) => {
          const cost = short.stepCosts[step];
          const ms = short.stepTimings[step];
          const state = stepState(short, step);
          return (
            <li key={step} className="rounded-lg border border-app-line p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-bold text-app-ink">
                  <span className={`h-2.5 w-2.5 rounded-full ${DOT[state]}`} aria-hidden />
                  {step}. {SHORT_STEP_LABELS[step]}
                </p>
                <p className="text-xs font-semibold text-app-ink tabular-nums">
                  {ms !== undefined ? seconds(ms) : state === 'running' ? 'running…' : '—'} · {usd(cost?.usdMicros ?? 0)}
                </p>
              </div>
              {!!cost?.items.length && (
                <ul className="mt-2 space-y-0.5 border-t border-app-line pt-2">
                  {cost.items.map((item) => (
                    <li key={item.label} className="flex justify-between gap-3 text-xs text-app-muted">
                      <span>{item.label}</span>
                      <span className="tabular-nums">{usd(item.usdMicros)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      {short.error && <p className="rounded-lg bg-app-accent-soft p-3 font-mono text-xs break-words text-app-danger">{short.error}</p>}
    </Section>
  );
}
