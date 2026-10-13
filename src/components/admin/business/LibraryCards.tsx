'use client';

/** Asset preview cards of the Assets Library (Memes, Videos, Sounds, UGC Videos, Hook Videos). */

import { useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import type { BlitzAssetDto } from '../../labs/blitzLab/api';
import type { UgcVideoDto } from '../../../types/admin/ugc';
import { DescriptionPanel } from './AssetDescriptionPanel';

/** Video asset card (Memes + Videos) — plays on hover, click to toggle mute + "See Description" expand. */
export function VideoCard({ asset, token }: { asset: BlitzAssetDto; token: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ref.current) return;
    const next = !ref.current.muted;
    ref.current.muted = next;
    setMuted(next);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div
        className="relative aspect-[9/16] w-full overflow-hidden bg-neutral-900"
        onMouseEnter={() => ref.current?.play().catch(() => undefined)}
        onMouseLeave={() => {
          if (ref.current) {
            ref.current.pause();
            ref.current.currentTime = 0;
            ref.current.muted = true;
            setMuted(true);
          }
        }}
      >
        <video
          ref={ref}
          src={asset.url}
          poster={asset.thumbnailUrl ?? undefined}
          muted
          loop
          playsInline
          preload="none"
          className="h-full w-full object-contain"
        />
        {/* Mute/unmute button — always visible */}
        <button
          type="button"
          onClick={toggleMute}
          className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted
            ? <VolumeX className="h-3 w-3" />
            : <Volume2 className="h-3 w-3" />
          }
        </button>
      </div>
      <div className="min-h-8 px-2 py-1.5">
        <p className="truncate text-[11px] text-ink" title={asset.name}>{asset.name}</p>
      </div>
      <DescriptionPanel token={token} assetId={asset.id} />
    </div>
  );
}

/** Audio track card — play/pause on click + "See Description" expand. */
export function AudioCard({ asset, token }: { asset: BlitzAssetDto; token: string }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      void el.play().then(() => setPlaying(true));
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <button
        type="button"
        onClick={toggle}
        className="flex flex-col items-center justify-center gap-2.5 p-3 transition-colors hover:bg-orange-50"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          {playing
            ? <Pause className="h-5 w-5" />
            : <Play className="h-5 w-5 translate-x-0.5" />
          }
        </div>
        <p className="w-full truncate text-center text-[11px] font-medium text-ink" title={asset.name}>
          {asset.name}
        </p>
        <audio ref={ref} src={asset.url} preload="none" loop onEnded={() => setPlaying(false)} />
      </button>
      <DescriptionPanel token={token} assetId={asset.id} />
    </div>
  );
}

/** UGC video card — plays on hover. No description panel (separate pipeline). */
export function UgcCard({ video }: { video: UgcVideoDto }) {
  const ref = useRef<HTMLVideoElement>(null);
  const src = video.captionedUrl ?? video.videoUrl ?? undefined;
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div
        className="relative aspect-[9/16] w-full overflow-hidden bg-neutral-900"
        onMouseEnter={() => ref.current?.play().catch(() => undefined)}
        onMouseLeave={() => { if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; } }}
      >
        {src ? (
          <video
            ref={ref}
            src={src}
            muted
            loop
            playsInline
            preload="none"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-muted">No preview</div>
        )}
        <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
          {video.mode}
        </span>
      </div>
      <div className="min-h-10 px-2 py-1.5">
        <p className="line-clamp-2 text-[11px] text-ink">{video.script || '(no script)'}</p>
      </div>
    </div>
  );
}

/** Hook video card — plays on hover, shows tags as pills + "See Description" expand. */
export function HookCard({ asset, token }: { asset: BlitzAssetDto; token: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div
        className="relative aspect-[9/16] w-full overflow-hidden bg-neutral-900"
        onMouseEnter={() => ref.current?.play().catch(() => undefined)}
        onMouseLeave={() => { if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; } }}
      >
        {asset.thumbnailUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={asset.thumbnailUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        )}
        <video
          ref={ref}
          src={asset.url}
          muted
          loop
          playsInline
          preload="none"
          className="relative h-full w-full object-cover"
        />
        {/* source badge */}
        {asset.source === 'hook_library' && (
          <span className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-orange-500/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">
            lib
          </span>
        )}
      </div>
      <div className="px-2 pt-1.5 pb-1">
        <p className="truncate text-[11px] font-medium text-ink" title={asset.name}>{asset.name}</p>
      </div>
      {/* Tag pills */}
      {asset.tags && asset.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 pb-2">
          {asset.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-surface-alt px-1.5 py-0.5 text-[9px] text-muted">
              {tag}
            </span>
          ))}
        </div>
      )}
      <DescriptionPanel token={token} assetId={asset.id} />
    </div>
  );
}
