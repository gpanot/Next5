'use client';

import { useEffect, useState } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import { downloadAllAsZip, downloadFile } from '../../../lib/download';
import type { CreativeDirector } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { DownloadIcon, RefreshCwIcon } from '../../ui/Icons';
import { ImageLightbox } from '../../ui/ImageLightbox';
import { ClosingNote } from './ClosingNote';
import { ShotTile } from './ShotTile';

const REGEN_LIMIT = 2;
const REGEN_WINDOW_MS = 24 * 60 * 60 * 1000;

type StudioRevealProps = {
  route: PhotoRoute;
  bookingId: string;
  /** Index 0 = shot 1 (the preview) … index 4 = shot 5. `null` = still generating. */
  shotUrls: readonly (string | null)[];
  director: CreativeDirector;
  /** How many times the player has already regenerated this shoot. */
  regenerateCount?: number;
  /** ISO timestamp of when the booking was created — used to enforce the 24h window. */
  bookingCreatedAt?: string;
  /** Called when the player requests a regeneration. */
  onRegenerate?: () => Promise<void>;
};

/** Same wide-lead mosaic used by `StudioGallery` — one visual language for
 *  "a set of studio photos" everywhere on the site. Purely about the
 *  photos — the collection upsell lives on the "create another shooting"
 *  screen now, not here (see `CollectionOffers`), so this never repeats it.
 *  Regeneration: players may request up to 2 full-set regenerations within 24 h. */
const frameLayout = [
  'col-span-2 aspect-[16/10] sm:aspect-[2/1] lg:col-span-2 lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
  'aspect-[3/4] lg:row-span-2 lg:aspect-auto',
];

const shotFilename = (route: PhotoRoute, index: number) => `next5-${route.id}-shot-${String(index + 1).padStart(2, '0')}.jpg`;

export const StudioReveal = ({
  route,
  bookingId,
  shotUrls,
  director,
  regenerateCount = 0,
  bookingCreatedAt,
  onRegenerate,
}: StudioRevealProps) => {
  const [zoomed, setZoomed] = useState<number | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  // Re-checked on a timer so a tab left open across the 24h boundary flips
  // to "closed" on its own, instead of staying stuck on stale eligibility
  // until the next manual refresh.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!bookingCreatedAt) return;
    const msUntilExpiry = new Date(bookingCreatedAt).getTime() + REGEN_WINDOW_MS - now;
    if (msUntilExpiry <= 0) return;
    const timeout = setTimeout(() => setNow(Date.now()), Math.min(msUntilExpiry + 1000, 60_000));
    return () => clearTimeout(timeout);
  }, [bookingCreatedAt, now]);

  const regenRemaining = Math.max(0, REGEN_LIMIT - regenerateCount);
  const withinWindow = bookingCreatedAt
    ? now - new Date(bookingCreatedAt).getTime() < REGEN_WINDOW_MS
    : false;
  const canRegenerate = regenRemaining > 0 && withinWindow && !!onRegenerate;

  const handleRegenerate = async () => {
    if (!onRegenerate || isRegenerating) return;
    setRegenError(null);
    setIsRegenerating(true);
    try {
      await onRegenerate();
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const readyCount = shotUrls.filter((url) => url !== null).length;
  const allReady = readyCount === route.shots.length;
  const zoomedUrl = zoomed !== null ? shotUrls[zoomed] : null;

  const handleDownloadAll = async () => {
    setIsZipping(true);
    const files = route.shots.map((_, index) => ({
      url: shotUrls[index] as string,
      filename: shotFilename(route, index),
    }));
    await downloadAllAsZip(files, `next5-${route.id}-${bookingId}.zip`);
    setIsZipping(false);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="label-caps text-[9px] font-medium text-muted">Your studio</p>
        <p className="text-[11.5px] text-muted" aria-live="polite">
          {readyCount} of {route.shots.length} ready
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-2.5 lg:auto-rows-[104px] lg:grid-cols-3">
        {route.shots.map((shot, index) => (
          <ShotTile
            key={shot.src}
            sceneLabel={route.scenes[index]}
            index={index}
            url={shotUrls[index]}
            layoutClassName={frameLayout[index]}
            onOpen={() => setZoomed(index)}
            onDownload={() => downloadFile(shotUrls[index] as string, shotFilename(route, index))}
          />
        ))}
      </div>

      <Button
        onClick={handleDownloadAll}
        disabled={!allReady || isZipping}
        variant="dark"
        size="md"
        fullWidth
        className="mt-4"
      >
        <DownloadIcon className="h-3.5 w-3.5" />
        {isZipping ? 'Preparing your download…' : 'Download all 5 photos'}
      </Button>

      {/* Regenerate section */}
      {!!bookingCreatedAt && (
        <div className="mt-5 rounded-xl border border-line bg-surface px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-ink">Not happy with a result?</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">
                {regenRemaining <= 0
                  ? "You've used both regenerations for this shoot."
                  : withinWindow
                    ? `You can regenerate your full set — ${regenRemaining} of ${REGEN_LIMIT} regeneration${regenRemaining === 1 ? '' : 's'} remaining.`
                    : 'Your 24-hour regeneration window has closed.'}
              </p>
              {regenError && (
                <p className="mt-1.5 text-[11px] text-red-600">{regenError}</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleRegenerate}
              disabled={!canRegenerate || isRegenerating}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-4 py-1.5 text-[11.5px] font-medium text-ink shadow-sm transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCwIcon className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Regenerating…' : 'Regenerate'}
            </button>
          </div>

          <p className="mt-3 text-[10.5px] text-muted/75">
            Up to {REGEN_LIMIT} regenerations per shoot · Available within 24 hours of your session
          </p>
        </div>
      )}

      <div className="mt-6">
        <ClosingNote director={director} />
      </div>

      {zoomedUrl && (
        <ImageLightbox
          src={zoomedUrl}
          alt={route.scenes[zoomed as number]}
          onClose={() => setZoomed(null)}
        />
      )}
    </div>
  );
};
