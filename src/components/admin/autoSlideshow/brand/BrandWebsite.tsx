'use client';

import type { AutoRunDto, AutoRunSummary } from '../../../../types/admin/autoSlideshow';
import { useAdminApi } from '../../business/useAdminApi';
import { BrandCard } from '../../shared/BrandCard';

const errorClass = 'rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300';

/** What we read from the website: the latest run's brand card (name, colors, audience, slideshow look). */
export function BrandWebsite({ token, workspaceId }: { token: string; workspaceId: string }) {
  const runs = useAdminApi<{ runs: AutoRunSummary[] }>(token, `/api/admin/auto-slideshow/runs?workspace=${workspaceId}`);
  const latestId = runs.data?.runs[0]?.id ?? null;
  const run = useAdminApi<{ run: AutoRunDto }>(token, latestId ? `/api/admin/auto-slideshow/runs/${latestId}` : null);

  const error = runs.error ?? run.error;
  if (error) {
    return (
      <div className={`${errorClass} flex flex-wrap items-center gap-3`}>
        <p className="flex-1">{error}</p>
        <button type="button" onClick={runs.error ? runs.refresh : run.refresh} className="min-h-11 rounded-full bg-red-600 px-5 font-semibold text-white transition active:scale-95">Try again</button>
      </div>
    );
  }
  if (runs.data && !latestId) {
    return <p className="rounded-xl border border-dashed border-app-line p-6 text-center text-sm text-app-muted">Add your website on the Calendar. We read your brand from it.</p>;
  }
  if (!run.data) return <div aria-busy="true" aria-label="Loading your brand" className="h-96 animate-pulse rounded-xl bg-app-sunken" />;
  return <BrandCard url={run.data.run.url} profile={run.data.run.profile} />;
}
