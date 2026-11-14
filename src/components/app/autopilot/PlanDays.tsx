'use client';

import { Clapperboard, Images, Pencil } from 'lucide-react';
import { beatOf } from '../../../lib/realtorPlaybooks';
import type { CampaignPostDto } from '../../../types/business/campaigns';
import { Switch } from '../../ui/Switch';

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

type Props = {
  posts: CampaignPostDto[];
  busyPostId: string | null;
  today: string;
  onMove: (post: CampaignPostDto, date: string) => void;
  onToggle: (post: CampaignPostDto, keep: boolean) => void;
};

/** Step 2: the plan on real dates. Days already on her calendar were skipped when it was placed. */
export const PlanDays = ({ posts, busyPostId, today, onMove, onToggle }: Props) => (
  <ol className="flex flex-col gap-2">
    {posts.map((post) => {
      const beat = beatOf(post.beatKey);
      const Icon = post.format === 'listing_video' ? Clapperboard : Images;
      return (
        <li
          key={post.id}
          className={`flex items-center gap-3 rounded-xl border border-app-line bg-app-panel p-3 shadow-sm transition-opacity duration-200 ${post.skipped ? 'opacity-50' : ''}`}
        >
          <label
            className="relative flex w-14 shrink-0 cursor-pointer flex-col items-center rounded-lg px-1 py-1 text-center transition-colors duration-200 hover:bg-app-sunken focus-within:ring-2 focus-within:ring-app-accent"
            title="Change the date"
          >
            <span className="text-[11px] font-semibold uppercase text-app-muted">{dayLabel(post.date).split(',')[0]}</span>
            <span className="text-[13px] font-semibold text-app-ink">{dayLabel(post.date).split(', ')[1]}</span>
            <span className="flex items-center gap-0.5 text-[10px] text-app-muted"><Pencil aria-hidden className="h-2.5 w-2.5" />Edit</span>
            <input
              type="date"
              aria-label={`Change date of ${beat?.label ?? post.templateName}`}
              value={post.date}
              min={today}
              disabled={busyPostId === post.id}
              onClick={(e) => { try { e.currentTarget.showPicker(); } catch { /* the browser opens it itself */ } }}
              onChange={(e) => e.target.value && e.target.value !== post.date && onMove(post, e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
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
