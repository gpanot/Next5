'use client';

/**
 * Realtor Autopilot: 3 steps instead of the old 8 (docs/business-studios/15-realtor-autopilot-plan.md §3.2).
 * 1 What's happening → 2 Your plan (real dates, skip a day) → 3 Approve, then watch the posts get made.
 */
import { ArrowLeft, CalendarDays, Plus, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ApiError } from '../../../lib/apiClient';
import { useApi } from '../../../hooks/useApi';
import { beatOf, isPlaybookId, nextMonday, type PlaybookId } from '../../../lib/realtorPlaybooks';
import type { CampaignDto, CampaignPostDto } from '../../../types/business/campaigns';
import { AppButton } from '../../ui/AppButton';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonText } from '../../ui/Skeleton';
import { AppPage } from '../shell/AppShell';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { AutomationWizard } from '../automation/AutomationWizard';
import * as api from './api';
import { toMarketInfo, type MarketAreaResponse } from './api';
import { isDisclosureValid } from './DisclosureForm';
import { isAreaDraftValid } from './MarketAreaForm';
import { isEventValid } from './OpenHouseForm';
import { dollars, isPriceValid } from './PriceDropForm';
import { MadeDays } from './MadeDays';
import { PlanDays } from './PlanDays';
import { PlaybookPostSheet, type PlaybookPreview } from './PlaybookPostSheet';
import { TopBarSteps } from './TopBarSteps';
import { usePlaybook } from './usePlaybook';
import { useResumePlan } from './useResumePlan';
import { LISTING_MOMENTS, WhatStep, type MarketInfo, type WhatValue } from './WhatStep';

const STEPS = ['What', 'Plan', 'Approve'] as const;
const today = () => new Date().toISOString().slice(0, 10);

type Props = {
  campaignId: string | null;
  listingId: string | null;
  moment: string | null;
  date: string | null;
  /** Reopen the plan she was in the middle of (a bare Autopilot visit). */
  resume: boolean;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Market updates go out on Mondays; everything else starts today (or the day she tapped on the calendar). */
const startFor = (moment: string, date: string | null) => (moment === 'market_update' ? nextMonday(new Date()) : date && ISO_DATE.test(date) && date >= today() ? date : today());

const PLAN_LABEL: Record<PlaybookId, string> = {
  just_listed: 'Plan my week', open_house: 'Plan the open house', price_drop: 'Plan the price drop', just_sold: 'Plan the sold posts',
  market_update: 'Plan this update', evergreen: 'Fill my empty days',
};

/** Step 1 can go on when the moment's own question is answered. */
const canPlanWith = (what: WhatValue, market: MarketInfo | null): boolean => {
  if (what.channels.length === 0) return false;
  if (what.moment === 'evergreen') return true;
  if (what.moment === 'market_update') {
    const area = what.area ?? market?.area ?? null;
    return Boolean(area && isAreaDraftValid(area));
  }
  if (!what.listingId) return false;
  const disclosure = what.disclosure ?? market?.disclosure ?? null;
  if (!market?.hasDisclosure && !(disclosure && isDisclosureValid(disclosure))) return false;
  if (what.moment === 'open_house') return isEventValid(what.event, today());
  if (what.moment === 'price_drop') return isPriceValid(what.price);
  return true;
};

const bodyOf = (what: WhatValue): api.CreatePlaybookBody => {
  const playbook = (isPlaybookId(what.moment) ? what.moment : 'just_listed') as PlaybookId;
  const e = what.event;
  return {
    playbook,
    listingId: LISTING_MOMENTS.includes(playbook) ? what.listingId : null,
    startDate: what.startDate,
    channels: what.channels,
    event: playbook === 'open_house' && e ? { start: `${e.date}T${e.start}`, end: e.end ? `${e.date}T${e.end}` : null, source: e.source } : null,
    newPriceUsd: playbook === 'price_drop' ? dollars(what.price.newPrice) : null,
    oldPriceUsd: playbook === 'price_drop' && what.price.oldPrice ? dollars(what.price.oldPrice) : null,
  };
};

const previewOf = (post: CampaignPostDto): PlaybookPreview => ({
  title: beatOf(post.beatKey)?.label ?? post.templateName,
  format: post.format,
  videoUrl: post.media?.videoUrl ?? null,
  slideUrls: post.media?.slideUrls ?? [],
  caption: post.caption,
});

/** The page frame: title, and the 3 steps in the top bar. */
const Frame = ({ step, children }: { step: number; children: ReactNode }) => (
  <AppPage title="Plan my week" progress={<TopBarSteps steps={STEPS} current={step} />}>{children}</AppPage>
);

export function PlaybookWizard({ campaignId, listingId, moment, date, resume }: Props) {
  const router = useRouter();
  const { href } = useWorkspace();
  const resuming = useResumePlan(resume && !campaignId, (id) => router.replace(`${href('/automation')}?id=${id}`));
  const { campaign, setCampaign, loading, error: loadError, reload, making } = usePlaybook(campaignId);
  const startMoment = moment && isPlaybookId(moment) ? moment : 'just_listed';
  const [what, setWhat] = useState<WhatValue>({
    moment: startMoment, listingId, startDate: startFor(startMoment, date), channels: ['instagram', 'tiktok'],
    area: null, event: null, price: { newPrice: '', oldPrice: '' }, disclosure: null,
  });
  const marketApi = useApi<MarketAreaResponse>(campaignId ? null : '/api/app/autopilot/market-area');
  const market = toMarketInfo(marketApi.data);
  const [busy, setBusy] = useState(false);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PlaybookPreview | null>(null);

  const run = async (fn: () => Promise<CampaignDto>) => {
    setBusy(true);
    setError(null);
    try {
      const next = await fn();
      setCampaign(next);
      return next;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const isMarket = what.moment === 'market_update';
  const area = what.area ?? market?.area ?? null;
  const canPlan = canPlanWith(what, market);

  const createPlan = async () => {
    if (!canPlan) return;
    const created = await run(async () => {
      if (isMarket && area) await api.saveMarketArea(area);
      if (LISTING_MOMENTS.includes(what.moment) && what.disclosure && !market?.hasDisclosure) await api.saveDisclosure(what.disclosure);
      return api.createPlaybook(bodyOf(what));
    });
    if (created) router.replace(`${href('/automation')}?id=${created.id}`);
  };

  const changeWhat = (patch: Partial<WhatValue>) =>
    setWhat((prev) => {
      const next = { ...prev, ...patch };
      if (patch.moment && patch.moment !== prev.moment) next.startDate = startFor(patch.moment, date);
      return next;
    });

  const postAction = async (post: CampaignPostDto, fn: () => Promise<CampaignDto>) => {
    setBusyPostId(post.id);
    await run(fn);
    setBusyPostId(null);
  };

  // `new=1` skips the resume check, so a fresh plan can start while another is still being made.
  const freshPlan = () => router.replace(`${href('/automation')}?new=1`);
  const startOver = async () => {
    if (campaign) await api.discardPlaybook(campaign.id).catch(() => undefined);
    freshPlan();
  };

  if (resuming || (campaignId && loading)) return <Frame step={1}><SkeletonText lines={6} /></Frame>;
  if (campaignId && loadError) return <Frame step={1}><ErrorState message={loadError} onRetry={() => void reload()} /></Frame>;
  // Campaigns made with the old 8-step wizard keep opening there.
  if (campaign && !campaign.playbook) return <AppPage title="Plan my week"><AutomationWizard campaignId={campaign.id} /></AppPage>;

  const step = !campaign ? 1 : campaign.status === 'draft' ? 2 : 3;
  const live = campaign?.posts.filter((p) => !p.skipped) ?? [];

  return (
    <Frame step={step}>
      <div className="flex flex-col gap-6">
        {error && <p className="rounded-xl bg-app-accent-soft px-3 py-2 text-[13px] text-app-danger" role="alert">{error}</p>}

        {step === 1 && <WhatStep value={what} market={market} onChange={changeWhat} onLocked={() => router.push(href('/billing'))} />}

        {step === 2 && campaign && (
          <>
            <p className="text-[14px] text-app-muted">{live.length} posts on your free days. Turn off any you don&apos;t want.</p>
            <PlanDays posts={campaign.posts} busyPostId={busyPostId} onToggle={(post, keep) => void postAction(post, () => api.skipPost(campaign.id, post.id, !keep))} />
          </>
        )}

        {step === 3 && campaign && (
          <>
            <p className="text-[14px] text-app-muted">
              {making
                ? 'Making your posts. Videos take about 3 minutes. You can leave: Autopilot brings you back here.'
                : 'Your posts are on the calendar. Tap one to see it.'}
            </p>
            <MadeDays
              posts={campaign.posts}
              busyPostId={busyPostId}
              startedAt={campaign.scheduledAt}
              onOpen={(post) => setPreview(previewOf(post))}
              onRetry={(post) => void postAction(post, () => api.retryPost(campaign.id, post.id))}
            />
          </>
        )}

        <div className="sticky bottom-20 z-10 rounded-2xl border border-app-line bg-app-panel p-3 shadow-lg lg:bottom-4">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <AppButton variant="ghost" iconLeft={<ArrowLeft aria-hidden className="h-4 w-4" />} onClick={() => void startOver()} disabled={busy}>Start over</AppButton>
            )}
            {step === 1 && (
              <AppButton fullWidth size="lg" loading={busy} disabled={!canPlan} onClick={() => void createPlan()}>{isPlaybookId(what.moment) ? PLAN_LABEL[what.moment] : 'Plan my week'}</AppButton>
            )}
            {step === 2 && (
              <AppButton fullWidth size="lg" loading={busy} disabled={live.length === 0} iconLeft={<Sparkles aria-hidden className="h-4 w-4" />} onClick={() => void run(() => api.approvePlaybook(campaign!.id))}>
                Approve and make {live.length} posts
              </AppButton>
            )}
            {step === 3 && !making && (
              <AppButton variant="ghost" iconLeft={<Plus aria-hidden className="h-4 w-4" />} onClick={freshPlan}>New plan</AppButton>
            )}
            {step === 3 && (
              <AppButton fullWidth size="lg" variant="secondary" disabled={making} iconLeft={<CalendarDays aria-hidden className="h-4 w-4" />} onClick={() => router.push(href('/calendar'))}>
                {making ? 'Making your posts…' : 'Open calendar'}
              </AppButton>
            )}
          </div>
        </div>

        {preview && <PlaybookPostSheet post={preview} onClose={() => setPreview(null)} />}
      </div>
    </Frame>
  );
}
