'use client';

import { useState } from 'react';
import type { UgcVideoDto } from '../../../../types/admin/ugc';
import { errorOf, ugcRequest } from './api';
import { EmptyState, ErrorLine, MediaGridSkeleton, PrimaryButton, Section, Spinner } from './ui';
import { VideoCard } from './VideoCard';
import { useUgcVideos } from './useUgcVideos';

/** Where the first version of the lab kept videos, in this browser only. */
const LEGACY_LIBRARY_KEY = 'ugc_lab_videos';

type LegacyRun = { taskId?: unknown; hook?: unknown; estimatedCostUsd?: unknown; createdAt?: unknown };

const readLegacyRuns = (): LegacyRun[] => {
  try {
    const raw = window.localStorage.getItem(LEGACY_LIBRARY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as LegacyRun[]) : [];
  } catch {
    return [];
  }
};

const LegacyImport = ({ token, onImported }: { token: string; onImported: (videos: UgcVideoDto[]) => void }) => {
  const [runs, setRuns] = useState<LegacyRun[]>(readLegacyRuns);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  if (runs.length === 0) return null;

  async function runImport() {
    setImporting(true);
    setError('');
    const res = await ugcRequest<{ videos?: UgcVideoDto[] }>(token, '/api/admin/ugc-lab/videos/import', { json: { items: runs } })
      .catch(() => null);
    setImporting(false);
    if (!res?.ok || !res.data.videos) {
      setError(res ? errorOf(res) : 'Import failed');
      return;
    }
    onImported(res.data.videos);
    try {
      window.localStorage.removeItem(LEGACY_LIBRARY_KEY);
    } catch {
      // The import worked; a leftover browser copy is harmless.
    }
    setRuns([]);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-amber-50 p-4 text-[13px] text-amber-800 sm:flex-row sm:items-center sm:justify-between">
      <p>
        {runs.length} video{runs.length === 1 ? '' : 's'} from the old library live only in this browser.
        Import them to keep them. Videos older than 7 days can no longer be downloaded from Seedance.
      </p>
      <PrimaryButton onClick={() => void runImport()} disabled={importing}>
        {importing ? <><Spinner /> Importing…</> : 'Import'}
      </PrimaryButton>
      {error && <p className="text-red-700">{error}</p>}
    </div>
  );
};

export function LibraryPanel({ token }: { token: string }) {
  const { videos, etas, error, loading, reload, update, remove, addMany } = useUgcVideos(token);
  const cost = videos.reduce((sum, v) => sum + (v.status === 'failed' ? 0 : v.costUsd ?? v.estimatedCostUsd), 0);

  return (
    <Section
      title="Library"
      description={loading ? 'Loading videos…' : `${videos.length} video${videos.length === 1 ? '' : 's'} · about $${cost.toFixed(2)} spent`}
    >
      <LegacyImport token={token} onImported={addMany} />
      {loading && <MediaGridSkeleton />}
      {error && <ErrorLine message={error} onRetry={reload} />}
      {!loading && !error && videos.length === 0 && (
        <EmptyState title="No videos yet." hint="Videos you generate are saved here and stay available." />
      )}
      {videos.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => <VideoCard key={v.id} token={token} video={v} eta={etas[v.durationSec]} onChange={update} onDelete={remove} />)}
        </div>
      )}
    </Section>
  );
}
