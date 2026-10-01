'use client';

import { currentStep, isTerminalStatus, type MetaAdRunDto } from '../../../types/admin/metaAds';
import { PipelineNav, stepState } from '../shared/PipelineNav';

/** Pipeline steps 5 (image) and 6 (composite) run together per ad, so the UI shows them as one "Design" step. */
const NAV = [
  { label: 'Scan', steps: [1] },
  { label: 'Research', steps: [2] },
  { label: 'Hormozi', steps: [3] },
  { label: 'Angles', steps: [4] },
  { label: 'Design', steps: [5, 6] },
];

export function StepNav({ run }: { run: MetaAdRunDto }) {
  const failed = run.status === 'FAILED';
  const current = failed ? run.failedStep ?? 0 : currentStep(run.status);
  const items = NAV.map(({ label, steps }) => ({ label, state: stepState(current, failed, steps) }));
  return <PipelineNav items={items} running={!isTerminalStatus(run.status)} startedAt={run.startedAt} finishedAt={run.finishedAt} />;
}
