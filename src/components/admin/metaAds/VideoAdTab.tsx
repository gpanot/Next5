'use client';

import { useMemo, useState } from 'react';
import { isTerminalStatus, VIDEO_DURATIONS, type MetaAdDto, type MetaAdRunDto, type VideoDuration } from '../../../types/admin/metaAds';
import { adminFetch } from '../business/useAdminApi';
import { useAdVideos } from './useAdVideos';
import { VersionTabs } from './VersionTabs';
import { VersionView } from './VersionView';
import { groupVersions } from './videoVersions';

type Props = { token: string; run: MetaAdRunDto; ad: MetaAdDto; onChanged: () => void };

export function VideoAdTab({ token, run, ad, onChanged }: Props) {
  const [duration, setDuration] = useState<VideoDuration>(10);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { videos, error, refresh, isWorking } = useAdVideos(token, run.id, ad.id, onChanged);
  const versions = useMemo(() => groupVersions(videos ?? []), [videos]);
  const selected = versions.find((v) => v.id === selectedId) ?? versions.at(-1) ?? null;
  const busy = starting || (videos ?? []).some(isWorking);

  const start = async (body: { duration: VideoDuration } | { variationOf: string }) => {
    setStarting(true);
    setStartError(null);
    try {
      await adminFetch(token, `/api/admin/meta-ads/runs/${run.id}/ads/${ad.id}/videos`, { method: 'POST', body: JSON.stringify(body) });
      // A new version opens its own tab; a variation stays on the current one.
      if (!('variationOf' in body)) setSelectedId(null);
      refresh();
    } catch (err) {
      setStartError(err instanceof Error ? err.message : 'Could not start the video');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Video length"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value) as VideoDuration)}
          disabled={busy}
          className="min-h-11 rounded-full border border-line bg-white px-4 text-sm font-medium text-ink dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {VIDEO_DURATIONS.map((d) => <option key={d} value={d}>{d} sec</option>)}
        </select>
        <button
          onClick={() => void start({ duration })}
          disabled={busy || !isTerminalStatus(run.status)}
          className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? 'Making the video…' : versions.length ? '↻ Generate another video ad' : 'Generate video ad'}
        </button>
        <span className="text-xs text-muted">Hormozi script → UGC avatar → Wan 3.0, 9:16 480p</span>
      </div>
      {(startError || error) && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">{startError ?? error}</p>}

      {videos === null ? (
        <div className="flex gap-4">
          <div className="aspect-[9/16] w-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="aspect-[9/16] w-56 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
      ) : !selected ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted dark:border-zinc-700">
          No video yet. Pick a length and generate a UGC video version of this ad.
        </p>
      ) : (
        <>
          <VersionTabs versions={versions} selectedId={selected.id} onSelect={setSelectedId} isWorking={(v) => v.videos.some(isWorking)} />
          <VersionView
            key={selected.id}
            version={selected}
            isWorking={isWorking}
            onVariation={busy || !isTerminalStatus(run.status) ? null : () => void start({ variationOf: selected.id })}
          />
        </>
      )}
    </div>
  );
}
