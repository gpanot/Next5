'use client';

import { currentStep, type MetaAdRunDto, type PipelineStep } from '../../../types/admin/metaAds';
import { AgentLog as LogCard, type LogLine } from '../shared/AgentLog';
import { stepSeconds as seconds } from '../shared/runClock';

/** The log is derived from the run's saved checkpoints, so it reads the same after a reload. */
const buildLines = (run: MetaAdRunDto): LogLine[] => {
  const raw = run.status === 'FAILED' ? run.failedStep ?? 0 : currentStep(run.status);
  // Step 6 (re-composite) shows as the Design line, like step 5.
  const step = raw === 6 ? 5 : raw;
  const failed = run.status === 'FAILED';
  const domain = run.url.replace(/^https?:\/\//, '');
  const brand = run.profile?.brandName ?? domain;
  const lines: LogLine[] = [];
  const push = (n: PipelineStep, active: string, done: string) => {
    if (n > step) return;
    const state = n < step ? 'done' : failed ? 'failed' : 'active';
    lines.push({ key: `step-${n}`, text: n < step ? done : active, state });
  };

  const c = run.competitors;
  const h = run.hormozi;
  const ready = run.ads.filter((a) => a.status === 'ready').length;
  push(1, `Scanning ${domain}`, `Mapped ${brand}'s audience and value prop${seconds(run.stepTimings[1])}`);
  push(2, `Searching the Meta Ad Library for “${run.profile?.searchKeywords.join(', ') ?? ''}”`, `Kept ${c?.ads.length ?? 0} of ${c?.candidateCount ?? 0} live ads from ${c?.brandCount ?? 0} brands${seconds(run.stepTimings[2])}`);
  push(3, 'Grading competitor ads on the Hormozi rubric', `Picked ${h?.picks.length ?? 0} winners, ${h?.plays.length ?? 0} plays, ${h?.levers.length ?? 0} brand levers${seconds(run.stepTimings[3])}`);
  push(4, `Writing ${run.adCount} ${run.adCount === 1 ? 'ad' : 'ads'} from the playbook`, `Wrote ${run.adCount} ${run.adCount === 1 ? 'ad' : 'ads'}${seconds(run.stepTimings[4])}`);
  push(5, `Designing ads · ${ready}/${run.ads.length} ready`, `Designed ${ready} ${ready === 1 ? 'ad' : 'ads'}${seconds(run.stepTimings[5] ?? run.stepTimings[6])}`);
  return lines;
};

export function AgentLog({ run }: { run: MetaAdRunDto }) {
  return <LogCard lines={buildLines(run)} error={run.error} />;
}
