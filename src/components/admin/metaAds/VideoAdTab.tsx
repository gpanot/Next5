'use client';

import { useState } from 'react';
import { formatUsd, isTerminalStatus, VIDEO_DURATIONS, type MetaAdDto, type MetaAdRunDto, type MetaAdVideoDto, type VideoDuration } from '../../../types/admin/metaAds';
import { adminFetch } from '../business/useAdminApi';
import { useAdVideos } from './useAdVideos';
import { VideoDetails } from './VideoDetails';

type Props = { token: string; run: MetaAdRunDto; ad: MetaAdDto; onChanged: () => void };

/** Script + avatar (GPT Image 2.5, $0.023) + Wan 3.0 480P ($0.036 per second). Shown before the click. */
const estimate = (duration: number) => 3_000 + 23_000 + 36_000 * duration;

const STEPS: { status: MetaAdVideoDto['status']; label: string }[] = [
  { status: 'scripting', label: 'Writing the script' },
  { status: 'avatar', label: 'Creating the UGC avatar' },
  { status: 'video', label: 'Filming with Wan 3.0 (1-3 min)' },
];

function Progress({ video }: { video: MetaAdVideoDto }) {
  const at = STEPS.findIndex((s) => s.status === video.status);
  return (
    <ol className="space-y-2 text-xs">
      {STEPS.map((s, i) => (
        <li key={s.status} className={['flex items-center gap-2', i <= at ? 'text-ink dark:text-zinc-100' : 'text-muted'].join(' ')}>
          {i < at ? <span className="w-3.5 text-emerald-500">✓</span> : i === at ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-ink dark:border-zinc-600 dark:border-t-zinc-100" /> : <span className="w-3.5 text-center">·</span>}
          {s.label}
        </li>
      ))}
    </ol>
  );
}

/** Avatar next to the video, both 9:16. Placeholders while they are being made. */
function Media({ video }: { video: MetaAdVideoDto }) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <figure className="w-32 shrink-0 sm:w-40">
        <div className="aspect-[9/16] overflow-hidden rounded-xl border border-line bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {video.avatarUrl ? <img src={video.avatarUrl} alt="UGC avatar" className="h-full w-full object-cover" /> : <div className="h-full w-full animate-pulse" />}
        </div>
        <figcaption className="mt-1 text-[11px] text-muted">UGC avatar</figcaption>
      </figure>
      <figure className="w-48 shrink-0 sm:w-56">
        <div className="aspect-[9/16] overflow-hidden rounded-xl border border-line bg-black dark:border-zinc-800">
          {video.videoUrl ? (
            <video src={video.videoUrl} poster={video.avatarUrl ?? undefined} controls playsInline loop preload="metadata" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-zinc-400">
              {video.status === 'failed' ? 'No video' : 'Filming…'}
            </div>
          )}
        </div>
        <figcaption className="mt-1 text-[11px] text-muted">
          Video ad · {video.duration} s · 9:16 · 480p · {formatUsd(video.costMicros)}
        </figcaption>
      </figure>
    </div>
  );
}

export function VideoAdTab({ token, run, ad, onChanged }: Props) {
  const [duration, setDuration] = useState<VideoDuration>(10);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const { videos, error, refresh, isWorking } = useAdVideos(token, run.id, ad.id, onChanged);
  const latest = videos?.[0] ?? null;
  const busy = starting || (latest ? isWorking(latest) : false);

  const generate = async () => {
    setStarting(true);
    setStartError(null);
    try {
      await adminFetch(token, `/api/admin/meta-ads/runs/${run.id}/ads/${ad.id}/videos`, { method: 'POST', body: JSON.stringify({ duration }) });
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
          onClick={() => void generate()}
          disabled={busy || !isTerminalStatus(run.status)}
          className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? 'Making the video…' : latest ? '↻ Generate another video ad' : 'Generate video ad'}
        </button>
        <span className="text-xs text-muted">≈ {formatUsd(estimate(duration))} · Hormozi script → UGC avatar → Wan 3.0, 9:16 480p</span>
      </div>
      {(startError || error) && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">{startError ?? error}</p>}

      {videos === null ? (
        <div className="flex gap-4">
          <div className="aspect-[9/16] w-40 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="aspect-[9/16] w-56 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
      ) : !latest ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted dark:border-zinc-700">
          No video yet. Pick a length and generate a UGC video version of this ad.
        </p>
      ) : (
        <section className="space-y-4">
          {isWorking(latest) && <Progress video={latest} />}
          {latest.status === 'failed' && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">{latest.error ?? 'The video failed.'}</p>}
          <Media video={latest} />
          <VideoDetails video={latest} />
        </section>
      )}

      {videos && videos.length > 1 && (
        <details className="text-xs text-muted">
          <summary className="cursor-pointer">Earlier attempts ({videos.length - 1})</summary>
          <ul className="mt-2 space-y-1">
            {videos.slice(1).map((v) => (
              <li key={v.id}>
                {new Date(v.createdAt).toLocaleString()} · {v.duration} s · {v.status} · {formatUsd(v.costMicros)}
                {v.videoUrl && <a href={v.videoUrl} target="_blank" rel="noreferrer" className="ml-2 text-blue-600 dark:text-blue-400">Open ↗</a>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
