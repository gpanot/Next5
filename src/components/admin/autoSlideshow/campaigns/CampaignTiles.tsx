'use client';

import type { ReactNode } from 'react';
import type { CampaignSummaryDto } from '../../../../types/admin/slideshowCampaign';
import { CoverPlayback } from '../CoverPlayback';
import { AddTile } from './AddTile';
import { CampaignRow } from './CampaignRow';
import { labelOf, statusOf, whenOf } from './campaignSummary';
import { PreviewSlideView } from './PreviewSlideView';

export function CampaignTilesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6" aria-busy="true" aria-label="Loading campaigns">
      {Array.from({ length: 5 }, (_, i) => <div key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-app-sunken" />)}
    </div>
  );
}

/** The cover itself: the first made slide, or the first hook drawn on its photo, or a blank. */
function TileCover({ c }: { c: CampaignSummaryDto }) {
  return (
    <span className="relative block aspect-[9/16] overflow-hidden rounded-xl border border-app-line bg-app-sunken shadow-sm transition group-hover:shadow-md">
      {c.coverUrl && c.coverHook && (
        <span className="absolute inset-0">
          <PreviewSlideView slide={{ kind: 'draft', photoUrl: c.coverUrl, role: 'hook', body: '', ...c.coverHook }} />
        </span>
      )}
      {c.coverUrl && !c.coverHook && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      )}
      {!c.coverUrl && <span className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-app-muted">No photos yet</span>}
    </span>
  );
}

/** The campaign's first slideshow playing on its cover: the made slides, or the draft drawn as the editor does. */
function TilePlayback({ id, preview, children }: { id: string; preview: NonNullable<CampaignSummaryDto['preview']>; children: ReactNode }) {
  return (
    <CoverPlayback id={id} count={preview.slides.length} renderFrame={(i) => <PreviewSlideView slide={preview.slides[i]!} />} audio={preview.audio}>
      {children}
    </CoverPlayback>
  );
}

/** One campaign as its 9:16 cover (the first hook on its first photo), its name and where it stands. A made slideshow
 *  plays on the cover. */
export function CampaignTile({ c, onOpen }: { c: CampaignSummaryDto; onOpen: () => void }) {
  const cover = (
    <button type="button" onClick={onOpen} aria-label={`Open ${labelOf(c)}`} className="group block w-full transition active:scale-[0.98]">
      <TileCover c={c} />
    </button>
  );
  return (
    <li>
      {c.preview ? <TilePlayback id={c.id} preview={c.preview}>{cover}</TilePlayback> : cover}
      <button type="button" tabIndex={-1} aria-hidden onClick={onOpen} className="block w-full text-left">
        <span className="mt-2 block truncate text-sm font-semibold text-app-ink">{labelOf(c)}</span>
        <span className="block truncate text-xs text-app-muted">{statusOf(c)} · {whenOf(c.updatedAt)}</span>
      </button>
    </li>
  );
}

/** A small 9:16 cover for list rows: the first photo, or a blank. */
export function RowThumb({ url }: { url: string | null }) {
  return (
    <span className="relative block aspect-[9/16] w-12 shrink-0 overflow-hidden rounded-lg border border-app-line bg-app-sunken">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />}
    </span>
  );
}

/** A list row's look: thumb, two lines of text, a chevron. */
export const rowClass = 'flex w-full items-center gap-3 rounded-xl border border-app-line bg-app-panel p-2 pr-3 text-left shadow-sm transition hover:border-app-muted active:scale-[0.99]';

export const RowChevron = () => (
  <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-app-muted">
    <path d="m9 6 6 6-6 6" />
  </svg>
);

type CollectionProps = {
  campaigns: CampaignSummaryDto[];
  calendarOnly: boolean;
  view: 'cards' | 'list';
  onOpen: (id: string) => void;
  /** Cards only: a blank first card that starts a new campaign. */
  onAdd?: () => void;
  adding?: boolean;
};

/** The campaigns as cards or rows; "On calendar" keeps those with posts scheduled. */
export function CampaignCollection({ campaigns, calendarOnly, view, onOpen, onAdd, adding }: CollectionProps) {
  const shown = calendarOnly ? campaigns.filter((c) => c.scheduledCount > 0) : campaigns;
  if (shown.length === 0) {
    return <p className="rounded-xl border border-dashed border-app-line p-8 text-center text-sm text-app-muted">No campaign has posts on the calendar yet.</p>;
  }
  if (view === 'list') {
    return <ul className="space-y-2">{shown.map((c) => <CampaignRow key={c.id} c={c} onOpen={() => onOpen(c.id)} />)}</ul>;
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {onAdd && <AddTile label="New campaign" busy={adding} onAdd={onAdd} />}
      {shown.map((c) => <CampaignTile key={c.id} c={c} onOpen={() => onOpen(c.id)} />)}
    </ul>
  );
}
