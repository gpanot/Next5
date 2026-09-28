'use client';

import type { MetaAdVideoDto } from '../../../types/admin/metaAds';
import { VideoDetails } from './VideoDetails';
import type { VideoVersion } from './videoVersions';

type Props = {
  version: VideoVersion;
  isWorking: (video: MetaAdVideoDto) => boolean;
  /** Null while another video of this ad is being made. */
  onVariation: (() => void) | null;
};

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

const FRAME = 'aspect-[9/16] overflow-hidden rounded-xl border border-line dark:border-zinc-800';

function AvatarCard({ url }: { url: string | null }) {
  return (
    <figure className="w-32 shrink-0 sm:w-40">
      <div className={`${FRAME} bg-zinc-100 dark:bg-zinc-800`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="UGC avatar" className="h-full w-full object-cover" /> : <div className="h-full w-full animate-pulse" />}
      </div>
      <figcaption className="mt-1 text-[11px] text-muted">UGC avatar</figcaption>
    </figure>
  );
}

function VideoCard({ video, label }: { video: MetaAdVideoDto; label: string }) {
  return (
    <figure className="w-48 shrink-0 sm:w-56">
      <div className={`${FRAME} bg-black`}>
        {video.videoUrl ? (
          <video src={video.videoUrl} poster={video.avatarUrl ?? undefined} controls playsInline loop preload="metadata" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-zinc-400">
            {video.status === 'failed' ? video.error ?? 'No video' : 'Filming…'}
          </div>
        )}
      </div>
      <figcaption className="mt-1 text-[11px] text-muted">
        {label} · {video.duration} s · 9:16 · 480p
      </figcaption>
    </figure>
  );
}

/** Empty card after the videos: films the same avatar and script again for a different take. */
function VariationCard({ onClick }: { onClick: (() => void) | null }) {
  return (
    <button
      onClick={onClick ?? undefined}
      disabled={!onClick}
      className="flex aspect-[9/16] w-48 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-4 text-center text-muted transition hover:border-ink hover:text-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted sm:w-56 dark:border-zinc-700 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-current text-xl leading-none">+</span>
      <span className="text-sm font-semibold">Create a variation</span>
      <span className="text-[11px]">Same avatar, script and length</span>
    </button>
  );
}

/** One version: avatar, its videos side by side, the variation card, then the shared script and prompts. */
export function VersionView({ version, isWorking, onVariation }: Props) {
  const working = version.videos.find(isWorking);
  const reusable = Boolean(version.first.script && version.first.avatarUrl);
  return (
    <section className="space-y-4">
      {working && <Progress video={working} />}
      {version.first.status === 'failed' && !version.first.avatarUrl && (
        <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">{version.first.error ?? 'The video failed.'}</p>
      )}
      <div className="flex flex-wrap items-start gap-4">
        <AvatarCard url={version.first.avatarUrl} />
        {version.videos.map((v, i) => <VideoCard key={v.id} video={v} label={i === 0 ? 'Video ad' : `Variation ${i}`} />)}
        {reusable && <VariationCard onClick={onVariation} />}
      </div>
      <VideoDetails video={version.first} />
    </section>
  );
}
