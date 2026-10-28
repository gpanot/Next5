'use client';

import { Check, Loader2, Plus, X } from 'lucide-react';
import { useState } from 'react';
import type { CampaignWaitingDto } from '../../../../types/admin/slideshowCampaign';
import { whenLabel } from '../../../labs/addToCalendar/slots';
import { adminFetch } from '../../business/useAdminApi';
import { CARD_SIZE } from '../ideas/IdeaDeck';
import { PreviewSlideView } from '../campaigns/PreviewSlideView';
import { SlidePlayer } from '../SlidePlayer';
import { CAMPAIGN_PLAN_EVENT } from './useCampaignsOnCalendar';

export type DeckTab = 'videos' | 'slideshows';

const TABS: { id: DeckTab; label: string }[] = [
  { id: 'videos', label: 'Videos' },
  { id: 'slideshows', label: 'Slideshows' },
];

const tabClass = (active: boolean) =>
  [
    'flex min-h-10 flex-1 items-center justify-center rounded-full px-4 text-sm font-semibold transition active:scale-95',
    active ? 'bg-app-cta text-app-cta-ink shadow-sm' : 'text-muted hover:text-ink dark:hover:text-zinc-100',
  ].join(' ');

/** "Videos" (the Blitz ideas deck) or "Slideshows" (campaign slideshows not on the Calendar yet), above the day's card. */
export function DeckTabs({ tab, onTab }: { tab: DeckTab; onTab: (tab: DeckTab) => void }) {
  return (
    <div role="tablist" aria-label="Post kind" className="mx-auto flex w-full max-w-xs gap-1 rounded-full border border-line bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
      {TABS.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => onTab(t.id)} className={tabClass(tab === t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

const round = 'flex items-center justify-center rounded-full border shadow-sm transition active:scale-90 disabled:opacity-30';

/** No slideshow left to place: an empty card that opens "How many slideshows?" to make Brand Cast ones. */
function CreateCard({ onCreate }: { onCreate: () => void }) {
  return (
    <button type="button" onClick={onCreate} className={`${CARD_SIZE.day} mx-auto flex flex-col items-center justify-center gap-2 rounded-[26px] border-2 border-dashed border-zinc-300 px-6 text-center transition hover:border-zinc-400 hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:bg-zinc-800/60`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-app-cta text-app-cta-ink shadow-sm">
        <Plus aria-hidden className="h-6 w-6" strokeWidth={2.6} />
      </span>
      <span className="text-base font-semibold text-ink dark:text-zinc-100">Create slideshows</span>
      <span className="text-xs text-muted">All slideshows already scheduled</span>
    </button>
  );
}

type Props = {
  waiting: CampaignWaitingDto[];
  loaded: boolean;
  token: string;
  /** Where a kept slideshow goes on this day (ISO); undefined when the day is full. */
  at: string | undefined;
  onCreate: () => void;
};

const keyOf = (w: CampaignWaitingDto) => `${w.campaignId}:${w.position}`;

/** Puts one campaign post on the Calendar at `at`, where it waits for approval like the others. A post only in the
 *  draft is made first (free, the whole campaign at once, as its Schedule does). */
const planOne = async (token: string, item: CampaignWaitingDto, at: string) => {
  if (!item.made) await adminFetch(token, `/api/slideshow/campaigns/${item.campaignId}/generate`, { method: 'POST', body: '{}' });
  await adminFetch(token, `/api/slideshow/campaigns/${item.campaignId}/plan`, { method: 'POST', body: JSON.stringify({ items: [{ position: item.position, at }] }) });
  window.dispatchEvent(new Event(CAMPAIGN_PLAN_EVENT));
};

/**
 * The day's Slideshows tab: campaign slideshows not on the Calendar yet, one at a time, like the videos deck. ✕ shows
 * the next one (it comes back later), ✓ puts it on this day. None left: a card that makes more.
 */
export function SlideshowDayDeck({ waiting, loaded, token, at, onCreate }: Props) {
  const [index, setIndex] = useState(0);
  const [slide, setSlide] = useState(0);
  // Placed ones hide at once, before the Calendar re-reads them.
  const [placed, setPlaced] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = waiting.filter((w) => !placed.includes(keyOf(w)));
  if (!loaded) return <div aria-label="Loading slideshows" className={`${CARD_SIZE.day} mx-auto animate-pulse rounded-[26px] bg-zinc-100 dark:bg-zinc-800`} />;
  if (list.length === 0) return <CreateCard onCreate={onCreate} />;
  if (!at) return null;
  const current = list[index % list.length]!;
  const skip = () => {
    setIndex((i) => i + 1);
    setSlide(0);
  };
  const keep = async () => {
    setBusy(true);
    setError(null);
    try {
      await planOne(token, current, at);
      setPlaced((p) => [...p, keyOf(current)]);
      setSlide(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add it to the Calendar');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col items-center gap-2 py-1 lg:gap-3">
      <div className={`${CARD_SIZE.day} overflow-hidden rounded-[26px] shadow-sm`}>
        <SlidePlayer key={keyOf(current)} count={current.slides.length} slideKey={String} index={slide} onIndex={setSlide} audio={current.audio} arrows={false}
          renderSlide={(i) => <PreviewSlideView slide={current.slides[i]!} />} />
      </div>
      <div className="flex items-center justify-center gap-5">
        <button type="button" onClick={skip} disabled={busy || list.length < 2} aria-label="Show the next slideshow" className={`${round} h-14 w-14 border-line bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200`}>
          <X aria-hidden className="h-6 w-6" />
        </button>
        <button type="button" onClick={() => void keep()} disabled={busy} aria-label="Post this slideshow on this day" className={`${round} h-14 w-14 border-app-cta bg-app-cta text-app-cta-ink hover:bg-app-cta/90`}>
          {busy ? <Loader2 aria-hidden className="h-6 w-6 animate-spin" /> : <Check aria-hidden className="h-6 w-6" />}
        </button>
      </div>
      {busy && !current.made && <p role="status" className="text-xs text-muted">Making your slideshows…</p>}
      <p className="text-xs text-muted">
        {list.length} waiting · Will be posted: <span className="font-semibold text-ink dark:text-zinc-100">{whenLabel(new Date(at))}</span>
      </p>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
