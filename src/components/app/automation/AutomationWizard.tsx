'use client';

/**
 * The campaign wizard. Six steps, one page, phone first.
 *
 * The draft is the `Campaign` row, not browser state: every step transition writes to the API, so
 * closing the tab on step 4 and opening the app on a phone picks up where she left off.
 * Plan: docs/business-studios/phases/phase-01-campaign-wizard.md
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/apiClient';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { TemplateDto } from '../../../lib/contentTemplates';
import type { AssetGapDto, CampaignDto, CampaignGoalDto, ContentSourceDto } from '../../../types/business/campaigns';
import { AppButton } from '../../ui/AppButton';
import { Stepper } from '../../ui/Stepper';
import { useWorkspace } from '../shell/WorkspaceProvider';
import * as api from './api';
import { AssetsStep } from './steps/AssetsStep';
import { CampaignReviewStep } from './steps/CampaignReviewStep';
import { GenerateStep } from './steps/GenerateStep';
import { CadenceStep } from './steps/CadenceStep';
import { CampaignStep } from './steps/CampaignStep';
import { GoalStep, type SellTarget } from './steps/GoalStep';
import { PlanStep } from './steps/PlanStep';
import { ReviewStep } from './steps/ReviewStep';

const STEPS = ['Goal', 'Message', 'Plan', 'Cadence', 'Footage', 'Generate', 'Review', 'Book'] as const;
const LAST_STEP = STEPS.length;

const today = () => new Date().toISOString().slice(0, 10);

type Start = { goal: CampaignGoalDto; channels: string[]; startDate: string; targetId: string | null; subject: string };

export function AutomationWizard({ campaignId }: { campaignId?: string }) {
  const { me, product, href } = useWorkspace();
  const router = useRouter();

  const [campaign, setCampaign] = useState<CampaignDto | null>(null);
  const [start, setStart] = useState<Start>({ goal: 'leads', channels: ['tiktok'], startDate: today(), targetId: null, subject: '' });
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [gaps, setGaps] = useState<AssetGapDto[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product || !campaignId) return;
    let cancelled = false;
    api.getCampaign(product, campaignId)
      .then((c) => {
        if (cancelled) return;
        setCampaign(c);
        setStep(c.status === 'scheduled' ? LAST_STEP : c.step);
      })
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err.message : 'Could not open that campaign.'));
    return () => {
      cancelled = true;
    };
  }, [product, campaignId]);

  const guard = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const save = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!product || !campaign) return;
      const next = await guard(() => api.patchCampaign(product, campaign.id, patch));
      if (next) setCampaign(next);
    },
    [product, campaign, guard],
  );

  const goTo = (next: number) => {
    setStep(next);
    if (campaign && product) void api.patchCampaign(product, campaign.id, { step: next }).catch(() => undefined);
  };

  /**
   * Step 1 creates the row. Step 2 asks the Template Engine for the week, but only the first time —
   * coming back to step 2 later must not silently discard days she has swapped.
   */
  const advance = async () => {
    if (!product) return;

    if (step === 1) {
      const created =
        campaign ??
        (await guard(() =>
          api.startCampaign(product, {
            goal: start.goal,
            channels: start.channels,
            startDate: start.startDate,
            ...(start.targetId ? { productId: start.targetId } : {}),
            ...(start.subject.trim() ? {} : {}),
          }),
        ));
      if (!created) return;
      setCampaign(created);
      // A typed "what are you selling" line is campaign copy, not a product row.
      if (start.subject.trim() && !created.campaignSubject) {
        void api.patchCampaign(product, created.id, { campaignSubject: start.subject, useBrandSubject: false }).catch(() => undefined);
      }
      setStep(2);
      void api.patchCampaign(product, created.id, { step: 2 }).catch(() => undefined);
      return;
    }

    if (step === 2 && campaign) {
      if (campaign.posts.length === 0) {
        const planned = await guard(() => api.buildPlan(product, campaign.id));
        if (!planned) return;
        setCampaign(planned);
      }
      goTo(3);
      return;
    }

    goTo(step + 1);
  };

  // Shop is the only studio with products to sell; Brand types a line instead.
  useEffect(() => {
    if (product !== 'shop') return;
    apiFetch<{ products: { id: string; name: string }[] }>('/api/app/products')
      .then((r) => setProducts(r.products ?? []))
      .catch(() => setProducts([]));
  }, [product]);

  useEffect(() => {
    if (step !== LAST_STEP || !product || !campaign) return;
    api.readGaps(product, campaign.id).then((r) => setGaps(r.gaps)).catch(() => setGaps([]));
  }, [step, product, campaign]);

  if (!product) return null;

  const ws = me?.workspace ?? null;
  const sellTarget: SellTarget =
    product === 'shop' ? { kind: 'product', options: products } : { kind: 'text' };

  const canAdvance = step === 1 ? start.channels.length > 0 : true;

  const postAction = async (postId: string, body: Record<string, unknown>) => {
    if (!campaign) return;
    setBusyPostId(postId);
    const next = await guard(() => api.patchPost(product, campaign.id, postId, body));
    if (next) setCampaign(next);
    setBusyPostId(null);
  };

  const schedule = async () => {
    if (!campaign) return;
    const done = await guard(() => api.scheduleCampaign(product, campaign.id));
    if (done) router.push(href('/calendar'));
  };

  return (
    <div className="flex flex-col gap-6">
      <Stepper steps={STEPS} current={step} />

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>}

      {step === 1 && (
        <GoalStep
          goal={campaign?.goal ?? start.goal}
          channels={campaign?.channels ?? start.channels}
          sellTarget={sellTarget}
          targetId={campaign?.productId ?? start.targetId}
          subject={start.subject}
          onChange={(patch) => {
            if (campaign) {
              void save({
                ...(patch.goal ? { goal: patch.goal } : {}),
                ...(patch.channels ? { channels: patch.channels } : {}),
                ...(patch.targetId !== undefined ? { productId: patch.targetId } : {}),
              });
            }
            setStart((prev) => ({ ...prev, ...patch } as Start));
          }}
        />
      )}

      {step === 2 && campaign && (
        <CampaignStep
          brandPromoting={ws?.promoting ?? null}
          brandOffer={ws?.offer ?? null}
          subject={campaign.campaignSubject}
          message={campaign.campaignMessage}
          useBrandSubject={campaign.useBrandSubject}
          useBrandMessage={campaign.useBrandMessage}
          promo={campaign.promo}
          notes={campaign.notes}
          onChange={(patch) => void save(patch)}
        />
      )}

      {step === 3 && campaign && (
        <PlanStep
          posts={campaign.posts}
          busyPostId={busyPostId}
          onSwap={(postId, templateId) => void postAction(postId, { templateId })}
          onLoadOptions={(postId): Promise<TemplateDto[]> => api.swapOptions(product, campaign.id, postId)}
          onToggleSkip={(postId, skipped) => void postAction(postId, { skipped })}
          onSource={(postId, source: ContentSourceDto) => void postAction(postId, { source })}
          onRegenerate={() => {
            if (!window.confirm('Build a fresh plan? Any days you changed go back to our pick.')) return;
            void guard(() => api.buildPlan(product, campaign.id)).then((next) => next && setCampaign(next));
          }}
        />
      )}

      {step === 4 && campaign && (
        <CadenceStep
          postsPerDay={campaign.postsPerDay}
          weeks={campaign.weeks}
          startDate={campaign.startDate}
          channels={campaign.channels}
          onChange={(patch) => void save(patch)}
        />
      )}

      {step === 5 && campaign && (
        <AssetsStep posts={campaign.posts} assetMethod={campaign.assetMethod} onChange={(patch) => void save(patch)} />
      )}

      {step === 6 && campaign && <GenerateStep posts={campaign.posts} onDone={() => goTo(7)} />}

      {step === 7 && campaign && (
        <CampaignReviewStep
          posts={campaign.posts}
          channels={campaign.channels}
          savingPostId={busyPostId}
          onCaption={(postId, caption) => void postAction(postId, { caption })}
        />
      )}

      {step === 8 && campaign && (
        <ReviewStep
          campaign={campaign}
          gaps={gaps}
          scheduling={busy}
          onSchedule={() => void schedule()}
          onBackToAssets={() => goTo(5)}
        />
      )}

      <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-2xl border border-app-line bg-app-bg/95 p-3 backdrop-blur-md lg:bottom-4">
        <button
          type="button"
          disabled={step === 1}
          onClick={() => goTo(step - 1)}
          className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-[13px] text-app-muted transition-opacity duration-200 disabled:opacity-30"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" /> Back
        </button>
        {step < LAST_STEP && (
          <AppButton
            size="md"
            loading={busy}
            disabled={!canAdvance}
            onClick={() => void advance()}
          >
            {step === 2 ? 'Build my week' : step === 5 ? 'Prepare my posts' : 'Next'}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </AppButton>
        )}
      </div>
    </div>
  );
}
