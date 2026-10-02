'use client';

import { useState } from 'react';
import { PLATFORM_LABELS } from '../../../../types/admin/autoSlideshow';
import type { AnalyticsPostDto } from '../../../../types/admin/slideshowAnalytics';
import { PostStatsLine } from '../posting/PostStats';
import { InstagramGlyph, TikTokGlyph } from '../workspace/PlatformBadges';
import { badgeOf, engagementRate, type Badge } from './insights';
import { StatsHistory } from './StatsHistory';

const BADGE_STYLE: Record<Exclude<Badge, null>, { text: string; className: string }> = {
  winner: { text: 'Winner', className: 'bg-app-success/15 text-app-success' },
  flop: { text: 'Flop', className: 'bg-app-danger/15 text-app-danger' },
};

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const noNumbersText = (post: AnalyticsPostDto): string | null => {
  if (post.noNumbers === 'private') return 'Private post: no public numbers';
  if (post.noNumbers !== 'pending') return null;
  return post.nextStatsAt ? `First numbers ${shortDate(post.nextStatsAt)}` : 'Numbers unavailable';
};

function Thumbnail({ url }: { url: string | null }) {
  return (
    <div className="aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-lg bg-app-sunken sm:w-20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />}
    </div>
  );
}

function Details({ post }: { post: AnalyticsPostDto }) {
  return (
    <div className="space-y-3 border-t border-app-line px-3 pt-3 pb-4 sm:px-4">
      {post.snapshots.length > 0 ? <StatsHistory snapshots={post.snapshots} /> : <p className="text-xs text-app-muted">No reads yet.</p>}
      <p className="text-xs text-app-muted">{post.hookPattern} · {post.modelName}</p>
      {post.postUrl && (
        <a href={post.postUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-app-line px-4 text-sm font-semibold text-app-ink transition hover:bg-app-sunken active:scale-95">
          Open on {PLATFORM_LABELS[post.platform]}
        </a>
      )}
    </div>
  );
}

/** One live post: first slide, hook, numbers and badge. Tap to see how its numbers grew. */
export function PostCard({ post, lift }: { post: AnalyticsPostDto; lift: number | null }) {
  const [open, setOpen] = useState(false);
  const badge = badgeOf(lift);
  const rate = engagementRate(post.stats);
  const missing = noNumbersText(post);
  return (
    <li className="overflow-hidden rounded-xl border border-app-line bg-app-panel shadow-sm">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full gap-3 p-3 text-left transition active:bg-app-sunken sm:p-4">
        <Thumbnail url={post.thumbnailUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-app-muted">
            <span aria-label={PLATFORM_LABELS[post.platform]} className="text-app-ink">{post.platform === 'instagram' ? <InstagramGlyph /> : <TikTokGlyph />}</span>
            <span>{shortDate(post.postedAt)}</span>
            {badge && <span className={`rounded-full px-2 py-0.5 font-bold ${BADGE_STYLE[badge].className}`}>{BADGE_STYLE[badge].text}</span>}
            {lift !== null && <span className="ml-auto font-semibold tabular-nums">{lift.toFixed(1)}×</span>}
          </div>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-app-ink">{post.hook}</p>
          {missing ? <p className="mt-1 text-xs text-app-muted">{missing}</p> : <PostStatsLine stats={post.stats} className="mt-1 text-app-muted" />}
          {rate !== null && <p className="text-xs text-app-muted tabular-nums">{(rate * 100).toFixed(1)}% engagement</p>}
        </div>
      </button>
      {open && <Details post={post} />}
    </li>
  );
}
