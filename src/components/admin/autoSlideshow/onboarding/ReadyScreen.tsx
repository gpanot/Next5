'use client';

import type { OnboardingProfileDto } from '../../../../types/admin/onboarding';
import { Screen } from './OnboardingChrome';
import { StageList } from './StageList';
import type { BuildStatus } from './buildStatus';
import { GOAL_OPTIONS, MODE_LABELS, PLAN_DAYS, PLAN_POSTS, SUPPORT_EMAIL } from './onboardingCopy';

function CalendarTile() {
  return (
    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm dark:bg-blue-400 dark:text-zinc-950">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4.5" width="18" height="16" rx="3" />
        <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
        <path d="m8.5 14.5 2.2 2.2 4.8-4.7" />
      </svg>
    </div>
  );
}

const goalText = (profile: OnboardingProfileDto): string => {
  const labels = GOAL_OPTIONS.filter((o) => profile.goals.includes(o.key)).map((o) => o.label);
  return labels.length ? labels.join(', ') : 'Not set yet';
};

function Summary({ profile }: { profile: OnboardingProfileDto }) {
  const rows = [
    { label: 'Your goal', value: goalText(profile) },
    { label: 'Posting mode', value: MODE_LABELS[profile.postingMode] },
    { label: 'Planned', value: `${PLAN_POSTS} posts over ${PLAN_DAYS} days` },
  ];
  return (
    <dl className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {rows.map((r) => (
        <div key={r.label} className="flex items-start justify-between gap-4 px-4 py-3">
          <dt className="shrink-0 text-sm text-muted">{r.label}</dt>
          <dd className="text-right text-sm font-semibold text-ink dark:text-zinc-100">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Failed build: answers are kept; Try again resumes the run from the failed step. */
export function FailedNotice({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <div role="alert" className="mx-6 mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      <p className="font-semibold">Something went wrong building your workspace</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={onRetry} disabled={retrying} className="min-h-11 rounded-full bg-red-600 px-4 font-semibold text-white transition active:scale-95 disabled:opacity-50">
          {retrying ? 'Trying again…' : 'Try again'}
        </button>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="flex min-h-11 items-center rounded-full px-4 font-semibold underline-offset-4 hover:underline">
          Contact us
        </a>
      </div>
    </div>
  );
}

type Props = { profile: OnboardingProfileDto; build: BuildStatus; slow: boolean; onDone: () => void };

/** Waits for the build when it is not done yet, then swaps to the ready content without a reload. */
export function ReadyScreen({ profile, build, slow, onDone }: Props) {
  if (build.status !== 'done') {
    const waiting = build.status === 'running';
    return (
      <Screen
        title="Finishing your calendar"
        titleClass="text-[30px]"
        subtitle={slow && waiting ? "This is taking longer than usual. Your calendar fills in on its own when it's ready." : undefined}
        cta={slow || !waiting ? { label: 'Go to my workspace', onClick: onDone } : { label: 'See my calendar', onClick: onDone, disabled: true }}
      >
        <StageList stages={build.stages} compact />
      </Screen>
    );
  }
  return (
    <Screen icon={<CalendarTile />} title={`Your next ${PLAN_DAYS} days are ready`} titleClass="text-[30px]" subtitle="Built around what you told us." cta={{ label: 'See my calendar', onClick: onDone }}>
      <Summary profile={profile} />
      <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
        Your first slideshow is on us.
      </p>
    </Screen>
  );
}
