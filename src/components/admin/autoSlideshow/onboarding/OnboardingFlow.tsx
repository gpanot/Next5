'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AutoRunDto } from '../../../../types/admin/autoSlideshow';
import { LAST_COUNTED_STEP, ONBOARDING_LAST_STEP, type OnboardingProfileDto } from '../../../../types/admin/onboarding';
import { adminFetch } from '../../business/useAdminApi';
import { StepScreen } from './OnboardingSteps';
import { BuildBar, OnboardingHeader, TITLE_ID } from './OnboardingChrome';
import { trackOnboarding, type TrackContext } from './onboardingAnalytics';
import { FailedNotice } from './ReadyScreen';
import { useBuildStatus } from './useBuildStatus';
import { useOnboarding } from './useOnboarding';

type Props = { token: string; workspaceId: string; run: AutoRunDto; onRunChanged: () => void };

/** Option keys picked on a screen, for analytics. Never the free text. */
const answerKeysOf = (a: Partial<OnboardingProfileDto>): string[] => [...(a.goals ?? []), ...(a.pains ?? []), ...(a.postingMode ? [a.postingMode] : []), ...(a.monthlySpend ? [a.monthlySpend] : [])];

/** Mobile: full screen. Desktop: a 440px modal over the dimmed calendar. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-center sm:items-center sm:bg-black/40 sm:p-4">
      <div role="dialog" aria-modal="true" aria-labelledby={TITLE_ID} className="flex h-dvh w-full flex-col overflow-hidden bg-surface sm:h-[min(860px,calc(100dvh-2rem))] sm:w-[440px] sm:rounded-[28px] sm:shadow-xl dark:bg-zinc-950">
        {children}
      </div>
    </div>
  );
}

/** Watches the build for the analytics events and the time spent waiting on the last screen. */
const useBuildMoments = (ctx: TrackContext | null, build: ReturnType<typeof useBuildStatus>, step: number) => {
  const doneSeenAt = useRef<number | null>(null);
  const readyEnteredAt = useRef<number | null>(null);
  const failedSent = useRef(false);
  const status = build.build.status;
  useEffect(() => {
    if (!ctx) return;
    if (status === 'done' && doneSeenAt.current === null) {
      doneSeenAt.current = Date.now();
      trackOnboarding('onboarding_build_ready', ctx, { buildMs: build.buildMs() });
    }
    if (status === 'failed' && !failedSent.current) trackOnboarding('onboarding_build_failed', ctx, { failedStage: build.build.failedStage });
    failedSent.current = status === 'failed';
  }, [ctx, status, build]);
  useEffect(() => {
    if (step === ONBOARDING_LAST_STEP && readyEnteredAt.current === null) readyEnteredAt.current = Date.now();
  }, [step]);
  /** 0 when the build was done before the user reached the last screen. */
  return () => {
    const entered = readyEnteredAt.current;
    if (entered === null) return 0;
    return Math.max(0, (doneSeenAt.current ?? Date.now()) - entered);
  };
};

/** The onboarding shown while a new workspace's first run builds. Answers are saved for stats only. */
export function OnboardingFlow({ token, workspaceId, run, onRunChanged }: Props) {
  const flow = useOnboarding(token, workspaceId);
  const build = useBuildStatus(run);
  const [retrying, setRetrying] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const active = flow.phase === 'active' && flow.profile !== null;
  const ctx: TrackContext | null = active ? { workspaceId, step: flow.step, flowStartedAt: flow.flowStartedAt, buildPct: build.build.pct } : null;
  const waitedOnReadyMs = useBuildMoments(ctx, build, flow.step);

  useEffect(() => {
    if (!active) return;
    trackOnboarding('onboarding_step_viewed', { workspaceId, step: flow.step, flowStartedAt: flow.flowStartedAt, buildPct: build.build.pct });
    bodyRef.current?.querySelector<HTMLElement>(`#${TITLE_ID}`)?.focus({ preventScroll: true });
    // Only on a step change: the build percentage moving is not a new view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, flow.step]);

  if (!active || !ctx) return null;
  const profile = flow.profile!;

  const next = (answers: Partial<OnboardingProfileDto> = {}) => {
    const keys = answerKeysOf(answers);
    const hasOtherText = Boolean(answers.goalsOther || answers.painsOther);
    if (keys.length || 'goals' in answers || 'pains' in answers) trackOnboarding('onboarding_step_answered', ctx, { answerKeys: keys.join(','), hasOtherText });
    flow.next(answers);
  };
  const skip = () => {
    trackOnboarding('onboarding_step_skipped', ctx);
    flow.skip();
  };
  const jump = () => {
    trackOnboarding('onboarding_jump_to_calendar', ctx, { fromStep: flow.step });
    const remaining = Array.from({ length: LAST_COUNTED_STEP }, (_, i) => i + 1).filter((s) => s >= flow.step);
    flow.complete(remaining);
  };
  const finish = () => {
    trackOnboarding('onboarding_completed', ctx, { totalMs: Date.now() - flow.flowStartedAt, waitedOnReadyMs: waitedOnReadyMs() });
    flow.complete();
  };
  const retry = async () => {
    setRetrying(true);
    await adminFetch(token, `/api/admin/auto-slideshow/runs/${run.id}/resume`, { method: 'POST', body: '{}' }).catch(() => undefined);
    setRetrying(false);
    onRunChanged();
  };

  const onLast = flow.step === ONBOARDING_LAST_STEP;
  const failed = build.build.status === 'failed';
  return (
    <Frame>
      <OnboardingHeader step={flow.step} onBack={flow.back} onSkip={skip} />
      <BuildBar pct={build.barPct(flow.step)} done={build.build.status === 'done'} onJump={onLast ? undefined : jump} />
      {failed && <FailedNotice retrying={retrying} onRetry={() => void retry()} />}
      <div ref={bodyRef} key={flow.step} className={`flex min-h-0 flex-1 flex-col ${flow.dir === 'forward' ? 'animate-onb-forward' : 'animate-onb-back'}`}>
        <StepScreen step={flow.step} profile={profile} build={build.build} slow={build.slow} onNext={next} onDone={finish} />
      </div>
    </Frame>
  );
}
