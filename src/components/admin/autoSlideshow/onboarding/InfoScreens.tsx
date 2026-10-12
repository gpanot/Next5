'use client';

import { Screen } from './OnboardingChrome';
import { StageList } from './StageList';
import type { BuildStage } from './buildStatus';
import { PLAN_DAYS, VALUE_OUTCOMES, VALUE_STATS } from './onboardingCopy';

function Outcomes() {
  return (
    <ol className="space-y-4">
      {VALUE_OUTCOMES.map((o, i) => (
        <li key={o.title} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600 dark:bg-blue-950 dark:text-blue-400">{i + 1}</span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-ink dark:text-zinc-100">{o.title}</p>
            <p className="text-sm text-muted">{o.line}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Stats() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3">
      {VALUE_STATS.map((s) => (
        <div key={s.value} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="text-2xl font-light tracking-tight text-blue-600 dark:text-blue-400">{s.value}</p>
          <p className="mt-1 text-[13px] leading-snug text-ink dark:text-zinc-100">{s.body}</p>
          <p className="mt-1 text-[11px] text-muted">{s.source}</p>
        </div>
      ))}
    </div>
  );
}

export function ValuePropScreen({ onNext }: { onNext: () => void }) {
  return (
    <Screen
      kicker="While we build your workspace"
      title={`Your next ${PLAN_DAYS} days of posts, done for you`}
      titleClass="text-[28px]"
      cta={{ label: "Let's set it up", onClick: onNext }}
      ctaNote="4 quick questions, about 2 minutes"
    >
      <Outcomes />
      <Stats />
    </Screen>
  );
}

/** Live build: every stage state comes from the run. Continue is always on; the user never waits here. */
export function LiveBuildScreen({ stages, onNext }: { stages: BuildStage[]; onNext: () => void }) {
  return (
    <Screen title="Here's what we're doing right now" subtitle="Every step is live from your workspace." cta={{ label: 'Continue', onClick: onNext }}>
      <StageList stages={stages} />
      <p className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm text-muted dark:bg-zinc-900">
        <span className="font-semibold text-ink dark:text-zinc-100">Some posts will look alike.</span> That&apos;s on purpose. TikTok and Instagram push formats that already work.
      </p>
    </Screen>
  );
}
