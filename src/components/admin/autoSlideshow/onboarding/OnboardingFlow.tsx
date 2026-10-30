'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { currentAutoStep, type AutoRunDto } from '../../../../types/admin/autoSlideshow';
import { LAST_COUNTED_STEP, ONBOARDING_LAST_STEP, type OnboardingProfileDto } from '../../../../types/admin/onboarding';
import type { TargetAge, TargetGender } from '../../../../types/admin/targetClient';
import { adminFetch } from '../../business/useAdminApi';
import { StepScreen } from './OnboardingSteps';
import { BuildBar, OnboardingHeader, TITLE_ID } from './OnboardingChrome';
import { trackOnboarding, type TrackContext } from './onboardingAnalytics';
import { FailedNotice } from './ReadyScreen';
import { AvatarScreen } from './AvatarScreen';
import { TargetClientScreen } from './TargetClientScreen';
import { useTargetClient } from '../target/useTargetClient';
import { useAvatarGate } from './useAvatarGate';
import { useBuildStatus } from './useBuildStatus';
import { useOnboarding } from './useOnboarding';

type Props = { token: string; workspaceId: string; run: AutoRunDto; onRunChanged: () => void };

/** Option keys picked on a screen, for analytics. Never the free text. */
const answerKeysOf = (a: Partial<OnboardingProfileDto>): string[] => [...(a.goals ?? []), ...(a.pains ?? []), ...(a.postingMode ? [a.postingMode] : []), ...(a.monthlySpend ? [a.monthlySpend] : [])];

/** The age range read from the website ("25-45"), when the run has it and the site shows people. */
const detectedRangeOf = (run: AutoRunDto): string | null => {
  const range = run.profile?.visualBible?.person_age_range?.trim();
  return range && !/^none$/i.test(range) ? range : null;
};

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
  const target = useTargetClient(token, workspaceId);
  const avatar = useAvatarGate(token, workspaceId, run);
  const router = useRouter();
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
  const jump = () => {
    trackOnboarding('onboarding_jump_to_calendar', ctx, { fromStep: flow.step });
    const remaining = Array.from({ length: LAST_COUNTED_STEP }, (_, i) => i + 1).filter((s) => s >= flow.step);
    void flow.complete(remaining);
  };
  const finish = () => {
    trackOnboarding('onboarding_completed', ctx, { totalMs: Date.now() - flow.flowStartedAt, waitedOnReadyMs: waitedOnReadyMs() });
    // Land on Campaigns › Brand Cast, once the server knows it is done: the first slideshow plays once when it is ready.
    void flow.complete().then(() => router.push(`/slideshow/${workspaceId}/campaigns?tab=brand&play=first`));
  };
  const retry = async () => {
    setRetrying(true);
    await adminFetch(token, `/api/admin/auto-slideshow/runs/${run.id}/resume`, { method: 'POST', body: '{}' }).catch(() => undefined);
    setRetrying(false);
    onRunChanged();
  };

  const confirmTarget = async (age: TargetAge, gender: TargetGender) => {
    if (await target.save(age, gender)) trackOnboarding('onboarding_target_picked', ctx, { age, gender });
  };

  const makeAvatar = (request: Parameters<typeof avatar.create>[0]) => {
    trackOnboarding('onboarding_avatar_made', ctx, { made: (avatar.members?.length ?? 0) + 1 });
    avatar.create(request);
  };
  const confirmAvatar = async () => {
    const made = avatar.members?.length ?? 0;
    if (await avatar.confirm()) trackOnboarding('onboarding_avatar_picked', ctx, { made });
  };

  const onLast = flow.step === ONBOARDING_LAST_STEP;
  const failed = build.build.status === 'failed';
  // Hard stop before anything else: no avatar and no slideshow until the owner picks their main client.
  if (target.loading || !target.target?.confirmedAt) {
    return (
      <Frame>
        <OnboardingHeader step={0} onBack={flow.back} />
        <BuildBar pct={build.barPct(0)} done={false} />
        {target.loading ? (
          <div className="flex-1 space-y-3 px-6 pt-5" aria-busy="true">
            <div className="h-8 w-3/4 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ) : (
          <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col animate-onb-forward">
            <TargetClientScreen
              target={target.target}
              detectedRange={detectedRangeOf(run)}
              reading={!failed && currentAutoStep(run.status) <= 3}
              saving={target.saving}
              error={target.saveError}
              onConfirm={(age, gender) => void confirmTarget(age, gender)}
            />
          </div>
        )}
      </Frame>
    );
  }
  // The avatar gate: no slideshow is made before the owner picks the face, so it comes before the questions resume.
  if (avatar.open) {
    return (
      <Frame>
        <OnboardingHeader step={0} onBack={flow.back} />
        <BuildBar pct={build.barPct(0)} done={false} />
        <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col animate-onb-forward">
          <AvatarScreen
            members={avatar.members}
            chosenId={avatar.chosenId}
            busy={avatar.busy}
            saving={avatar.saving}
            error={avatar.error}
            onChoose={avatar.choose}
            onCreate={makeAvatar}
            onRetry={avatar.retry}
            onConfirm={() => void confirmAvatar()}
            onDraft={avatar.draft}
          />
        </div>
      </Frame>
    );
  }
  return (
    <Frame>
      <OnboardingHeader step={flow.step} onBack={flow.back} />
      <BuildBar pct={build.barPct(flow.step)} done={build.build.status === 'done'} onJump={onLast ? undefined : jump} />
      {failed && <FailedNotice retrying={retrying} onRetry={() => void retry()} />}
      <div ref={bodyRef} key={flow.step} className={`flex min-h-0 flex-1 flex-col ${flow.dir === 'forward' ? 'animate-onb-forward' : 'animate-onb-back'}`}>
        <StepScreen step={flow.step} profile={profile} build={build.build} slow={build.slow} onNext={next} onDone={finish} />
      </div>
    </Frame>
  );
}
