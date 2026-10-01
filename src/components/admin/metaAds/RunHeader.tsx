'use client';

import type { MetaAdRunDto } from '../../../types/admin/metaAds';
import { elapsedBetween, formatElapsed } from '../shared/runClock';
import { RunCounter, RunTitle, type RunTitleCopy } from '../shared/RunTitle';

const readyLabel = (n: number) => `${n} ${n === 1 ? 'ad' : 'ads'}`;

const headerCopy = (run: MetaAdRunDto): RunTitleCopy => {
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
      return { tag: 'Ready to ship', title: `${readyLabel(run.ads.filter((a) => a.status === 'ready').length)} ready for ${brand}`, subtitle: `Researched, written and designed in ${formatElapsed(elapsedBetween(run.startedAt, run.finishedAt, Date.now()))}.` };
  }
};

type Props = { run: MetaAdRunDto; onDownloadAll: () => void };

export function RunHeader({ run, onDownloadAll }: Props) {
  const ready = run.ads.filter((a) => a.status === 'ready').length;
  const designing = run.ads.filter((a) => a.status === 'imaging' || a.status === 'compositing').length;
  const done = run.status === 'COMPLETED';
  const aside = done ? (
    <div className="flex flex-wrap items-center gap-3 self-start">
      <button onClick={onDownloadAll} className="min-h-10 rounded-full border border-line bg-white px-4 text-sm font-medium transition hover:shadow-sm active:scale-95 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
        Download all
      </button>
    </div>
  ) : (
    <RunCounter done={ready} total={run.adCount} label="ads designed" note={run.ads.length === 0 ? 'Waiting for briefs' : `${designing} designing in parallel`} />
  );
  return <RunTitle {...headerCopy(run)} tone={done ? 'done' : run.status === 'FAILED' ? 'failed' : 'running'} aside={aside} />;
}
