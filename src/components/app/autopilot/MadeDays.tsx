'use client';

import { RotateCcw } from 'lucide-react';
import { beatOf } from '../../../lib/realtorPlaybooks';
import type { CampaignPostDto } from '../../../types/business/campaigns';
import { PostMedia } from './PostMedia';

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

type Props = {
  posts: CampaignPostDto[];
  busyPostId: string | null;
  onRetry: (post: CampaignPostDto) => void;
  onOpen: (post: CampaignPostDto) => void;
  /** Approve time: video cards count down 3 minutes from it. */
  startedAt: string | null;
};

/** Step 3 after approve: each post fills in as it is made. */
export const MadeDays = ({ posts, busyPostId, onRetry, onOpen, startedAt }: Props) => (
  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
    {posts.filter((p) => !p.skipped).map((post) => {
      const failed = post.mediaStatus === 'failed';
      return (
        <li key={post.id} className="flex flex-col gap-1.5">
          <button type="button" onClick={() => onOpen(post)} disabled={post.mediaStatus !== 'ready'} className="block w-full transition-opacity duration-200 enabled:hover:opacity-90">
            <PostMedia
              format={post.format}
              status={post.mediaStatus}
              coverUrl={post.media?.coverUrl ?? null}
              videoUrl={post.media?.videoUrl ?? null}
              slideCount={post.media?.slideUrls.length ?? 0}
              slideUrls={post.media?.slideUrls ?? []}
              startedAt={startedAt}
            />
          </button>
          <span className="text-[11px] font-semibold uppercase text-app-muted">{dayLabel(post.date)}</span>
          <span className="truncate text-[12px] text-app-ink">{beatOf(post.beatKey)?.label ?? post.templateName}</span>
          {failed && post.format === 'slideshow' && (
            <button
              type="button"
              onClick={() => onRetry(post)}
              disabled={busyPostId === post.id}
              className="flex items-center gap-1 text-[12px] font-medium text-app-accent transition-opacity duration-200 disabled:opacity-50"
            >
              <RotateCcw aria-hidden className="h-3 w-3" /> Try again
            </button>
          )}
        </li>
      );
    })}
  </ul>
);
