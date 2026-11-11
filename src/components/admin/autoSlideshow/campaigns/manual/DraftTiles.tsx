'use client';

import { useEffect, useRef, useState } from 'react';
import type { ManualDraftDto } from '../../../../../types/admin/autoSlideshow';
import { useAdminApi } from '../../../business/useAdminApi';
import { MakingCountdown, TYPICAL_MAKE_MS } from '../../calendar/MakingCountdown';
import { ManualWizardSheet } from './ManualWizardSheet';

/** How often the cards check a slideshow being finished. */
const POLL_MS = 5_000;

const STAGE_LABEL: Record<'story' | 'photo', string> = {
  story: 'Review the story',
  photo: 'Review the first photo',
};

const frame = 'relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-app-sunken shadow-sm';

/** The first slide's photo behind a card, when it has one. */
function CardPhoto({ url, dim }: { url: string | null; dim: boolean }) {
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={`absolute inset-0 h-full w-full object-cover ${dim ? 'opacity-60' : ''}`} />;
}

/** A draft being finished: its first slide under the same countdown as slideshows the auto run is making. */
function FinishingCard({ draft }: { draft: ManualDraftDto }) {
  return (
    <div className={frame} aria-label={`Finishing: ${draft.slides[0]?.title ?? 'your slideshow'}`}>
      <CardPhoto url={draft.photoUrl} dim={false} />
      <MakingCountdown since={draft.finishingSince ?? draft.createdAt} totalMs={TYPICAL_MAKE_MS} label="Finishing your slideshow" overCover={Boolean(draft.photoUrl)} />
    </div>
  );
}

/** A draft waiting on the owner: tap it to pick up where it was left. */
function DraftCard({ draft, onOpen }: { draft: ManualDraftDto; onOpen: () => void }) {
  const stage = draft.stage === 'photo' ? 'photo' : 'story';
  return (
    <button type="button" onClick={onOpen} className={`${frame} flex flex-col justify-end border border-app-line p-3 text-left transition hover:border-app-cta active:scale-[0.98]`}>
      <CardPhoto url={draft.photoUrl} dim />
      <span className="absolute top-2 left-2 rounded-full bg-app-panel px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-app-ink shadow-sm">Draft</span>
      <span className="relative line-clamp-3 text-sm font-semibold text-app-ink">{draft.slides[0]?.title}</span>
      <span className={`relative mt-1 text-xs font-medium ${draft.error ? 'text-app-danger' : 'text-app-muted'}`}>{draft.error ? 'Needs another try' : STAGE_LABEL[stage]}</span>
    </button>
  );
}

type Props = {
  token: string;
  runId: string;
  /** Bumped when the page loads its slideshows again (a new draft may exist). */
  reloadKey: number;
  /** A draft was finished or deleted: the run's slideshows load again. */
  onChanged: () => void;
};

/**
 * The latest run's hand-made slideshows not finished yet. Waiting on the owner: Draft cards that reopen the wizard.
 * Being finished: a countdown card, checked every few seconds; once it is ready the run's slideshows load again and
 * it shows there like any other.
 */
export function DraftTiles({ token, runId, reloadKey, onChanged }: Props) {
  const drafts = useAdminApi<{ drafts: ManualDraftDto[] }>(token, `/api/admin/auto-slideshow/runs/${runId}/manual`);
  const { refresh } = drafts;
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    if (reloadKey > 0) refresh();
  }, [reloadKey, refresh]);

  const list = drafts.data?.drafts ?? [];
  const finishingIds = list.filter((d) => d.stage === 'finishing').map((d) => d.id).join(',');
  useEffect(() => {
    if (!finishingIds) return;
    const timer = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(timer);
  }, [finishingIds, refresh]);

  // A card that stopped finishing became a slideshow (or went back to its photo step): the run loads again.
  const seen = useRef('');
  useEffect(() => {
    const before = seen.current.split(',').filter(Boolean);
    seen.current = finishingIds;
    if (before.some((id) => !finishingIds.split(',').includes(id))) onChanged();
  }, [finishingIds, onChanged]);

  return (
    <>
      {list.map((d) => (
        <li key={d.id}>{d.stage === 'finishing' ? <FinishingCard draft={d} /> : <DraftCard draft={d} onOpen={() => setOpenId(d.id)} />}</li>
      ))}
      {openId && (
        <ManualWizardSheet token={token} runId={runId} draftId={openId}
          onClose={(changed) => {
            setOpenId(null);
            refresh();
            if (changed) onChanged();
          }} />
      )}
    </>
  );
}
