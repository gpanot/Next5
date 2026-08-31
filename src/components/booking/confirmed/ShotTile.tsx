'use client';

import { DownloadIcon, PhotoIcon, RefreshCwIcon } from '../../ui/Icons';

type ShotTileProps = {
  sceneLabel: string;
  index: number;
  url: string | null;
  layoutClassName: string;
  onOpen: () => void;
  onDownload: () => void;
  onRegenerate?: () => void;
};

/** One frame in the studio mosaic: a finished photo (open + download), or a
 *  plain "photo coming" placeholder while it's still being crafted. A
 *  blurred stock photo here used to imply "roughly what you'll get" — a
 *  neutral placeholder doesn't set that expectation, and one consistent tile
 *  reads calmer than five different blurred scenes. */
export const ShotTile = ({
  sceneLabel,
  index,
  url,
  layoutClassName,
  onOpen,
  onDownload,
  onRegenerate,
}: ShotTileProps) => {
  const ready = url !== null;

  return (
    <div className={`group relative overflow-hidden rounded-xl ${layoutClassName}`}>
      <button
        type="button"
        onClick={onOpen}
        disabled={!ready}
        aria-label={ready ? `View ${sceneLabel} full screen` : `${sceneLabel} — still being crafted`}
        className="absolute inset-0 h-full w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default"
      >
        {ready ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={sceneLabel}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#3a322b_0%,#282220_45%,#1d1815_100%)]">
            <PhotoIcon className="h-6 w-6 text-[#a2917f]/70" />
          </div>
        )}
      </button>

      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />

      <span className="pointer-events-none absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 font-serif text-[10px] text-ink">
        {String(index + 1).padStart(2, '0')}
      </span>

      {ready ? (
        <button
          type="button"
          onClick={onDownload}
          aria-label={`Download ${sceneLabel}`}
          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink transition-colors duration-300 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
        </button>
      ) : (
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 py-1.5 text-[9.5px] font-medium text-white/85">
          <span className="animate-pulse">Creating…</span>
        </span>
      )}

      {ready && onRegenerate && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
          aria-label={`Regenerate ${sceneLabel}`}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70 whitespace-nowrap"
        >
          <RefreshCwIcon className="h-2.5 w-2.5" />
          Regenerate
        </button>
      )}

      <span className="sr-only">{ready ? `${sceneLabel}, ready` : `${sceneLabel}, still being crafted`}</span>
    </div>
  );
};
