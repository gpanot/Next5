'use client';

import type { CampaignSummaryDto } from '../../../../types/admin/slideshowCampaign';
import { labelOf, postCount, statusOf, whenOf } from './campaignSummary';

/** Thumbs a row shows before "+N": fewer on phones (390 px), more from `sm` up. */
const PHONE_THUMBS = 4;
const WIDE_THUMBS = 6;

/** One post's 9:16 thumb; past PHONE_THUMBS it shows from `sm` up only. A post with no photo yet is a blank. */
function PostThumb({ url, index }: { url: string | null; index: number }) {
  return (
    <span className={`relative aspect-[9/16] w-11 shrink-0 overflow-hidden rounded-lg border border-app-line bg-app-sunken sm:w-12 ${index >= PHONE_THUMBS ? 'hidden sm:block' : 'block'}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />}
    </span>
  );
}

/** "+N" after the thumbs: one count for phones, one from `sm` up. */
function MoreChip({ more, className }: { more: number; className: string }) {
  if (more <= 0) return null;
  return <span className={`${className} aspect-[9/16] w-11 shrink-0 items-center justify-center rounded-lg border border-app-line bg-app-sunken text-xs font-semibold text-app-muted sm:w-12`}>+{more}</span>;
}

/** One campaign as a list row: a thumb per post, then its name, where it stands and its post count. */
export function CampaignRow({ c, onOpen }: { c: CampaignSummaryDto; onOpen: () => void }) {
  const total = postCount(c);
  const thumbs = c.postThumbs.length > 0 ? c.postThumbs : [c.coverUrl];
  return (
    <li>
      <button type="button" onClick={onOpen} className="block w-full rounded-xl border border-app-line bg-app-panel p-3 text-left shadow-sm transition hover:border-app-muted active:scale-[0.99]">
        <span className="flex gap-1.5" aria-hidden>
          {thumbs.slice(0, WIDE_THUMBS).map((url, i) => <PostThumb key={i} url={url} index={i} />)}
          <MoreChip more={total - PHONE_THUMBS} className="flex sm:hidden" />
          <MoreChip more={total - WIDE_THUMBS} className="hidden sm:flex" />
        </span>
        <span className="mt-3 flex items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-app-ink">{labelOf(c)}</span>
            <span className="block truncate text-xs text-app-muted">{statusOf(c, false)} · {whenOf(c.updatedAt)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-app-ink">
            {total} {total === 1 ? 'post' : 'posts'}
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-app-muted">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </span>
        </span>
      </button>
    </li>
  );
}

/** Loading rows, shaped like CampaignRow. */
export function CampaignRowsSkeleton() {
  return (
    <ul className="space-y-2" aria-busy="true" aria-label="Loading campaigns">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="rounded-xl border border-app-line bg-app-panel p-3">
          <div className="flex gap-1.5">
            {Array.from({ length: 3 }, (_, j) => <div key={j} className="aspect-[9/16] w-11 animate-pulse rounded-lg bg-app-sunken sm:w-12" />)}
          </div>
          <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-app-sunken" />
          <div className="mt-1.5 h-3 w-1/3 animate-pulse rounded bg-app-sunken" />
        </li>
      ))}
    </ul>
  );
}
