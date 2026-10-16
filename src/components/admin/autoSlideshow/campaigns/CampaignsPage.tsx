'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { AutoRunSummary } from '../../../../types/admin/autoSlideshow';
import type { CampaignSummaryDto } from '../../../../types/admin/slideshowCampaign';
import { adminFetch, useAdminApi } from '../../business/useAdminApi';
import { SlideshowsTab } from '../content/SlideshowsTab';
import { CampaignEditor } from './CampaignEditor';
import { NewCampaignSheet } from './NewCampaignSheet';
import { CampaignCollection, CampaignTilesSkeleton } from './CampaignTiles';
import { FilterSelect, useListView, ViewToggle, type ListFilter } from './ListControls';

type Props = { token: string; workspaceId: string };

type Tab = 'hooks' | 'brand';

const TABS: { id: Tab; label: string }[] = [
  { id: 'hooks', label: 'Hooks Volume' },
  { id: 'brand', label: 'Brand Cast' },
];

const tabClass = (active: boolean) =>
  [
    'flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium transition active:scale-95',
    active ? 'bg-app-cta text-app-cta-ink shadow-sm' : 'border border-app-line bg-app-panel text-app-muted hover:text-app-ink',
  ].join(' ');

const EMPTY: Record<Tab, { title: string; text: string }> = {
  hooks: { title: 'No Hooks Volume campaigns yet', text: 'Write a few hooks, pick photos once, and get one slideshow per hook, ready to post.' },
  brand: { title: 'No Brand Cast slideshows yet', text: 'We write 1 to 5 slideshows for you, with your brand faces. 1 credit each.' },
};

function Empty({ tab, onCreate }: { tab: Tab; onCreate: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-app-line p-8 text-center">
      <p className="text-base font-semibold text-app-ink">{EMPTY[tab].title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-app-muted">{EMPTY[tab].text}</p>
      <button type="button" onClick={onCreate} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95">
        New campaign
      </button>
    </div>
  );
}

/**
 * One workspace's campaigns, the only place slideshows are made, in two tabs: Hooks Volume and Brand Cast. One toolbar
 * (All / On calendar, cards / list) serves both. "New campaign" asks which kind: Brand Cast (1-5 slideshows from the
 * Auto Slideshow engine) or Hooks Volume (an empty campaign opened in the campaign editor; `?campaign=` keeps it open on
 * reload and gives Back its way out).
 */
export function CampaignsPage({ token, workspaceId }: Props) {
  const list = useAdminApi<{ campaigns: CampaignSummaryDto[] }>(token, `/api/slideshow/campaigns?workspace=${workspaceId}`);
  const runs = useAdminApi<{ runs: AutoRunSummary[] }>(token, `/api/admin/auto-slideshow/runs?workspace=${workspaceId}`);
  const [choosing, setChoosing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Bumped after Brand Cast slideshows were asked for: the Brand Cast section polls its latest run again. */
  const [brandReload, setBrandReload] = useState(0);
  const [tab, setTab] = useState<Tab>('hooks');
  const [filter, setFilter] = useState<ListFilter>('all');
  const [view, setView] = useListView();
  const router = useRouter();
  const pathname = usePathname();
  const openId = useSearchParams().get('campaign');

  const open = (id: string | null) => router.push(id ? `${pathname}?campaign=${id}` : pathname, { scroll: false });

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const { id } = await adminFetch<{ id: string }>(token, `/api/slideshow/campaigns?workspace=${workspaceId}`, { method: 'POST', body: '{}' });
      setChoosing(false);
      open(id);
      list.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create a campaign');
    } finally {
      setCreating(false);
    }
  };

  const campaigns = list.data?.campaigns;
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-3xl font-normal text-app-ink">Campaigns</h1>
        <button type="button" onClick={() => setChoosing(true)} className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full bg-app-cta px-4 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95">
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4v12M4 10h12" /></svg>
          New campaign
        </button>
      </div>
      {(error ?? list.error) && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error ?? list.error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Campaign kind" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={tabClass(tab === t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 pb-1">
          <FilterSelect value={filter} onChange={setFilter} />
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>
      {/* Both stay mounted: switching tabs keeps what each one loaded. */}
      <div role="tabpanel" hidden={tab !== 'hooks'}>
        {!campaigns ? (
          !list.error && <CampaignTilesSkeleton />
        ) : campaigns.length === 0 ? (
          <Empty tab="hooks" onCreate={() => setChoosing(true)} />
        ) : (
          <CampaignCollection campaigns={campaigns} calendarOnly={filter === 'calendar'} view={view} onOpen={open} />
        )}
      </div>
      <div role="tabpanel" hidden={tab !== 'brand'}>
        <SlideshowsTab token={token} workspaceId={workspaceId} filter={filter} view={view} reloadKey={brandReload} empty={<Empty tab="brand" onCreate={() => setChoosing(true)} />} />
      </div>
      {choosing && (
        <NewCampaignSheet
          token={token}
          workspaceId={workspaceId}
          brandRunId={runs.data ? (runs.data.runs[0]?.id ?? null) : undefined}
          creatingHooks={creating}
          onHooksVolume={() => void create()}
          onBrandCastCreated={() => {
            setChoosing(false);
            setTab('brand');
            setBrandReload((n) => n + 1);
          }}
          onClose={() => setChoosing(false)}
        />
      )}
      {openId && (
        <CampaignEditor
          key={openId}
          token={token}
          workspaceId={workspaceId}
          campaignId={openId}
          onClose={() => {
            open(null);
            list.refresh();
          }}
        />
      )}
    </div>
  );
}
