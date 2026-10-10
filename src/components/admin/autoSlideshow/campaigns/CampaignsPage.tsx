'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { CampaignSummaryDto } from '../../../../types/admin/slideshowCampaign';
import { adminFetch, useAdminApi } from '../../business/useAdminApi';
import { CampaignEditor } from './CampaignEditor';

type Props = { token: string; workspaceId: string };

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const statusOf = (c: CampaignSummaryDto): string => {
  if (c.scheduledCount > 0) return `${c.scheduledCount} scheduled`;
  if (c.slideshowCount > 0) return `${c.slideshowCount} slideshows ready`;
  return c.hookCount > 0 ? `Draft · ${c.hookCount} ${c.hookCount === 1 ? 'hook' : 'hooks'}` : 'Draft';
};

function ListSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-busy="true" aria-label="Loading campaigns">
      {Array.from({ length: 5 }, (_, i) => <div key={i} className="aspect-[9/16] animate-pulse rounded-xl bg-app-sunken" />)}
    </div>
  );
}

function CampaignTile({ c, onOpen }: { c: CampaignSummaryDto; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="group block w-full text-left transition active:scale-[0.98]">
        <span className="relative block aspect-[9/16] overflow-hidden rounded-xl border border-app-line bg-app-sunken shadow-sm transition group-hover:shadow-md">
          {c.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          )}
          {!c.coverUrl && <span className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-app-muted">No photos yet</span>}
        </span>
        <span className="mt-2 block truncate text-sm font-semibold text-app-ink">{c.name}</span>
        <span className="block truncate text-xs text-app-muted">{statusOf(c)} · {when(c.updatedAt)}</span>
      </button>
    </li>
  );
}

function Empty({ onCreate, busy }: { onCreate: () => void; busy: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-app-line p-8 text-center">
      <p className="text-base font-semibold text-app-ink">No campaigns yet</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-app-muted">Write a few hooks, pick photos once, and get one slideshow per hook, ready to post.</p>
      <button type="button" onClick={onCreate} disabled={busy} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95 disabled:opacity-50">
        {busy ? 'Creating…' : 'New campaign'}
      </button>
    </div>
  );
}

/**
 * One workspace's slideshow campaigns. "New campaign" opens an empty one in the campaign editor (`?campaign=` keeps it
 * open on reload and gives Back its way out).
 */
export function CampaignsPage({ token, workspaceId }: Props) {
  const list = useAdminApi<{ campaigns: CampaignSummaryDto[] }>(token, `/api/slideshow/campaigns?workspace=${workspaceId}`);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const openId = useSearchParams().get('campaign');

  const open = (id: string | null) => router.push(id ? `${pathname}?campaign=${id}` : pathname, { scroll: false });

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const { id } = await adminFetch<{ id: string }>(token, `/api/slideshow/campaigns?workspace=${workspaceId}`, { method: 'POST', body: '{}' });
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-3xl font-normal text-app-ink">Campaigns</h1>
        {campaigns && campaigns.length > 0 && (
          <button type="button" onClick={() => void create()} disabled={creating} className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full bg-app-cta px-4 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95 disabled:opacity-50">
            <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4v12M4 10h12" /></svg>
            {creating ? 'Creating…' : 'New campaign'}
          </button>
        )}
      </div>
      {(error ?? list.error) && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error ?? list.error}</p>}
      {!campaigns ? (
        !list.error && <ListSkeleton />
      ) : campaigns.length === 0 ? (
        <Empty onCreate={() => void create()} busy={creating} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {campaigns.map((c) => <CampaignTile key={c.id} c={c} onOpen={() => open(c.id)} />)}
        </ul>
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
