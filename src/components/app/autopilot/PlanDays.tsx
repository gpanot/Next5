'use client';

import { Clapperboard, Images } from 'lucide-react';
import { beatOf } from '../../../lib/realtorPlaybooks';
import type { CampaignPostDto } from '../../../types/business/campaigns';
import { Switch } from '../../ui/Switch';

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

type Props = {
  posts: CampaignPostDto[];
  busyPostId: string | null;
  onToggle: (post: CampaignPostDto, keep: boolean) => void;
};

/** Step 2: the plan on real dates. Days already on her calendar were skipped when it was placed. */
export const PlanDays = ({ posts, busyPostId, onToggle }: Props) => (
  <ol className="flex flex-col gap-2">
    {posts.map((post) => {
      const beat = beatOf(post.beatKey);
      const Icon = post.format === 'listing_video' ? Clapperboard : Images;
      return (
        <li
          key={post.id}
          className={`flex items-center gap-3 rounded-xl border border-app-line bg-app-panel p-3 shadow-sm transition-opacity duration-200 ${post.skipped ? 'opacity-50' : ''}`}
        >
          <span className="flex w-12 shrink-0 flex-col items-center text-center">
            <span className="text-[11px] font-semibold uppercase text-app-muted">{dayLabel(post.date).split(',')[0]}</span>
            <span className="text-[13px] font-semibold text-app-ink">{dayLabel(post.date).split(', ')[1]}</span>
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-sunken text-app-ink">
            <Icon aria-hidden className="h-4 w-4" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[14px] font-medium text-app-ink">{beat?.label ?? post.templateName}</span>
            <span className="truncate text-[12px] text-app-muted">{post.idea}</span>
          </span>
          <Switch
            checked={!post.skipped}
            disabled={busyPostId === post.id}
            onChange={(keep: boolean) => onToggle(post, keep)}
          />
        </li>
      );
    })}
  </ol>
);
