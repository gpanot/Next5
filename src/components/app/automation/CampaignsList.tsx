'use client';

/** Campaigns — drafts to finish and weeks already booked. */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, Plus } from 'lucide-react';
import type { CampaignDto } from '../../../types/business/campaigns';
import { AppButton } from '../../ui/AppButton';
import { EmptyState } from '../../ui/EmptyState';
import { SkeletonText } from '../../ui/Skeleton';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { listCampaigns } from './api';

const GOAL_LABELS: Record<string, string> = {
  leads: 'Get leads',
  enquiries: 'Get enquiries',
  sell: 'Sell something',
};

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-800',
  scheduled: 'bg-emerald-100 text-emerald-800',
  generated: 'bg-sky-100 text-sky-800',
};

export function CampaignsList() {
  const { product, href } = useWorkspace();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignDto[] | null>(null);

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    listCampaigns(product)
      .then((list) => !cancelled && setCampaigns(list))
      .catch(() => !cancelled && setCampaigns([]));
    return () => {
      cancelled = true;
    };
  }, [product]);

  if (!product || campaigns === null) return <SkeletonText lines={4} />;

  if (campaigns.length === 0) {
    return (
      <EmptyState
        title="No campaigns yet"
        body="Pick a goal and we plan your week — what to post each day, and what to film for it."
        action={{ label: 'Plan my week', size: 'lg', onClick: () => router.push(href('/automation')) }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link href={href('/automation')}>
          <AppButton size="md">
            <Plus aria-hidden className="h-4 w-4" /> New campaign
          </AppButton>
        </Link>
      </div>

      <ul className="flex flex-col gap-2.5">
        {campaigns.map((c) => (
          <li key={c.id}>
            <Link
              href={`${href('/automation')}?id=${c.id}`}
              className="flex items-start justify-between gap-3 rounded-2xl border border-app-line bg-app-surface p-4 transition-colors duration-200 hover:border-app-ink/40"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-[15px] font-medium text-app-ink">{GOAL_LABELS[c.goal] ?? c.goal}</span>
                <span className="text-[12px] text-app-muted">
                  {c.postCount > 0 ? `${c.postCount} posts · ` : ''}
                  {c.channels.join(' + ')} · from {c.startDate}
                </span>
              </div>
              <span className="flex shrink-0 items-center gap-2">
                {c.status === 'scheduled' && <CalendarDays aria-hidden className="h-4 w-4 text-app-muted" />}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[c.status] ?? 'bg-app-sunken text-app-muted'}`}>
                  {c.status}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
