'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_POSTING_MODE, ONBOARDING_LAST_STEP, type OnboardingPatch, type OnboardingProfileDto, type OnboardingResponse } from '../../../../types/admin/onboarding';
import { adminFetch } from '../../business/useAdminApi';

export type Direction = 'forward' | 'back';
type Phase = 'loading' | 'hidden' | 'active';

/** Saves in the background: the UI never waits. A failed write is retried once. */
const send = (token: string, path: string, method: 'PATCH' | 'POST', body: object): void => {
  const attempt = () => adminFetch(token, path, { method, body: JSON.stringify(body) });
  void attempt().catch(() => attempt().catch(() => undefined));
};

const clampStep = (n: number) => Math.min(Math.max(n, 0), ONBOARDING_LAST_STEP);

/**
 * The onboarding flow's state: the answers (kept here, saved as the user goes), the screen shown and which way it moved.
 * `phase` hidden: this workspace does not get the flow, or it was finished.
 */
export const useOnboarding = (token: string, workspaceId: string) => {
  const base = `/api/slideshow/workspaces/${workspaceId}/onboarding`;
  const [phase, setPhase] = useState<Phase>('loading');
  const [profile, setProfile] = useState<OnboardingProfileDto | null>(null);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<Direction>('forward');
  const [flowStartedAt] = useState(() => Date.now());

  useEffect(() => {
    let live = true;
    adminFetch<OnboardingResponse>(token, base)
      .then(({ profile: p }) => {
        if (!live) return;
        if (!p || p.completedAt) return setPhase('hidden');
        setProfile(p);
        setStep(clampStep(p.lastStep));
        setPhase('active');
      })
      .catch(() => live && setPhase('hidden'));
    return () => {
      live = false;
    };
  }, [token, base]);

  const goTo = useCallback((to: number, direction: Direction, patch: OnboardingPatch) => {
    setDir(direction);
    setStep(clampStep(to));
    send(token, base, 'PATCH', { ...patch, lastStep: clampStep(to) });
  }, [token, base]);

  /** Continue: saves this screen's answers and moves on. */
  const next = useCallback((answers: Partial<OnboardingProfileDto> = {}) => {
    setProfile((p) => (p ? { ...p, ...answers } : p));
    goTo(step + 1, 'forward', answers);
  }, [goTo, step]);

  /** Skip: nothing answered, except the hands-on screen, which saves its default. */
  const skip = useCallback(() => {
    const answers = step === 3 ? { postingMode: DEFAULT_POSTING_MODE } : {};
    setProfile((p) => (p ? { ...p, ...answers, skippedSteps: [...new Set([...p.skippedSteps, step])] } : p));
    goTo(step + 1, 'forward', { ...answers, skippedStep: step });
  }, [goTo, step]);

  const back = useCallback(() => goTo(step - 1, 'back', {}), [goTo, step]);

  /** Ends the flow. `skippedSteps`: screens passed over by "Jump to my calendar". */
  const complete = useCallback((skippedSteps: number[] = []) => {
    send(token, `${base}/complete`, 'POST', { skippedSteps, lastStep: step });
    setPhase('hidden');
  }, [token, base, step]);

  return { phase, profile, step, dir, flowStartedAt, next, skip, back, complete };
};

export type OnboardingState = ReturnType<typeof useOnboarding>;
