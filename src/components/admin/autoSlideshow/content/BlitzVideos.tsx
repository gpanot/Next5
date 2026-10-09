'use client';

import Link from 'next/link';
import type { BlitzScheduleDto, BlitzScheduleStatus } from '../../../../types/admin/blitzSchedule';
import { CoverMedia } from '../../../labs/addToCalendar/CoverMedia';
import { useBlitzOnCalendar } from '../calendar/useBlitzOnCalendar';

const STATUS: Record<Exclude<BlitzScheduleStatus, 'canceled'>, { label: string; tone: string }> = {
  planned: { label: 'To approve', tone: 'bg-app-sunken text-app-ink' },
  scheduled: { label: 'Scheduled', tone: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  rendering: { label: 'Making', tone: 'bg-app-sunken text-app-muted' },
  sending: { label: 'Posting', tone: 'bg-app-sunken text-app-muted' },
  processing: { label: 'Posting', tone: 'bg-app-sunken text-app-muted' },
  posted: { label: 'Posted', tone: 'bg-app-accent-soft text-app-accent' },
  failed: { label: 'Failed', tone: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' },
};

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

function VideosSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-busy="true" aria-label="Loading your Blitz videos">
      {Array.from({ length: 5 }, (_, i) => <div key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-app-sunken" />)}
    </div>
  );
}

/** One Blitz video: its cover, first line, day and status. Tap: opens it in the Blitz editor. */
function VideoTile({ item, href }: { item: BlitzScheduleDto; href: string }) {
  const status = STATUS[item.status as keyof typeof STATUS];
  return (
    <Link href={href} className="group flex min-w-0 flex-col gap-2">
      <span className="relative block aspect-[9/16] overflow-hidden rounded-xl bg-app-sunken shadow-sm transition group-hover:-translate-y-0.5">
        {item.coverUrl && <CoverMedia src={item.coverUrl} video={item.coverIsVideo} alt={item.title} />}
        {status && <span className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium ${status.tone}`}>{status.label}</span>}
      </span>
      <span className="line-clamp-2 text-sm leading-snug text-app-ink">{item.title}</span>
      <span className="text-xs text-app-muted">{day(item.scheduledAt)}</span>
    </Link>
  );
}

/** Library › Blitz: the workspace's Blitz videos, soonest day last (newest plans first). */
export function BlitzVideos({ token, workspaceId }: { token: string; workspaceId: string }) {
  const { items, loaded } = useBlitzOnCalendar(token, workspaceId);
  if (!loaded) return <VideosSkeleton />;
  const shown = items.filter((i) => i.status !== 'canceled').sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  if (shown.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-app-line p-8 text-center">
        <p className="text-base font-medium text-app-ink">No Blitz videos yet</p>
        <p className="mt-1 text-sm text-app-muted">Keep a Blitz idea and it is made into a video here.</p>
        <Link href={`/slideshow/${workspaceId}/ideas`} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95">
          Swipe ideas
        </Link>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
      {shown.map((item) => <VideoTile key={item.id} item={item} href={`/slideshow/${workspaceId}/content?editPost=${item.id}`} />)}
    </div>
  );
}
