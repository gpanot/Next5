'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CampaignSummaryDto } from '../../../../types/admin/slideshowCampaign';
import { useAdminApi } from '../../business/useAdminApi';
import { CampaignCollection, CampaignTilesSkeleton } from '../campaigns/CampaignTiles';
import { CampaignRowsSkeleton } from '../campaigns/CampaignRow';
import { FilterSelect, useListView, ViewToggle, type ListFilter } from '../campaigns/ListControls';

const errorClass = 'rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300';

/** Library › Hooks Volume: the workspace's campaigns. A tap opens one in the campaign editor, on the Campaigns page. */
export function CampaignsList({ token, workspaceId }: { token: string; workspaceId: string }) {
  const list = useAdminApi<{ campaigns: CampaignSummaryDto[] }>(token, `/api/slideshow/campaigns?workspace=${workspaceId}`);
  const router = useRouter();
  const [filter, setFilter] = useState<ListFilter>('all');
  const [view, setView] = useListView('hooks');
  const campaigns = list.data?.campaigns;
  const base = `/slideshow/${workspaceId}/campaigns`;
  return (
    <section className="space-y-4">
      <div className="flex min-h-11 items-center gap-2">
        <h2 className="mr-auto font-heading text-xl font-normal text-app-ink">Hooks Volume</h2>
        {campaigns && campaigns.length > 0 && (
          <>
            <FilterSelect value={filter} onChange={setFilter} />
            <ViewToggle value={view} onChange={setView} />
          </>
        )}
      </div>
      {list.error ? (
        <p className={errorClass}>{list.error}</p>
      ) : !campaigns ? (
        (view === 'list' ? <CampaignRowsSkeleton /> : <CampaignTilesSkeleton />)
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-app-line p-8 text-center">
          <p className="text-base font-semibold text-app-ink">No Hooks Volume campaigns yet</p>
          <p className="mt-1 text-sm text-app-muted">Make your first one in Campaigns.</p>
          <Link href={base} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95">
            Open Campaigns
          </Link>
        </div>
      ) : (
        <CampaignCollection campaigns={campaigns} calendarOnly={filter === 'calendar'} view={view} onOpen={(id) => router.push(`${base}?campaign=${id}`)} />
      )}
    </section>
  );
}
