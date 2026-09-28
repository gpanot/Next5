'use client';

import { formatUsd, type MetaAdRunDto } from '../../../types/admin/metaAds';
import { GetMoreButton } from './GetMoreButton';
import { elapsedMs, formatElapsed } from './StepNav';

const readyLabel = (n: number) => `${n} ${n === 1 ? 'ad' : 'ads'}`;

type Copy = { tag: string; title: string; subtitle: string };

const headerCopy = (run: MetaAdRunDto): Copy => {
  const domain = run.url.replace(/^https?:\/\//, '');
  const brand = run.profile?.brandName ?? domain;
  switch (run.status) {
    case 'STEP_1_RUNNING':
      return { tag: 'Step 1 of 5', title: `Scanning ${domain}`, subtitle: 'Reading the site for brand, product, audience and tone.' };
    case 'STEP_2_RUNNING':
      return { tag: 'Step 2 of 5', title: `Studying ${brand}'s category`, subtitle: `Pulling live Meta ads for “${run.profile?.searchKeywords.join('”, “') ?? ''}”.` };
    case 'STEP_3_RUNNING':
      return { tag: 'Step 3 of 5', title: 'Alex Hormozi is grading the winners', subtitle: `Scoring ${run.competitors?.ads.length ?? 0} live ads on his value equation, then building a playbook.` };
    case 'STEP_4_RUNNING':
      return { tag: 'Step 4 of 5', title: 'Writing ads from the playbook', subtitle: `Planning ${run.adCount === 1 ? '1 concept' : `${run.adCount} distinct concepts`} and writing copy.` };
    case 'STEP_5_RUNNING':
    case 'STEP_6_RUNNING':
      return { tag: 'Step 5 of 5', title: 'Designing your ads', subtitle: 'Generating images and adding text, all in parallel.' };
    case 'FAILED':
      return { tag: 'Stopped', title: `Step ${run.failedStep ?? '?'} failed`, subtitle: 'Earlier steps are saved. Fix the cause, then resume below.' };
    case 'COMPLETED':
      return { tag: 'Ready to ship', title: `${readyLabel(run.ads.filter((a) => a.status === 'ready').length)} ready for ${brand}`, subtitle: `Researched, written and designed in ${formatElapsed(elapsedMs(run, Date.now()))} for ${formatUsd(run.totalCostMicros)}.` };
  }
};

type Props = { token: string; run: MetaAdRunDto; onDownloadAll: () => void; onRun: (runId: string) => void };

export function RunHeader({ token, run, onDownloadAll, onRun }: Props) {
  const { tag, title, subtitle } = headerCopy(run);
  const ready = run.ads.filter((a) => a.status === 'ready').length;
  const designing = run.ads.filter((a) => a.status === 'imaging' || a.status === 'compositing').length;
  const done = run.status === 'COMPLETED';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className={['mb-2 inline-block text-[10px] font-bold tracking-wider uppercase', done ? 'rounded bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : run.status === 'FAILED' ? 'text-red-600' : 'text-blue-600 dark:text-blue-400'].join(' ')}>
          {done ? '✓ ' : ''}{tag}
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-ink md:text-3xl dark:text-zinc-100">{title}</h2>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      {done ? (
        <div className="flex flex-wrap items-center gap-3 self-start">
          <button onClick={onDownloadAll} className="min-h-10 rounded-full border border-line bg-white px-4 text-sm font-medium transition hover:shadow-sm active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
            Download all
          </button>
          <GetMoreButton token={token} url={run.url} onRun={onRun} />
        </div>
      ) : (
        <div className="text-left sm:text-right">
          <p className="flex items-baseline gap-1 sm:justify-end">
            <span className="text-3xl font-bold tracking-tighter text-ink dark:text-zinc-100">{String(ready).padStart(2, '0')}</span>
            <span className="text-xl font-bold text-zinc-300 dark:text-zinc-600">/{run.adCount}</span>
          </p>
          <p className="text-xs text-muted">ads designed</p>
          <p className="mt-1 text-[11px] text-muted">{run.ads.length === 0 ? 'Waiting for briefs' : `${designing} designing in parallel`}</p>
        </div>
      )}
    </div>
  );
}
