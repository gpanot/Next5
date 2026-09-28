'use client';

import { useCallback, useState } from 'react';
import { currentStep } from '../../../types/admin/metaAds';
import { AdGrid } from './AdGrid';
import { AdInspector } from './AdInspector';
import { AgentLog } from './AgentLog';
import { BrandCard } from './BrandCard';
import { CompetitorStrip } from './CompetitorStrip';
import { downloadRun } from './downloads';
import { HormoziPanel } from './HormoziPanel';
import { PipelineInspector } from './PipelineInspector';
import { RunHeader } from './RunHeader';
import { StepNav } from './StepNav';
import { useMetaAdRun } from './useMetaAdRun';

type Props = { token: string; runId: string; onBack: () => void; onRun: (runId: string) => void };

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-72 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="h-80 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-80 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

export function RunDashboard({ token, runId, onBack, onRun }: Props) {
  const { run, error, refresh } = useMetaAdRun(token, runId);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const onIndex = useCallback((index: number | null) => setOpenIndex(index), []);

  const back = (
    <button onClick={onBack} className="mb-4 min-h-10 text-sm text-muted transition hover:text-ink dark:hover:text-zinc-100">
      ← New run
    </button>
  );

  if (!run) {
    return (
      <div>
        {back}
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p> : <DashboardSkeleton />}
      </div>
    );
  }

  const step = run.status === 'FAILED' ? run.failedStep ?? 0 : currentStep(run.status);
  const failedEarly = run.status === 'FAILED';

  return (
    <div className="mx-auto max-w-[1500px]">
      {back}
      <StepNav run={run} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr] lg:gap-8">
        <aside className="order-2 flex flex-col gap-4 lg:order-1">
          <BrandCard url={run.url} profile={run.profile} />
          <AgentLog run={run} />
        </aside>
        <section className="order-1 flex min-w-0 flex-col gap-6 lg:order-2">
          <RunHeader token={token} run={run} onDownloadAll={() => void downloadRun(run)} onRun={onRun} />
          <CompetitorStrip research={run.competitors} insights={run.competitors?.patterns ?? []} loading={step === 2} compact={step >= 3 && !failedEarly} />
          <HormoziPanel hormozi={run.hormozi} competitors={run.competitors} loading={step === 3 && !failedEarly} compact={step >= 5 && !failedEarly} />
          <AdGrid ads={run.ads} count={run.adCount} onOpen={setOpenIndex} />
          <PipelineInspector token={token} run={run} onResumed={refresh} />
        </section>
      </div>
      {openIndex !== null && <AdInspector token={token} run={run} index={openIndex} onIndex={onIndex} onChanged={refresh} />}
    </div>
  );
}
