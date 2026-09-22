'use client';

import { track } from '../../../lib/analytics';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useMagicToken } from '../../../hooks/useMagicToken';
import { apiFetch } from '../../../lib/apiClient';
import { onboardingDraftStore, sessionTokenStore } from '../../../lib/localStore';
import { studioHref } from '../../../lib/studioPaths';
import type { MeDto, ProductLineDto } from '../../../types/business/me';
import { BusinessLogo } from '../../marketing/shared/MarketingHeader';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonText } from '../../ui/Skeleton';
import { Stepper } from '../../ui/Stepper';
import { AccountStep } from './AccountStep';
import { AttributionStep } from './AttributionStep';
import { BrandSelfieStep } from './BrandSelfieStep';
import { ConsentStep } from './ConsentStep';
import { IntentGoalsStep } from './IntentGoalsStep';
import { ProductIntroStep } from './ProductIntroStep';
import { RoleStep } from './RoleStep';
import { SocialProofStep } from './SocialProofStep';
import { TeamRevenueStep } from './TeamRevenueStep';
import { STEP_LABELS, type StepProps } from './types';

// Steps 2–9 (step 1 = AccountStep, rendered separately)
const STEPS: readonly ((props: StepProps) => React.ReactNode)[] = [
  ConsentStep,
  TeamRevenueStep,
  RoleStep,
  IntentGoalsStep,
  AttributionStep,
  BrandSelfieStep,
  SocialProofStep,
  ProductIntroStep,
];

const TOTAL_STEPS = STEP_LABELS.length; // 9

export const OnboardingWizard = ({ product }: { product: ProductLineDto }) => {
  const token = sessionTokenStore.useValue();
  const { verifying, failed: linkFailed } = useMagicToken();
  const me = useApi<MeDto>(token ? `/api/app/me?product=${product}&s=${token.slice(-10)}` : null);
  const [viewStep, setViewStep] = useState<number | null>(null);
  const router = useRouter();

  const workspace = me.data?.workspace?.product === product ? me.data.workspace : null;
  const serverStep = workspace ? Math.min(TOTAL_STEPS, workspace.onboardingStep + 1) : 1;
  const current = viewStep !== null && viewStep < serverStep ? viewStep : serverStep;

  useEffect(() => {
    if (workspace?.onboardingCompleted) router.replace(studioHref(product));
  }, [workspace?.onboardingCompleted, router, product]);

  // The typed step-1 details are only needed until this product's workspace exists.
  useEffect(() => {
    if (workspace) onboardingDraftStore.set(null);
  }, [workspace]);

  const advance = useCallback(async (
    step: number,
    options?: { completed?: boolean; data?: Record<string, unknown> },
  ) => {
    await apiFetch('/api/app/onboarding/step', {
      method: 'PATCH',
      json: { product, step, completed: options?.completed, ...options?.data },
    });
    track('onboarding_step_completed', { product, step, completed: Boolean(options?.completed) });
    setViewStep(null);
    me.refresh();
  }, [product, me]);

  const hasOtherStudio = Boolean(me.data && me.data.workspaces.length > 0);
  const loading = token === undefined || verifying || (Boolean(token) && me.loading && !me.data);
  const StepComponent = current > 1 && me.data ? STEPS[current - 2] : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-5 pb-16 pt-6 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <BusinessLogo />
        <Link href="/app" className="text-[14px] text-app-muted hover:text-app-ink">{hasOtherStudio ? 'Back to my studio' : 'Log in'}</Link>
      </header>
      <div className="flex items-center gap-3">
        {current > 1 && current < TOTAL_STEPS && (
          <button type="button" onClick={() => setViewStep(current - 1)} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full border border-app-line text-app-ink transition-colors duration-200 hover:bg-app-sunken">
            <ArrowLeft aria-hidden className="h-4 w-4" />
          </button>
        )}
        <Stepper steps={STEP_LABELS} current={current} />
      </div>
      {loading && <SkeletonText lines={6} />}
      {!loading && me.error && <ErrorState message={me.error} onRetry={me.refresh} />}
      {!loading && !me.error && current === 1 && (
        <AccountStep
          product={product}
          signedIn={token && me.data?.user ? { email: me.data.user.email, displayName: me.data.user.displayName } : null}
          linkFailed={linkFailed}
          hasOtherStudio={hasOtherStudio}
          onSession={me.refresh}
        />
      )}
      {!loading && !me.error && StepComponent && me.data && <StepComponent product={product} me={me.data} advance={advance} />}
    </div>
  );
};
